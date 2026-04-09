import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller.js";
import { ProductPreviewService } from "./product-preview.service.js";
import { ProductMapperService } from "./product-mapper.service.js";
import { AliExpressModule } from "../aliexpress/aliexpress.module.js";
import { ShopeeModule } from "../shopee/shopee.module.js";

@Module({
  imports: [AliExpressModule, ShopeeModule],
  controllers: [ProductsController],
  providers: [ProductPreviewService, ProductMapperService],
  exports: [ProductPreviewService],
})
export class ProductsModule {}
