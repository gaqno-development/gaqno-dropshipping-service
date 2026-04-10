import { IsIn, IsString } from "class-validator";

export class InitiatePaymentDto {
  @IsString()
  @IsIn(["pix", "checkout_pro"])
  readonly paymentMethod!: "pix" | "checkout_pro";
}
