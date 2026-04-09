import { Module } from "@nestjs/common";
import { ShopeeAuthService } from "./shopee-auth.service.js";
import { ShopeeService } from "./shopee.service.js";
import { PriceEscalationService } from "./price-escalation.service.js";

@Module({
  providers: [ShopeeAuthService, ShopeeService, PriceEscalationService],
  exports: [ShopeeService, PriceEscalationService, ShopeeAuthService],
})
export class ShopeeModule {}
