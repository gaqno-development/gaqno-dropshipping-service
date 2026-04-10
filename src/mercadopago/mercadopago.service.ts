import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { createHmac } from "node:crypto";
import type { MpPaymentInfo, MpPaymentStatus } from "./dto/webhook-payload.dto.js";

export interface PixPaymentData {
  readonly mpPaymentId: string;
  readonly pixCode: string;
  readonly qrCodeBase64: string;
  readonly pixExpiresAt: Date;
}

export interface CheckoutProPreferenceData {
  readonly preferenceId: string;
  readonly initPoint: string;
}

export interface PreferenceItem {
  readonly title: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

const PIX_EXPIRY_MINUTES = 10;

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>(
      "MERCADO_PAGO_ACCESS_TOKEN",
    );
    this.webhookSecret = this.config.getOrThrow<string>(
      "MERCADO_PAGO_WEBHOOK_SECRET",
    );
  }

  private getMpConfig(): MercadoPagoConfig {
    return new MercadoPagoConfig({
      accessToken: this.accessToken,
      options: { timeout: 10_000 },
    });
  }

  private getBaseUrl(): string {
    return (
      this.config.get<string>("STOREFRONT_BASE_URL") ??
      "http://localhost:3014"
    );
  }

  private isPublicHttpsUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      const { hostname } = parsed;
      return (
        hostname !== "localhost" &&
        hostname !== "127.0.0.1" &&
        !hostname.startsWith("192.168.")
      );
    } catch {
      return false;
    }
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
    const payment = new Payment(this.getMpConfig());
    const response = await payment.get({ id: Number(mpPaymentId) });

    return {
      status: (response.status as MpPaymentStatus) ?? "pending",
      statusDetail: response.status_detail ?? null,
      externalReference: response.external_reference ?? null,
      transactionAmount: response.transaction_amount ?? null,
      payerEmail: response.payer?.email ?? null,
    };
  }

  async createPixPayment(
    orderId: string,
    totalBrl: number,
    payerEmail: string,
  ): Promise<PixPaymentData> {
    const payment = new Payment(this.getMpConfig());
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PIX_EXPIRY_MINUTES);

    const tenantName =
      this.config.get<string>("TENANT_NAME") ?? "Gaqno Shop";

    const response = await payment.create({
      body: {
        transaction_amount: totalBrl,
        payment_method_id: "pix",
        payer: { email: payerEmail },
        description: `${tenantName} - Pedido ${orderId}`,
        external_reference: orderId,
        date_of_expiration: expiresAt.toISOString(),
      },
      requestOptions: { idempotencyKey: `order-${orderId}` },
    });

    const txData = response.point_of_interaction?.transaction_data;
    if (!response.id || !txData?.qr_code || !txData?.qr_code_base64) {
      throw new Error("Resposta inválida do Mercado Pago ao gerar PIX");
    }

    return {
      mpPaymentId: String(response.id),
      pixCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      pixExpiresAt: response.date_of_expiration
        ? new Date(response.date_of_expiration)
        : expiresAt,
    };
  }

  async createCheckoutProPreference(
    orderId: string,
    items: readonly PreferenceItem[],
    payerEmail: string,
  ): Promise<CheckoutProPreferenceData> {
    const preference = new Preference(this.getMpConfig());
    const baseUrl = this.getBaseUrl();
    const isPublic = this.isPublicHttpsUrl(baseUrl);
    const tenantName =
      this.config.get<string>("TENANT_NAME") ?? "Gaqno Shop";

    if (!isPublic) {
      this.logger.warn(
        `STOREFRONT_BASE_URL="${baseUrl}" is not public HTTPS — ` +
          `back_urls and notification_url will not be set`,
      );
    }

    const notificationUrl =
      this.config.get<string>("MERCADO_PAGO_NOTIFICATION_URL") ??
      `${baseUrl}/api/webhooks/mercadopago`;

    const response = await preference.create({
      body: {
        items: items.map((item, idx) => ({
          id: `${orderId}-${idx}`,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: "BRL",
        })),
        payer: { email: payerEmail },
        external_reference: orderId,
        ...(isPublic
          ? {
              back_urls: {
                success: `${baseUrl}/pedido/${orderId}?status=approved`,
                failure: `${baseUrl}/pedido/${orderId}?status=rejected`,
                pending: `${baseUrl}/pedido/${orderId}?status=pending`,
              },
              auto_return: "approved" as const,
              notification_url: notificationUrl,
            }
          : {}),
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12,
        },
        statement_descriptor: tenantName.slice(0, 22),
        binary_mode: false,
      },
      requestOptions: { idempotencyKey: `pref-${orderId}` },
    });

    if (!response.id || !response.init_point) {
      throw new Error(
        "Resposta inválida do Mercado Pago ao criar preferência",
      );
    }

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
    };
  }

  async searchPaymentsByReference(
    externalReference: string,
  ): Promise<(MpPaymentInfo & { mpPaymentId: string }) | null> {
    const payment = new Payment(this.getMpConfig());

    const response = await payment.search({
      options: {
        criteria: "desc",
        sort: "date_created",
        external_reference: externalReference,
      },
    });

    const results = response.results ?? [];
    const approved = results.find((r) => r.status === "approved");
    const target = approved ?? results[0];
    if (!target?.id) return null;

    return {
      mpPaymentId: String(target.id),
      status: (target.status as MpPaymentStatus) ?? "pending",
      statusDetail: target.status_detail ?? null,
      externalReference: target.external_reference ?? null,
      transactionAmount: target.transaction_amount ?? null,
      payerEmail: target.payer?.email ?? null,
    };
  }
}
