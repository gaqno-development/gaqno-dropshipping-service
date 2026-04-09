import { Test, TestingModule } from "@nestjs/testing";
import { ShopeeService } from "./shopee.service.js";
import { ShopeeAuthService, generateShopeeSign } from "./shopee-auth.service.js";

describe("generateShopeeSign", () => {
  it("should generate a hex HMAC-SHA256 signature", () => {
    const sign = generateShopeeSign(
      123456,
      "/api/v2/product/add_item",
      1700000000,
      "access-token",
      789,
      "partner-key",
    );
    expect(sign).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should produce deterministic results", () => {
    const args = [100, "/api/test", 123, "token", 456, "key"] as const;
    expect(generateShopeeSign(...args)).toBe(generateShopeeSign(...args));
  });
});

describe("ShopeeService", () => {
  let service: ShopeeService;
  const mockAuth = {
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
    buildAuthenticatedUrl: jest.fn(
      (path: string) => `https://partner.shopeemobile.com${path}?signed=true`,
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopeeService,
        { provide: ShopeeAuthService, useValue: mockAuth },
      ],
    }).compile();

    service = module.get<ShopeeService>(ShopeeService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should add item successfully", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          error: "",
          message: "",
          response: { item_id: 999 },
        }),
    });

    const result = await service.addItem({
      original_price: 99.9,
      description: "Test product",
      item_name: "Test",
      normal_stock: 50,
      logistic_info: [{ logistic_id: 1, enabled: true }],
      category_id: 100,
      image: { image_id_list: ["img1"] },
      weight: 0.5,
    });

    expect(result.itemId).toBe(999);
    expect(mockAuth.getAccessToken).toHaveBeenCalled();
  });

  it("should throw on Shopee error response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          error: "product.error_param",
          message: "Invalid category",
        }),
    });

    await expect(
      service.addItem({
        original_price: 10,
        description: "",
        item_name: "",
        normal_stock: 0,
        logistic_info: [],
        category_id: -1,
        image: { image_id_list: [] },
        weight: 0,
      }),
    ).rejects.toThrow("Shopee add_item failed");
  });
});
