import { IsString, IsOptional, IsInt, IsBoolean } from "class-validator";
import { Type } from "class-transformer";

export class CreateCategoryDto {
  @IsString()
  readonly name!: string;

  @IsString()
  readonly slug!: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly slug?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  readonly active?: boolean;
}
