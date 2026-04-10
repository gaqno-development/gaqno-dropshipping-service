import { Controller, Get, Param } from "@nestjs/common";
import { OrdersService } from "./orders.service.js";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list() {
    return this.ordersService.list();
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.ordersService.getById(id);
  }
}
