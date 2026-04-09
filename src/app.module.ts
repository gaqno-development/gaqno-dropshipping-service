import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { DatabaseModule } from "./database/db.module.js";
import { MessagingModule } from "./messaging/messaging.module.js";
import { HealthModule } from "./health/health.module.js";
import { AliExpressModule } from "./aliexpress/aliexpress.module.js";
import { ShopeeModule } from "./shopee/shopee.module.js";
import { MercadoPagoModule } from "./mercadopago/mercadopago.module.js";
import { OrderFlowModule } from "./order-flow/order-flow.module.js";
import { ProductsModule } from "./products/products.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }) as any,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule,
    MessagingModule,
    HealthModule,
    AliExpressModule,
    ShopeeModule,
    MercadoPagoModule,
    OrderFlowModule,
    ProductsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
