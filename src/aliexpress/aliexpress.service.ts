import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { generateAliExpressSign } from "./aliexpress-auth.util.js";
import type {
  AliExpressProductResponse,
  AliExpressProductDetails,
} from "./dto/aliexpress-product.dto.js";
import type {
  AliExpressOrderResult,
  AliExpressOrderResponse,
} from "./dto/aliexpress-order.dto.js";
import type { CreateAliExpressOrderDto } from "./dto/aliexpress-order.dto.js";

@Injectable()
export class AliExpressService {
  private readonly logger = new Logger(AliExpressService.name);
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly accessToken: string;
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.appKey = this.config.getOrThrow<string>("ALIEXPRESS_APP_KEY");
    this.appSecret = this.config.getOrThrow<string>("ALIEXPRESS_APP_SECRET");
    this.accessToken = this.config.getOrThrow<string>("ALIEXPRESS_ACCESS_TOKEN");
    this.apiUrl =
      this.config.get<string>("ALIEXPRESS_API_URL") ??
      "https://api-sg.aliexpress.com/sync";
  }

  async getProductDetails(productId: string): Promise<AliExpressProductDetails> {
    const apiName = "aliexpress.ds.product.get";
    const params: Record<string, string> = {
      app_key: this.appKey,
      session: this.accessToken,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      sign_method: "hmac-sha256",
      method: apiName,
      product_id: productId,
      target_currency: "USD",
      target_language: "en",
    };

    const sign = generateAliExpressSign(apiName, params, this.appSecret);
    const queryParams = new URLSearchParams({ ...params, sign });

    const response = await fetch(`${this.apiUrl}?${queryParams.toString()}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`AliExpress API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AliExpressProductResponse;
    const result = data.aliexpress_ds_product_get_response?.result;

    if (!result) {
      const rspMsg = data.aliexpress_ds_product_get_response?.rsp_msg;
      throw new Error(`AliExpress product fetch failed: ${rspMsg ?? "unknown error"}`);
    }

    const baseInfo = result.ae_item_base_info_dto;
    const skuList = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o ?? [];
    const images = result.ae_multimedia_info_dto?.image_urls?.split(";") ?? [];

    const skus = skuList.map((sku) => ({
      skuId: String(sku.sku_id),
      price: parseFloat(sku.offer_sale_price || sku.sku_price),
      stock: sku.sku_available_stock,
      attributes: sku.sku_attr,
      available: sku.sku_stock,
    }));

    const availableSkus = skus.filter((s) => s.available && s.stock > 0);
    const lowestPrice = availableSkus.length > 0
      ? Math.min(...availableSkus.map((s) => s.price))
      : skus.length > 0
        ? Math.min(...skus.map((s) => s.price))
        : 0;

    return {
      productId: String(baseInfo.product_id),
      title: baseInfo.subject,
      description: baseInfo.detail,
      imageUrls: images,
      categoryId: baseInfo.category_id,
      currency: baseInfo.currency_code,
      skus,
      lowestPrice,
    };
  }

  async createDropshippingOrder(
    dto: CreateAliExpressOrderDto,
  ): Promise<AliExpressOrderResult> {
    const apiName = "aliexpress.ds.order.create";

    const logisticsAddress = JSON.stringify({
      contact_person: dto.contactName,
      address: dto.shippingAddress,
      country: dto.country,
      phone_number: dto.phoneNumber,
      zip: dto.zipCode ?? "",
    });

    const productItems = JSON.stringify([
      {
        product_id: dto.productId,
        sku_id: dto.skuId,
        quantity: dto.quantity,
      },
    ]);

    const params: Record<string, string> = {
      app_key: this.appKey,
      session: this.accessToken,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      sign_method: "hmac-sha256",
      method: apiName,
      logistics_address: logisticsAddress,
      product_items: productItems,
    };

    const sign = generateAliExpressSign(apiName, params, this.appSecret);
    const queryParams = new URLSearchParams({ ...params, sign });

    const response = await fetch(`${this.apiUrl}?${queryParams.toString()}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`AliExpress API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AliExpressOrderResponse;
    const result = data.aliexpress_ds_order_create_response?.result;

    if (!result?.is_success) {
      this.logger.error(
        `AliExpress order failed: ${result?.error_code} - ${result?.error_msg}`,
      );
      return {
        success: false,
        orderIds: [],
        errorCode: result?.error_code,
        errorMessage: result?.error_msg,
      };
    }

    return {
      success: true,
      orderIds: result.order_list,
    };
  }
}
