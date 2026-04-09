import { Injectable, Logger } from "@nestjs/common";
import { ShopeeAuthService } from "./shopee-auth.service.js";
import type {
  ShopeeAddItemPayload,
  ShopeeAddItemResponse,
} from "./dto/shopee-product.dto.js";

@Injectable()
export class ShopeeService {
  private readonly logger = new Logger(ShopeeService.name);

  constructor(private readonly auth: ShopeeAuthService) {}

  async addItem(payload: ShopeeAddItemPayload): Promise<{ itemId: number }> {
    await this.auth.getAccessToken();
    const url = this.auth.buildAuthenticatedUrl("/api/v2/product/add_item");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Shopee API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ShopeeAddItemResponse;

    if (data.error) {
      this.logger.error(`Shopee add_item failed: ${data.error} - ${data.message}`);
      throw new Error(`Shopee add_item failed: ${data.error} - ${data.message}`);
    }

    if (!data.response?.item_id) {
      throw new Error("Shopee add_item returned no item_id");
    }

    return { itemId: data.response.item_id };
  }

  async updateOrderStatus(
    orderSn: string,
    packageNumber: string,
  ): Promise<void> {
    await this.auth.getAccessToken();
    const url = this.auth.buildAuthenticatedUrl(
      "/api/v2/logistics/ship_order",
    );

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_sn: orderSn,
        package_number: packageNumber,
      }),
    });

    if (!response.ok) {
      this.logger.error(`Shopee ship_order failed: ${response.status}`);
      throw new Error(`Shopee ship_order failed: ${response.status}`);
    }
  }
}
