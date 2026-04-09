import { Test, TestingModule } from "@nestjs/testing";
import { ProductsController } from "./products.controller.js";
import { ProductPreviewService } from "./product-preview.service.js";

describe("ProductsController", () => {
  let controller: ProductsController;
  const mockPreviewService = {
    importFromUrl: jest.fn(),
    publishToShopee: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductPreviewService, useValue: mockPreviewService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should call importFromUrl with the given URL", async () => {
    const preview = {
      productId: "p-1",
      aliexpressId: "123",
      title: "Test",
      priceBreakdown: { sellingPriceBrl: 98.18 },
    };
    mockPreviewService.importFromUrl.mockResolvedValue(preview);

    const result = await controller.importProduct({
      url: "https://www.aliexpress.com/item/123.html",
    });

    expect(mockPreviewService.importFromUrl).toHaveBeenCalledWith(
      "https://www.aliexpress.com/item/123.html",
    );
    expect(result.productId).toBe("p-1");
  });

  it("should call publishToShopee with productId and optional categoryId", async () => {
    const publishResult = { shopeeItemId: 999 };
    mockPreviewService.publishToShopee.mockResolvedValue(publishResult);

    const result = await controller.publishProduct({
      productId: "p-1",
      categoryId: 200,
    });

    expect(mockPreviewService.publishToShopee).toHaveBeenCalledWith("p-1", 200);
    expect(result.shopeeItemId).toBe(999);
  });
});
