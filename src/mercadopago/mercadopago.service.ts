import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createHmac } from "node:crypto";
import type { MpPaymentInfo, MpPaymentStatus } from "./dto/webhook-payload.dto.js";

@Injectable()
export class MercadoPagoService {
  private readonly accessToken: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>("MERCADO_PAGO_ACCESS_TOKEN");
    this.webhookSecret = this.config.getOrThrow<string>("MERCADO_PAGO_WEBHOOK_SECRET");
  }

  verifySignature(
    xSignature: string,
    xRequestId: string,
    dataId: string,
  ): boolean {
    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => {
        const [k, ...v] = p.trim().split("=");
        return [k, v.join("=")];
      }),
    );

    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const hmac = createHmac("sha256", this.webhookSecret)
      .update(manifest)
      .digest("hex");

    return hmac === v1;
  }

  async getPaymentStatus(mpPaymentId: string): Promise<MpPaymentInfo> {
    const mpConfig = new MercadoPagoConfig({
      accessToken: this.accessToken,
      options: { timeout: 10_000 },
    });
    const payment = new Payment(mpConfig);
    const response = await payment.get({ id: Number(mpPaymentId) });

    return {
      status: (response.status as MpPaymentStatus) ?? "pending",
      statusDetail: response.status_detail ?? null,
      externalReference: response.external_reference ?? null,
      transactionAmount: response.transaction_amount ?? null,
      payerEmail: response.payer?.email ?? null,
    };
  }
}
