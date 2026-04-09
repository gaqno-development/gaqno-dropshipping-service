import { Injectable } from "@nestjs/common";
import type { AliExpressProductDetails } from "../aliexpress/dto/aliexpress-product.dto.js";
import type {
  ShopeeTierVariation,
  ShopeeModel,
} from "../shopee/dto/shopee-product.dto.js";

export interface ParsedVariation {
  readonly name: string;
  readonly value: string;
  readonly imageUrl?: string;
}

export interface ParsedSku {
  readonly skuId: string;
  readonly price: number;
  readonly stock: number;
  readonly variations: readonly ParsedVariation[];
}

export interface MappedVariations {
  readonly tierVariations: readonly ShopeeTierVariation[];
  readonly models: readonly ShopeeModel[];
  readonly parsedSkus: readonly ParsedSku[];
}

const VARIATION_NAME_MAP: Record<string, string> = {
  "14": "Cor",
  "5": "Tamanho",
  "200007763": "Tamanho",
  "200000828": "Cor",
  "200000539": "Tamanho de Calçado",
  "10": "Tipo",
};

function parseSkuAttr(skuAttr: string): ParsedVariation[] {
  if (!skuAttr) return [];

  return skuAttr.split(";").filter(Boolean).map((segment) => {
    const [propPart, valuePart] = segment.split(":");
    if (!valuePart) {
      return { name: "Variação", value: propPart };
    }

    const valueChunks = valuePart.split("#");
    const displayValue = valueChunks.length > 1 ? valueChunks[1] : valueChunks[0];
    const propId = propPart.trim();
    const name = VARIATION_NAME_MAP[propId] ?? `Opção ${propId}`;
    const imageUrl = valueChunks.length > 2 ? valueChunks[2] : undefined;

    return { name, value: displayValue, imageUrl };
  });
}

@Injectable()
export class ProductMapperService {
  mapVariations(product: AliExpressProductDetails): MappedVariations {
    const parsedSkus: ParsedSku[] = product.skus.map((sku) => ({
      skuId: sku.skuId,
      price: sku.price,
      stock: sku.stock,
      variations: parseSkuAttr(sku.attributes),
    }));

    const tierMap = new Map<string, Set<string>>();

    for (const sku of parsedSkus) {
      for (const v of sku.variations) {
        if (!tierMap.has(v.name)) {
          tierMap.set(v.name, new Set());
        }
        tierMap.get(v.name)!.add(v.value);
      }
    }

    const tierNames = Array.from(tierMap.keys());

    const tierVariations: ShopeeTierVariation[] = tierNames.map((name) => ({
      name,
      option_list: Array.from(tierMap.get(name)!).map((option) => ({
        option,
      })),
    }));

    const models: ShopeeModel[] = parsedSkus
      .filter((sku) => sku.stock > 0)
      .map((sku) => {
        const tierIndex = tierNames.map((tierName) => {
          const variation = sku.variations.find((v) => v.name === tierName);
          if (!variation) return 0;
          const options = Array.from(tierMap.get(tierName)!);
          return options.indexOf(variation.value);
        });

        return {
          tier_index: tierIndex,
          normal_stock: sku.stock,
          original_price: sku.price,
        };
      });

    return { tierVariations, models, parsedSkus };
  }
}
