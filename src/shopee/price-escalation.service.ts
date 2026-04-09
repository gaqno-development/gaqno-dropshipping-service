import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface PriceBreakdown {
  readonly costUsd: number;
  readonly exchangeRate: number;
  readonly costBrl: number;
  readonly shopeeFeePercent: number;
  readonly shopeeFeeBrl: number;
  readonly profitMarginPercent: number;
  readonly profitBrl: number;
  readonly sellingPriceBrl: number;
}

export function calculateSellingPrice(
  costUsd: number,
  exchangeRate: number,
  shopeeFeePercent: number,
  profitMarginPercent: number,
): number {
  const costBrl = costUsd * exchangeRate;
  const withFee = costBrl / (1 - shopeeFeePercent / 100);
  const finalPrice = withFee / (1 - profitMarginPercent / 100);
  return Math.ceil(finalPrice * 100) / 100;
}

@Injectable()
export class PriceEscalationService {
  private readonly exchangeRate: number;
  private readonly shopeeFeePercent: number;
  private readonly profitMarginPercent: number;

  constructor(private readonly config: ConfigService) {
    this.exchangeRate = parseFloat(
      this.config.get<string>("EXCHANGE_RATE_USD_BRL") ?? "5.50",
    );
    this.shopeeFeePercent = parseFloat(
      this.config.get<string>("SHOPEE_FEE_PERCENT") ?? "20",
    );
    this.profitMarginPercent = parseFloat(
      this.config.get<string>("PROFIT_MARGIN_PERCENT") ?? "30",
    );
  }

  calculate(costUsd: number): PriceBreakdown {
    const costBrl = costUsd * this.exchangeRate;
    const sellingPriceBrl = calculateSellingPrice(
      costUsd,
      this.exchangeRate,
      this.shopeeFeePercent,
      this.profitMarginPercent,
    );
    const shopeeFeeBrl = sellingPriceBrl * (this.shopeeFeePercent / 100);
    const profitBrl = sellingPriceBrl - costBrl - shopeeFeeBrl;

    return {
      costUsd,
      exchangeRate: this.exchangeRate,
      costBrl: Math.round(costBrl * 100) / 100,
      shopeeFeePercent: this.shopeeFeePercent,
      shopeeFeeBrl: Math.round(shopeeFeeBrl * 100) / 100,
      profitMarginPercent: this.profitMarginPercent,
      profitBrl: Math.round(profitBrl * 100) / 100,
      sellingPriceBrl,
    };
  }

  getExchangeRate(): number {
    return this.exchangeRate;
  }

  getShopeeFeePercent(): number {
    return this.shopeeFeePercent;
  }

  getProfitMarginPercent(): number {
    return this.profitMarginPercent;
  }
}
