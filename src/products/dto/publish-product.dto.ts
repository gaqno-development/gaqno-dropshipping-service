import { IsString, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class PublishProductDto {
  @IsString()
  @IsNotEmpty()
  readonly productId!: string;

  @IsNumber()
  @IsOptional()
  readonly categoryId?: number;

  @IsNumber()
  @IsOptional()
  readonly overridePrice?: number;
}
