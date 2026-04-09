import { IsOptional, IsString } from "class-validator";

export class WebhookPayloadDto {
  @IsString()
  @IsOptional()
  readonly action?: string;

  @IsOptional()
  readonly data?: { readonly id?: string };

  @IsString()
  @IsOptional()
  readonly type?: string;

  @IsString()
  @IsOptional()
  readonly topic?: string;

  @IsString()
  @IsOptional()
  readonly resource?: string;
}

export type MpPaymentStatus =
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

export interface MpPaymentInfo {
  readonly status: MpPaymentStatus;
  readonly statusDetail: string | null;
  readonly externalReference: string | null;
  readonly transactionAmount: number | null;
  readonly payerEmail: string | null;
}
