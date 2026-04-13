import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { GAQNO_THROTTLE_ONE_MINUTE, sessionAuthMiddleware } from "@gaqno-development/backcore";
import { DatabaseModule } from "./database/db.module.js";
import { MessagingModule } from "./messaging/messaging.module.js";
import { HealthModule } from "./health/health.module.js";
import { AliExpressModule } from "./aliexpress/aliexpress.module.js";
import { ShopeeModule } from "./shopee/shopee.module.js";
import { MercadoPagoModule } from "./mercadopago/mercadopago.module.js";
import { OrderFlowModule } from "./order-flow/order-flow.module.js";
import { ProductsModule } from "./products/products.module.js";
import { CatalogModule } from "./storefront/catalog/catalog.module.js";
import { CheckoutModule } from "./storefront/checkout/checkout.module.js";
import { AdminStorefrontModule } from "./storefront/admin/admin.module.js";
import { OrdersModule } from "./orders/orders.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }) as any,
    ThrottlerModule.forRoot([{ ...GAQNO_THROTTLE_ONE_MINUTE }]),
    DatabaseModule,
    MessagingModule,
    HealthModule,
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(sessionAuthMiddleware).forRoutes("*");
  }
}