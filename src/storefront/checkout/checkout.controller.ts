import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  HttpCode,
} from "@nestjs/common";
import { CheckoutService } from "./checkout.service.js";
import { CreateStorefrontOrderDto } from "./dto/create-order.dto.js";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto.js";

@Controller("storefront/orders")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @HttpCode(201)
  async createOrder(@Body() dto: CreateStorefrontOrderDto) {
    return this.checkoutService.createOrder(dto);
  }

  @Get(":id")
  async getOrder(@Param("id") id: string) {
    const order = await this.checkoutService.getOrderById(id);
    if (!order) throw new NotFoundException("Pedido não encontrado");
    return order;
  }

  @Post(":id/pay")
  @HttpCode(200)
  async initiatePayment(
    @Param("id") id: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.checkoutService.initiatePayment(id, dto.paymentMethod);
  }
}
