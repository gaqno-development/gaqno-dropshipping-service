import { IsString, IsNotEmpty, IsUrl } from "class-validator";

export class ImportProductDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  readonly url!: string;
}
