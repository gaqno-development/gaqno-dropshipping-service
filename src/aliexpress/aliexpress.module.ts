import { Module } from "@nestjs/common";
import { AliExpressService } from "./aliexpress.service.js";

@Module({
  providers: [AliExpressService],
  exports: [AliExpressService],
})
export class AliExpressModule {}
