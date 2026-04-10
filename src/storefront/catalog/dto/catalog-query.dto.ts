import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class ListProductsQueryDto {
  @IsOptional()
  @IsString()
  readonly categoryId?: string;

  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number = 20;
}
