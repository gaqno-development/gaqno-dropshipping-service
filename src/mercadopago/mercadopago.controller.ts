import {
  Controller,
  Post,
  Req,
  HttpCode,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { MercadoPagoService } from "./mercadopago.service.js";
import { OrderFlowService } from "../order-flow/order-flow.service.js";
import type { WebhookPayloadDto } from "./dto/webhook-payload.dto.js";

@Controller("webhooks/mercadopago")
export class MercadoPagoController {
  private readonly logger = new Logger(MercadoPagoController.name);

  constructor(
    private readonly mpService: MercadoPagoService,
    private readonly orderFlow: OrderFlowService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(@Req() req: Request): Promise<{ received: boolean }> {
    const body = req.body as WebhookPayloadDto;

    if (body.topic === "merchant_order") {
      return { received: true };
    }

    const xSignature = req.headers["x-signature"] as string | undefined;
    const xRequestId = req.headers["x-request-id"] as string | undefined;
    const dataId = body.data?.id ? String(body.data.id) : "";

    if (!xSignature || !xRequestId) {
      throw new UnauthorizedException("Missing signature headers");
    }

    if (!this.mpService.verifySignature(xSignature, xRequestId, dataId)) {
      throw new UnauthorizedException("Invalid signature");
    }

    const isPaymentEvent =
      body.type === "payment" || body.action?.startsWith("payment.");

    if (!isPaymentEvent || !dataId) {
      return { received: true };
    }

    try {
      await this.orderFlow.handlePaymentNotification(dataId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook ds_orders error: ${message}`);
    }

    try {
      await this.orderFlow.handleStorefrontPayment(dataId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook sf_orders error: ${message}`);
    }

    return { received: true };
  }
}
