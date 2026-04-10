import { Injectable, Inject, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { MercadoPagoService } from "../mercadopago/mercadopago.service.js";
import { DatabaseService } from "../database/db.service.js";
import {
  orders,
  syncLogs,
  sfOrders,
  sfOrderItems,
  sfProducts,
  products,
} from "../database/schema.js";

export interface ProcessOrderJobData {
  readonly orderId: string;
  readonly mpPaymentId: string;
  readonly externalReference: string | null;
  readonly amount: number;
  readonly payerEmail: string | null;
  readonly sfOrderId?: string;
}

@Injectable()
export class OrderFlowService {
  private readonly logger = new Logger(OrderFlowService.name);

  constructor(
    @Inject("ORDER_QUEUE") private readonly orderQueue: Queue,
    private readonly mpService: MercadoPagoService,
    private readonly dbService: DatabaseService,
  ) {}

  async handlePaymentNotification(mpPaymentId: string): Promise<void> {
    const paymentInfo = await this.mpService.getPaymentStatus(mpPaymentId);

    await this.dbService.getDb().insert(syncLogs).values({
      action: "webhook_received",
      referenceId: mpPaymentId,
      requestPayload: { mpPaymentId },
      responsePayload: paymentInfo as unknown as Record<string, unknown>,
      success: "true",
    });

    if (paymentInfo.status !== "approved") {
      this.logger.log(
        `Payment ${mpPaymentId} status is ${paymentInfo.status}, skipping order creation`,
      );
      return;
    }

    const existing = await this.dbService
      .getDb()
      .select()
      .from(orders)
      .where(eq(orders.mpPaymentId, mpPaymentId))
      .limit(1);

    if (existing.length > 0) {
      this.logger.log(`Order already exists for payment ${mpPaymentId}`);
      return;
    }

    const [newOrder] = await this.dbService.getDb().insert(orders).values({
      mpPaymentId,
      mpExternalReference: paymentInfo.externalReference,
      customerEmail: paymentInfo.payerEmail,
      totalBrl: String(paymentInfo.transactionAmount ?? 0),
      status: "payment_confirmed",
    }).returning();

    const jobData: ProcessOrderJobData = {
      orderId: newOrder.id,
      mpPaymentId,
      externalReference: paymentInfo.externalReference,
      amount: paymentInfo.transactionAmount ?? 0,
      payerEmail: paymentInfo.payerEmail,
    };

    await this.orderQueue.add("process-order", jobData, {
      jobId: `order-${newOrder.id}`,
    });

    this.logger.log(
      `Enqueued order processing for payment ${mpPaymentId} -> order ${newOrder.id}`,
    );
  }

  async handleStorefrontPayment(mpPaymentId: string): Promise<void> {
    const paymentInfo = await this.mpService.getPaymentStatus(mpPaymentId);

    if (paymentInfo.status !== "approved") {
      if (
        paymentInfo.status === "cancelled" ||
        paymentInfo.status === "refunded"
      ) {
        await this.updateSfOrderByPayment(mpPaymentId, "cancelled");
      }
      return;
    }

    const sfOrder = await this.findSfOrderByPayment(
      mpPaymentId,
      paymentInfo.externalReference,
    );
    if (!sfOrder) return;

    if (sfOrder.status === "paid") return;

    await this.dbService
      .getDb()
      .update(sfOrders)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(eq(sfOrders.id, sfOrder.id));

    const items = await this.dbService
      .getDb()
      .select()
      .from(sfOrderItems)
      .where(eq(sfOrderItems.orderId, sfOrder.id));

    for (const item of items) {
      const [sfProduct] = await this.dbService
        .getDb()
        .select()
        .from(sfProducts)
        .where(eq(sfProducts.id, item.sfProductId))
        .limit(1);

      if (!sfProduct) continue;

      const [dsOrder] = await this.dbService
        .getDb()
        .insert(orders)
        .values({
          mpPaymentId,
          mpExternalReference: sfOrder.id,
          productId: sfProduct.dsProductId,
          customerEmail: sfOrder.customerEmail,
          totalBrl: item.subtotalBrl,
          status: "payment_confirmed",
        })
        .returning();

      const jobData: ProcessOrderJobData = {
        orderId: dsOrder.id,
        mpPaymentId,
        externalReference: sfOrder.id,
        amount: parseFloat(item.subtotalBrl),
        payerEmail: sfOrder.customerEmail,
        sfOrderId: sfOrder.id,
      };

      await this.orderQueue.add("process-order", jobData, {
        jobId: `order-${dsOrder.id}`,
      });

      this.logger.log(
        `Storefront order ${sfOrder.id} -> ds_order ${dsOrder.id} enqueued`,
      );
    }
  }

  private async findSfOrderByPayment(
    mpPaymentId: string,
    externalReference: string | null,
  ) {
    const [byMpId] = await this.dbService
      .getDb()
      .select()
      .from(sfOrders)
      .where(eq(sfOrders.mpPaymentId, mpPaymentId))
      .limit(1);

    if (byMpId) return byMpId;

    if (externalReference) {
      const [byRef] = await this.dbService
        .getDb()
        .select()
        .from(sfOrders)
        .where(eq(sfOrders.id, externalReference))
        .limit(1);
      return byRef ?? null;
    }

    return null;
  }

  private async updateSfOrderByPayment(
    mpPaymentId: string,
    status: "cancelled" | "refunded",
  ) {
    await this.dbService
      .getDb()
      .update(sfOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(sfOrders.mpPaymentId, mpPaymentId));
  }
}
