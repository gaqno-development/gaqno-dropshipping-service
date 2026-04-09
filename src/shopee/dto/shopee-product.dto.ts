export interface ShopeeTierVariation {
  readonly name: string;
  readonly option_list: ReadonlyArray<{
    readonly option: string;
    readonly image?: { readonly image_id: string };
  }>;
}

export interface ShopeeModel {
  readonly tier_index: readonly number[];
  readonly normal_stock: number;
  readonly original_price: number;
}

export interface ShopeeAddItemPayload {
  readonly original_price: number;
  readonly description: string;
  readonly item_name: string;
  readonly normal_stock: number;
  readonly logistic_info: ReadonlyArray<{
    readonly logistic_id: number;
    readonly enabled: boolean;
  }>;
  readonly category_id: number;
  readonly image: {
    readonly image_id_list: readonly string[];
  };
  readonly tier_variation?: readonly ShopeeTierVariation[];
  readonly model?: readonly ShopeeModel[];
  readonly weight: number;
  readonly dimension?: {
    readonly package_length: number;
    readonly package_width: number;
    readonly package_height: number;
  };
}

export interface ShopeeAddItemResponse {
  readonly error: string;
  readonly message: string;
  readonly response?: {
    readonly item_id: number;
  };
}
