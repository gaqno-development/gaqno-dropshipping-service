import { Module } from "@nestjs/common";
import { MercadoPagoModule } from "../../mercadopago/mercadopago.module.js";
import { CheckoutController } from "./checkout.controller.js";
import { CheckoutService } from "./checkout.service.js";

@Module({
  imports: [MercadoPagoModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
