import { IsString, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class CreateAliExpressOrderDto {
  @IsString()
  @IsNotEmpty()
  readonly productId!: string;

  @IsNumber()
  readonly quantity!: number;

  @IsString()
  @IsNotEmpty()
  readonly skuId!: string;

  @IsString()
  @IsNotEmpty()
  readonly shippingAddress!: string;

  @IsString()
  @IsNotEmpty()
  readonly contactName!: string;

  @IsString()
  @IsNotEmpty()
  readonly phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  readonly country!: string;

  @IsString()
  @IsOptional()
  readonly zipCode?: string;
}

export interface AliExpressOrderResponse {
  readonly aliexpress_ds_order_create_response: {
    readonly result: {
      readonly order_list: ReadonlyArray<string>;
      readonly is_success: boolean;
      readonly error_code: string;
      readonly error_msg: string;
    };
  };
}

export interface AliExpressOrderResult {
  readonly success: boolean;
  readonly orderIds: readonly string[];
  readonly errorCode?: string;
  readonly errorMessage?: string;
}
