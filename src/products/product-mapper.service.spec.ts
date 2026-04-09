import { ProductMapperService } from "./product-mapper.service.js";
import type { AliExpressProductDetails } from "../aliexpress/dto/aliexpress-product.dto.js";

describe("ProductMapperService", () => {
  let mapper: ProductMapperService;

  beforeEach(() => {
    mapper = new ProductMapperService();
  });

  const buildProduct = (
    skus: AliExpressProductDetails["skus"],
  ): AliExpressProductDetails => ({
    productId: "123",
    title: "Test Product",
    description: "Description",
    imageUrls: ["https://img1.jpg"],
    categoryId: 100,
    currency: "USD",
    skus,
    lowestPrice: 5,
  });

  it("should map single-tier variations", () => {
    const product = buildProduct([
      { skuId: "1", price: 5, stock: 10, attributes: "14:201336100#Vermelho", available: true },
      { skuId: "2", price: 5, stock: 8, attributes: "14:201336101#Azul", available: true },
    ]);

    const result = mapper.mapVariations(product);

    expect(result.tierVariations).toHaveLength(1);
    expect(result.tierVariations[0].name).toBe("Cor");
    expect(result.tierVariations[0].option_list).toHaveLength(2);
    expect(result.models).toHaveLength(2);
    expect(result.models[0].tier_index).toEqual([0]);
    expect(result.models[1].tier_index).toEqual([1]);
  });

  it("should map multi-tier variations (color + size)", () => {
    const product = buildProduct([
      { skuId: "1", price: 10, stock: 5, attributes: "14:100#Preto;5:101#M", available: true },
      { skuId: "2", price: 10, stock: 3, attributes: "14:100#Preto;5:102#L", available: true },
      { skuId: "3", price: 12, stock: 7, attributes: "14:200#Branco;5:101#M", available: true },
    ]);

    const result = mapper.mapVariations(product);

    expect(result.tierVariations).toHaveLength(2);
    const colorTier = result.tierVariations.find((t) => t.name === "Cor");
    const sizeTier = result.tierVariations.find((t) => t.name === "Tamanho");

    expect(colorTier?.option_list.map((o) => o.option)).toEqual(["Preto", "Branco"]);
    expect(sizeTier?.option_list.map((o) => o.option)).toEqual(["M", "L"]);

    expect(result.models).toHaveLength(3);
    expect(result.models[0].tier_index).toEqual([0, 0]);
    expect(result.models[1].tier_index).toEqual([0, 1]);
    expect(result.models[2].tier_index).toEqual([1, 0]);
  });

  it("should exclude out-of-stock SKUs from models", () => {
    const product = buildProduct([
      { skuId: "1", price: 5, stock: 10, attributes: "14:100#Red", available: true },
      { skuId: "2", price: 5, stock: 0, attributes: "14:200#Blue", available: false },
    ]);

    const result = mapper.mapVariations(product);
    expect(result.models).toHaveLength(1);
    expect(result.parsedSkus).toHaveLength(2);
  });

  it("should handle empty attributes", () => {
    const product = buildProduct([
      { skuId: "1", price: 5, stock: 10, attributes: "", available: true },
    ]);

    const result = mapper.mapVariations(product);
    expect(result.tierVariations).toHaveLength(0);
    expect(result.models).toHaveLength(1);
    expect(result.models[0].tier_index).toEqual([]);
  });

  it("should preserve parsed SKU data", () => {
    const product = buildProduct([
      { skuId: "42", price: 7.5, stock: 20, attributes: "14:100#Verde", available: true },
    ]);

    const result = mapper.mapVariations(product);
    expect(result.parsedSkus[0].skuId).toBe("42");
    expect(result.parsedSkus[0].price).toBe(7.5);
    expect(result.parsedSkus[0].variations[0].value).toBe("Verde");
  });
});
