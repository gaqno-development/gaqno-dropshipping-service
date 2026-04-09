import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { ImportProductDto } from "./dto/import-product.dto.js";
import { PublishProductDto } from "./dto/publish-product.dto.js";
import { ProductPreviewService } from "./product-preview.service.js";

@Controller("products")
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly previewService: ProductPreviewService) {}

  @Post("import")
  @HttpCode(200)
  async importProduct(@Body() dto: ImportProductDto) {
    return this.previewService.importFromUrl(dto.url);
  }

  @Post("publish")
  @HttpCode(200)
  async publishProduct(@Body() dto: PublishProductDto) {
    return this.previewService.publishToShopee(
      dto.productId,
      dto.categoryId,
    );
  }
}
