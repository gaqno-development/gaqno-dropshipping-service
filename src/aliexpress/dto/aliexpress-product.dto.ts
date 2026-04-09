export interface AliExpressProductResponse {
  readonly aliexpress_ds_product_get_response: {
    readonly result: {
      readonly ae_item_base_info_dto: {
        readonly product_id: number;
        readonly subject: string;
        readonly detail: string;
        readonly product_status_type: string;
        readonly category_id: number;
        readonly currency_code: string;
      };
      readonly ae_item_sku_info_dtos: {
        readonly ae_item_sku_info_d_t_o: ReadonlyArray<{
          readonly sku_id: number;
          readonly sku_price: string;
          readonly sku_stock: boolean;
          readonly sku_attr: string;
          readonly id: string;
          readonly offer_sale_price: string;
          readonly offer_bulk_sale_price: string;
          readonly sku_available_stock: number;
        }>;
      };
      readonly ae_multimedia_info_dto: {
        readonly image_urls: string;
      };
    };
    readonly rsp_code: number;
    readonly rsp_msg: string;
  };
}

export interface AliExpressProductDetails {
  readonly productId: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrls: readonly string[];
  readonly categoryId: number;
  readonly currency: string;
  readonly skus: ReadonlyArray<{
    readonly skuId: string;
    readonly price: number;
    readonly stock: number;
    readonly attributes: string;
    readonly available: boolean;
  }>;
  readonly lowestPrice: number;
}
