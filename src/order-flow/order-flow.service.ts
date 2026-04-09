import { Injectable, Inject, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { MercadoPagoService } from "../mercadopago/mercadopago.service.js";
import { DatabaseService } from "../database/db.service.js";
import { orders, syncLogs } from "../database/schema.js";

export interface ProcessOrderJobData {
  readonly orderId: string;
  readonly mpPaymentId: string;
  readonly externalReference: string | null;
  readonly amount: number;
  readonly payerEmail: string | null;
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
      responsePayload: paymentInfo as Record<string, unknown>,
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
}
