import { Module, forwardRef } from "@nestjs/common";
import { OrderFlowService } from "./order-flow.service.js";
import { OrderFlowProcessor } from "../messaging/order-flow.processor.js";
import { MercadoPagoModule } from "../mercadopago/mercadopago.module.js";
import { AliExpressModule } from "../aliexpress/aliexpress.module.js";
import { ShopeeModule } from "../shopee/shopee.module.js";

@Module({
  imports: [
    forwardRef(() => MercadoPagoModule),
    AliExpressModule,
    ShopeeModule,
  ],
  providers: [OrderFlowService, OrderFlowProcessor],
  exports: [OrderFlowService],
})
export class OrderFlowModule {}
