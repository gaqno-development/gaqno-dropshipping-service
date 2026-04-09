import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  PriceEscalationService,
  calculateSellingPrice,
} from "./price-escalation.service.js";

describe("calculateSellingPrice", () => {
  it("should compute correct BRL price from USD cost", () => {
    const result = calculateSellingPrice(10, 5.5, 20, 30);
    const costBrl = 10 * 5.5;
    const withFee = costBrl / (1 - 0.2);
    const expected = Math.ceil((withFee / (1 - 0.3)) * 100) / 100;
    expect(result).toBe(expected);
  });

  it("should return higher price for higher margin", () => {
    const low = calculateSellingPrice(10, 5.5, 20, 10);
    const high = calculateSellingPrice(10, 5.5, 20, 50);
    expect(high).toBeGreaterThan(low);
  });

  it("should return higher price for higher Shopee fee", () => {
    const low = calculateSellingPrice(10, 5.5, 10, 30);
    const high = calculateSellingPrice(10, 5.5, 30, 30);
    expect(high).toBeGreaterThan(low);
  });

  it("should round up to nearest cent", () => {
    const result = calculateSellingPrice(3.33, 5.12, 18, 25);
    const cents = Math.round(result * 100);
    expect(result).toBe(cents / 100);
  });

  it("should handle zero cost", () => {
    const result = calculateSellingPrice(0, 5.5, 20, 30);
    expect(result).toBe(0);
  });
});

describe("PriceEscalationService", () => {
  let service: PriceEscalationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceEscalationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                EXCHANGE_RATE_USD_BRL: "5.50",
                SHOPEE_FEE_PERCENT: "20",
                PROFIT_MARGIN_PERCENT: "30",
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PriceEscalationService>(PriceEscalationService);
  });

  it("should return full price breakdown", () => {
    const breakdown = service.calculate(10);
    expect(breakdown.costUsd).toBe(10);
    expect(breakdown.exchangeRate).toBe(5.5);
    expect(breakdown.costBrl).toBe(55);
    expect(breakdown.shopeeFeePercent).toBe(20);
    expect(breakdown.profitMarginPercent).toBe(30);
    expect(breakdown.sellingPriceBrl).toBeGreaterThan(55);
    expect(breakdown.shopeeFeeBrl).toBeGreaterThan(0);
    expect(breakdown.profitBrl).toBeGreaterThan(0);
  });

  it("should expose config values", () => {
    expect(service.getExchangeRate()).toBe(5.5);
    expect(service.getShopeeFeePercent()).toBe(20);
    expect(service.getProfitMarginPercent()).toBe(30);
  });
});
