import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/db.module.js";
import { MessagingModule } from "./messaging/messaging.module.js";
import { HealthModule } from "./health/health.module.js";
import { AliExpressModule } from "./aliexpress/aliexpress.module.js";
import { ShopeeModule } from "./shopee/shopee.module.js";
import { MercadoPagoModule } from "./mercadopago/mercadopago.module.js";
import { OrderFlowModule } from "./order-flow/order-flow.module.js";
import { ProductsModule } from "./products/products.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogModule } from "./storefront/catalog/catalog.module.js";
import { CheckoutModule } from "./storefront/checkout/checkout.module.js";
import { AdminStorefrontModule } from "./storefront/admin/admin.module.js";
import { OrdersModule } from "./orders/orders.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }) as any,
    DatabaseModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    AliExpressModule,
    ShopeeModule,
    MercadoPagoModule,
    OrderFlowModule,
    ProductsModule,
    OrdersModule,
    CatalogModule,
    CheckoutModule,
    AdminStorefrontModule,
  ],
})
export class AppModule {}
