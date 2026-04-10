import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export class OrderItemDto {
  @IsString()
  readonly sfProductId!: string;

  @IsInt()
  @Min(1)
  readonly quantity!: number;

  @IsOptional()
  @IsString()
  readonly variationLabel?: string;
}

export class ShippingAddressDto {
  @IsString()
  readonly street!: string;

  @IsString()
  readonly number!: string;

  @IsOptional()
  @IsString()
  readonly complement?: string;

  @IsString()
  readonly neighborhood!: string;

  @IsString()
  readonly city!: string;

  @IsString()
  readonly state!: string;

  @IsString()
  readonly zipCode!: string;
}

export class CreateStorefrontOrderDto {
  @IsString()
  readonly customerName!: string;

  @IsEmail()
  readonly customerEmail!: string;

  @IsOptional()
  @IsString()
  readonly customerPhone?: string;

  @IsOptional()
  @IsString()
  readonly customerCpf?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  readonly shippingAddress?: ShippingAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  readonly items!: OrderItemDto[];
}
