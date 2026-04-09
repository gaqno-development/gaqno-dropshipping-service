import { Module, forwardRef } from "@nestjs/common";
import { MercadoPagoService } from "./mercadopago.service.js";
import { MercadoPagoController } from "./mercadopago.controller.js";
import { OrderFlowModule } from "../order-flow/order-flow.module.js";

@Module({
  imports: [forwardRef(() => OrderFlowModule)],
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
