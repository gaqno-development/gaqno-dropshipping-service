import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AliExpressService } from "./aliexpress.service.js";
import {
  generateAliExpressSign,
  extractProductIdFromUrl,
} from "./aliexpress-auth.util.js";

describe("generateAliExpressSign", () => {
  it("should generate uppercase HMAC-SHA256 with sorted params", () => {
    const sign = generateAliExpressSign(
      "aliexpress.ds.product.get",
      { b_param: "2", a_param: "1" },
      "test-secret",
    );
    expect(sign).toMatch(/^[A-F0-9]{64}$/);
  });

  it("should produce deterministic signatures", () => {
    const params = { method: "test", app_key: "123" };
    const first = generateAliExpressSign("api.test", params, "secret");
    const second = generateAliExpressSign("api.test", params, "secret");
    expect(first).toBe(second);
  });

  it("should produce different signatures for different secrets", () => {
    const params = { method: "test" };
    const a = generateAliExpressSign("api", params, "secret-a");
    const b = generateAliExpressSign("api", params, "secret-b");
    expect(a).not.toBe(b);
  });
});

describe("extractProductIdFromUrl", () => {
  it("should extract id from standard URL", () => {
    const id = extractProductIdFromUrl(
      "https://www.aliexpress.com/item/1005001234567890.html",
    );
    expect(id).toBe("1005001234567890");
  });

  it("should extract id from URL with query param", () => {
    const id = extractProductIdFromUrl(
      "https://www.aliexpress.com/item?productId=1005001234567890",
    );
    expect(id).toBe("1005001234567890");
  });

  it("should extract numeric id from unstructured URL", () => {
    const id = extractProductIdFromUrl(
      "https://aliexpress.com/something/1005001234567890/details",
    );
    expect(id).toBe("1005001234567890");
  });

  it("should throw for URL without product id", () => {
    expect(() => extractProductIdFromUrl("https://aliexpress.com/store")).toThrow(
      "Cannot extract product ID",
    );
  });
});

describe("AliExpressService", () => {
  let service: AliExpressService;
  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        ALIEXPRESS_APP_KEY: "test-key",
        ALIEXPRESS_APP_SECRET: "test-secret",
        ALIEXPRESS_ACCESS_TOKEN: "test-token",
      };
      return map[key] ?? "";
    }),
    get: jest.fn(() => "https://api-sg.aliexpress.com/sync"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AliExpressService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AliExpressService>(AliExpressService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should call AliExpress API for product details", async () => {
    const mockResponse = {
      aliexpress_ds_product_get_response: {
        result: {
          ae_item_base_info_dto: {
            product_id: 123456,
            subject: "Test Product",
            detail: "Description",
            product_status_type: "onSelling",
            category_id: 100,
            currency_code: "USD",
          },
          ae_item_sku_info_dtos: {
            ae_item_sku_info_d_t_o: [
              {
                sku_id: 1,
                sku_price: "10.50",
                sku_stock: true,
                sku_attr: "Color:Red",
                id: "1",
                offer_sale_price: "9.99",
                offer_bulk_sale_price: "9.50",
                sku_available_stock: 100,
              },
            ],
          },
          ae_multimedia_info_dto: {
            image_urls: "https://img1.jpg;https://img2.jpg",
          },
        },
        rsp_code: 200,
        rsp_msg: "success",
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.getProductDetails("123456");
    expect(result.productId).toBe("123456");
    expect(result.title).toBe("Test Product");
    expect(result.skus).toHaveLength(1);
    expect(result.lowestPrice).toBe(9.99);
    expect(result.imageUrls).toEqual(["https://img1.jpg", "https://img2.jpg"]);
  });

  it("should handle order creation success", async () => {
    const mockResponse = {
      aliexpress_ds_order_create_response: {
        result: {
          order_list: ["8001234567890"],
          is_success: true,
          error_code: "",
          error_msg: "",
        },
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.createDropshippingOrder({
      productId: "123456",
      quantity: 1,
      skuId: "sku-1",
      shippingAddress: "Rua Teste, 123",
      contactName: "Test User",
      phoneNumber: "+5511999999999",
      country: "BR",
      zipCode: "01001000",
    });

    expect(result.success).toBe(true);
    expect(result.orderIds).toContain("8001234567890");
  });

  it("should handle order creation failure", async () => {
    const mockResponse = {
      aliexpress_ds_order_create_response: {
        result: {
          order_list: [],
          is_success: false,
          error_code: "B_PRODUCT_NOT_FOUND",
          error_msg: "Product not found or out of stock",
        },
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.createDropshippingOrder({
      productId: "999999",
      quantity: 1,
      skuId: "sku-1",
      shippingAddress: "Rua Teste, 123",
      contactName: "Test User",
      phoneNumber: "+5511999999999",
      country: "BR",
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("B_PRODUCT_NOT_FOUND");
  });
});
