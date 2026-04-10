import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DatabaseService } from "../../database/db.service.js";
import { MercadoPagoService } from "../../mercadopago/mercadopago.service.js";
import {
  sfProducts,
  sfOrders,
  sfOrderItems,
} from "../../database/schema.js";
import type { CreateStorefrontOrderDto } from "./dto/create-order.dto.js";
import type { PreferenceItem } from "../../mercadopago/mercadopago.service.js";

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mpService: MercadoPagoService,
  ) {}

  async createOrder(dto: CreateStorefrontOrderDto) {
    const productIds = dto.items.map((i) => i.sfProductId);
    const productRows = await this.db
      .getDb()
      .select()
      .from(sfProducts)
      .where(inArray(sfProducts.id, productIds));

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.sfProductId);
      if (!product || product.status !== "published") {
        throw new BadRequestException(
          `Produto ${item.sfProductId} indisponível`,
        );
      }
    }

    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.sfProductId)!;
      const unitPrice = parseFloat(product.sellingPriceBrl);
      return {
        sfProductId: item.sfProductId,
        quantity: item.quantity,
        unitPriceBrl: String(unitPrice),
        variationLabel: item.variationLabel ?? null,
        subtotalBrl: String(unitPrice * item.quantity),
      };
    });

    const subtotal = orderItems.reduce(
      (sum, i) => sum + parseFloat(i.subtotalBrl),
      0,
    );
    const shipping = 0;
    const total = subtotal + shipping;

    const [order] = await this.db
      .getDb()
      .insert(sfOrders)
      .values({
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone ?? null,
        customerCpf: dto.customerCpf ?? null,
        shippingAddress: dto.shippingAddress ?? null,
        subtotalBrl: String(subtotal),
        shippingBrl: String(shipping),
        totalBrl: String(total),
        status: "pending",
      })
      .returning();

    await this.db
      .getDb()
      .insert(sfOrderItems)
      .values(
        orderItems.map((item) => ({
          orderId: order.id,
          ...item,
        })),
      );

    return { id: order.id, total, status: order.status };
  }

  async getOrderById(id: string) {
    const [order] = await this.db
      .getDb()
      .select()
      .from(sfOrders)
      .where(eq(sfOrders.id, id))
      .limit(1);

    if (!order) return null;

    const items = await this.db
      .getDb()
      .select()
      .from(sfOrderItems)
      .where(eq(sfOrderItems.orderId, id));

    return { ...order, items };
  }

  async initiatePayment(
    orderId: string,
    method: "pix" | "checkout_pro",
  ) {
    const [order] = await this.db
      .getDb()
      .select()
      .from(sfOrders)
      .where(eq(sfOrders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException("Pedido não encontrado");

    if (order.status !== "pending" && order.status !== "awaiting_payment") {
      throw new BadRequestException("Pedido não pode ser pago");
    }

    const totalBrl = parseFloat(order.totalBrl);

    if (method === "pix") {
      const pixData = await this.mpService.createPixPayment(
        orderId,
        totalBrl,
        order.customerEmail,
      );

      await this.db
        .getDb()
        .update(sfOrders)
        .set({
          paymentMethod: "pix",
          mpPaymentId: pixData.mpPaymentId,
          pixQrCode: pixData.qrCodeBase64,
          pixCopyPaste: pixData.pixCode,
          pixExpiresAt: pixData.pixExpiresAt,
          status: "awaiting_payment",
          updatedAt: new Date(),
        })
        .where(eq(sfOrders.id, orderId));

      return {
        orderId,
        paymentMethod: "pix" as const,
        pixCode: pixData.pixCode,
        qrCodeBase64: pixData.qrCodeBase64,
        pixExpiresAt: pixData.pixExpiresAt.toISOString(),
      };
    }

    const items = await this.db
      .getDb()
      .select()
      .from(sfOrderItems)
      .where(eq(sfOrderItems.orderId, orderId));

    const productIds = items.map((i) => i.sfProductId);
    const productRows = await this.db
      .getDb()
      .select()
      .from(sfProducts)
      .where(inArray(sfProducts.id, productIds));

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    const prefItems: PreferenceItem[] = items.map((item) => {
      const product = productMap.get(item.sfProductId);
      return {
        title: product?.customTitle ?? "Produto",
        description: item.variationLabel ?? "",
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPriceBrl),
      };
    });

    const prefData = await this.mpService.createCheckoutProPreference(
      orderId,
      prefItems,
      order.customerEmail,
    );

    await this.db
      .getDb()
      .update(sfOrders)
      .set({
        paymentMethod: "checkout_pro",
        mpPreferenceId: prefData.preferenceId,
        initPoint: prefData.initPoint,
        status: "awaiting_payment",
        updatedAt: new Date(),
      })
      .where(eq(sfOrders.id, orderId));

    return {
      orderId,
      paymentMethod: "checkout_pro" as const,
      preferenceId: prefData.preferenceId,
      initPoint: prefData.initPoint,
    };
  }
}
