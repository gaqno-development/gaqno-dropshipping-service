import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";

export function generateShopeeSign(
  partnerId: number,
  apiPath: string,
  timestamp: number,
  accessToken: string,
  shopId: number,
  partnerKey: string,
): string {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return createHmac("sha256", partnerKey).update(baseString).digest("hex");
}

interface ShopeeTokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expire_in: number;
  readonly error?: string;
  readonly message?: string;
}

@Injectable()
export class ShopeeAuthService {
  private readonly logger = new Logger(ShopeeAuthService.name);
  private readonly partnerId: number;
  private readonly partnerKey: string;
  private readonly shopId: number;
  private readonly apiUrl: string;

  private accessToken: string;
  private refreshToken: string;
  private expiresAt = 0;

  constructor(private readonly config: ConfigService) {
    this.partnerId = Number(this.config.getOrThrow<string>("SHOPEE_PARTNER_ID"));
    this.partnerKey = this.config.getOrThrow<string>("SHOPEE_PARTNER_KEY");
    this.shopId = Number(this.config.getOrThrow<string>("SHOPEE_SHOP_ID"));
    this.apiUrl =
      this.config.get<string>("SHOPEE_API_URL") ??
      "https://partner.shopeemobile.com";
    this.accessToken = this.config.get<string>("SHOPEE_ACCESS_TOKEN") ?? "";
    this.refreshToken = this.config.get<string>("SHOPEE_REFRESH_TOKEN") ?? "";
  }

  getPartnerId(): number {
    return this.partnerId;
  }

  getShopId(): number {
    return this.shopId;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && now < this.expiresAt - 300) {
      return this.accessToken;
    }

    if (this.refreshToken) {
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  buildAuthenticatedUrl(apiPath: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = generateShopeeSign(
      this.partnerId,
      apiPath,
      timestamp,
      this.accessToken,
      this.shopId,
      this.partnerKey,
    );

    const params = new URLSearchParams({
      partner_id: String(this.partnerId),
      timestamp: String(timestamp),
      access_token: this.accessToken,
      shop_id: String(this.shopId),
      sign,
    });

    return `${this.apiUrl}${apiPath}?${params.toString()}`;
  }

  private async refreshAccessToken(): Promise<void> {
    const apiPath = "/api/v2/auth/access_token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseString = `${this.partnerId}${apiPath}${timestamp}`;
    const sign = createHmac("sha256", this.partnerKey)
      .update(baseString)
      .digest("hex");

    const url = `${this.apiUrl}${apiPath}?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
        partner_id: this.partnerId,
        shop_id: this.shopId,
      }),
    });

    const data = (await response.json()) as ShopeeTokenResponse;

    if (data.error) {
      this.logger.error(`Shopee token refresh failed: ${data.error} - ${data.message}`);
      throw new Error(`Shopee token refresh failed: ${data.error}`);
    }

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = Math.floor(Date.now() / 1000) + data.expire_in;
  }
}
