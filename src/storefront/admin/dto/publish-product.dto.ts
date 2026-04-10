import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";

export class PublishStorefrontProductDto {
  @IsString()
  readonly dsProductId!: string;

  @IsString()
  readonly customTitle!: string;

  @IsOptional()
  @IsString()
  readonly customDescription?: string;

  @IsOptional()
  @IsString()
  readonly categoryId?: string;

  @Type(() => Number)
  @IsNumber()
  readonly sellingPriceBrl!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly images?: string[];

  @IsOptional()
  readonly variations?: unknown;

  @IsOptional()
  @IsBoolean()
  readonly featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly sortOrder?: number;
}

export class UpdateStorefrontProductDto {
  @IsOptional()
  @IsString()
  readonly customTitle?: string;

  @IsOptional()
  @IsString()
  readonly customDescription?: string;

  @IsOptional()
  @IsString()
  readonly categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly sellingPriceBrl?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly images?: string[];

  @IsOptional()
  readonly variations?: unknown;

  @IsOptional()
  @IsBoolean()
  readonly featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly sortOrder?: number;
}

export class UpdateProductStatusDto {
  @IsString()
  @IsIn(["draft", "published", "archived"])
  readonly status!: "draft" | "published" | "archived";
}
