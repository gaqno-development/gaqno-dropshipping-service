import { Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { AliExpressService } from "../aliexpress/aliexpress.service.js";
import { extractProductIdFromUrl } from "../aliexpress/aliexpress-auth.util.js";
import { ProductMapperService } from "./product-mapper.service.js";
import { PriceEscalationService } from "../shopee/price-escalation.service.js";
import { ShopeeService } from "../shopee/shopee.service.js";
import { DatabaseService } from "../database/db.service.js";
import { products, syncLogs } from "../database/schema.js";
import type { PriceBreakdown } from "../shopee/price-escalation.service.js";
import type { AliExpressProductDetails } from "../aliexpress/dto/aliexpress-product.dto.js";
import type { MappedVariations } from "./product-mapper.service.js";

export interface ProductPreview {
  readonly productId: string;
  readonly aliexpressId: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrls: readonly string[];
  readonly variations: MappedVariations;
  readonly priceBreakdown: PriceBreakdown;
  readonly aliexpressDetails: AliExpressProductDetails;
}

@Injectable()
export class ProductPreviewService {
  private readonly logger = new Logger(ProductPreviewService.name);

  constructor(
    private readonly aliExpressService: AliExpressService,
    private readonly mapperService: ProductMapperService,
    private readonly priceService: PriceEscalationService,
    private readonly shopeeService: ShopeeService,
    private readonly dbService: DatabaseService,
  ) {}

  async importFromUrl(url: string): Promise<ProductPreview> {
    const aliexpressId = extractProductIdFromUrl(url);

    const aliProduct = await this.aliExpressService.getProductDetails(aliexpressId);

    await this.dbService.getDb().insert(syncLogs).values({
      action: "product_fetch",
      referenceId: aliexpressId,
      requestPayload: { url },
      success: "true",
    });

    const variations = this.mapperService.mapVariations(aliProduct);
    const priceBreakdown = this.priceService.calculate(aliProduct.lowestPrice);

    const [saved] = await this.dbService
      .getDb()
      .insert(products)
      .values({
        aliexpressId,
        title: aliProduct.title,
        description: aliProduct.description,
        imageUrls: aliProduct.imageUrls.join(";"),
        costUsd: String(aliProduct.lowestPrice),
        sellingPriceBrl: String(priceBreakdown.sellingPriceBrl),
        exchangeRateUsed: String(priceBreakdown.exchangeRate),
        shopeeFeePct: String(priceBreakdown.shopeeFeePercent),
        profitMarginPct: String(priceBreakdown.profitMarginPercent),
        mappedVariations: variations,
        status: "draft",
      })
      .returning();

    return {
      productId: saved.id,
      aliexpressId,
      title: aliProduct.title,
      description: aliProduct.description,
      imageUrls: aliProduct.imageUrls,
      variations,
      priceBreakdown,
      aliexpressDetails: aliProduct,
    };
  }

  async publishToShopee(productId: string, categoryId?: number): Promise<{ shopeeItemId: number }> {
    const [product] = await this.dbService
      .getDb()
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const variations = product.mappedVariations as MappedVariations | null;
    const sellingPrice = parseFloat(product.sellingPriceBrl);

    const result = await this.shopeeService.addItem({
      item_name: product.title,
      description: product.description ?? "",
      original_price: sellingPrice,
      normal_stock: 999,
      category_id: categoryId ?? 0,
      logistic_info: [{ logistic_id: 0, enabled: true }],
      image: {
        image_id_list: product.imageUrls?.split(";").slice(0, 9) ?? [],
      },
      tier_variation: variations?.tierVariations,
      model: variations?.models,
      weight: 0.5,
    });

    await this.dbService
      .getDb()
      .update(products)
      .set({
        shopeeItemId: String(result.itemId),
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    await this.dbService.getDb().insert(syncLogs).values({
      action: "product_publish",
      referenceId: productId,
      responsePayload: result as unknown as Record<string, unknown>,
      success: "true",
    });

    return { shopeeItemId: result.itemId };
  }
}
