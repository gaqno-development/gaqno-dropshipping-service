import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker, Job } from "bullmq";
import { eq } from "drizzle-orm";
import { ORDER_PROCESSING_QUEUE } from "./messaging.module.js";
import { AliExpressService } from "../aliexpress/aliexpress.service.js";
import { DatabaseService } from "../database/db.service.js";
import { orders, syncLogs } from "../database/schema.js";
import type { ProcessOrderJobData } from "../order-flow/order-flow.service.js";

@Injectable()
export class OrderFlowProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderFlowProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly aliExpressService: AliExpressService,
    private readonly dbService: DatabaseService,
  ) {}

  onModuleInit(): void {
    const redisUrl =
      this.config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    const parsed = new URL(redisUrl);

    this.worker = new Worker(
      ORDER_PROCESSING_QUEUE,
      async (job: Job<ProcessOrderJobData>) => this.processOrder(job),
      {
        connection: {
          host: parsed.hostname,
          port: Number(parsed.port) || 6379,
          password: parsed.password || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        concurrency: 5,
      },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Job ${job?.id} failed: ${err.message}`,
      );
    });

    this.worker.on("completed", (job) => {
      this.logger.log(`Job ${job.id} completed`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processOrder(job: Job<ProcessOrderJobData>): Promise<void> {
    const { orderId, mpPaymentId } = job.data;
    this.logger.log(`Processing order ${orderId} for payment ${mpPaymentId}`);

    try {
      const orderResult = await this.aliExpressService.createDropshippingOrder({
        productId: "placeholder",
        quantity: 1,
        skuId: "placeholder",
        shippingAddress: "placeholder",
        contactName: "placeholder",
        phoneNumber: "placeholder",
        country: "BR",
      });

      if (!orderResult.success) {
        await this.markOrderError(
          orderId,
          `AliExpress order failed: ${orderResult.errorCode} - ${orderResult.errorMessage}`,
        );
        throw new Error(
          `AliExpress order creation failed: ${orderResult.errorMessage}`,
        );
      }

      const aliOrderId = orderResult.orderIds[0] ?? "";

      await this.dbService
        .getDb()
        .update(orders)
        .set({
          aliexpressOrderId: aliOrderId,
          status: "supplier_ordered",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await this.dbService.getDb().insert(syncLogs).values({
        action: "order_create",
        referenceId: orderId,
        responsePayload: orderResult as unknown as Record<string, unknown>,
        success: "true",
      });

      await this.dbService
        .getDb()
        .update(orders)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      this.logger.log(
        `Order ${orderId} successfully placed on AliExpress: ${aliOrderId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.markOrderError(orderId, message);
      throw error;
    }
  }

  private async markOrderError(
    orderId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.dbService
      .getDb()
      .update(orders)
      .set({
        status: "supplier_error",
        errorLog: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await this.dbService.getDb().insert(syncLogs).values({
      action: "order_create",
      referenceId: orderId,
      success: "false",
      errorMessage,
    });
  }
}
