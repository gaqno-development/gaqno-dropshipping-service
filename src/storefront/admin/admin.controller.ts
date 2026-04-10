import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { SessionGuard } from "../../auth/session.guard.js";
import { AdminService } from "./admin.service.js";
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from "./dto/create-category.dto.js";
import {
  PublishStorefrontProductDto,
  UpdateStorefrontProductDto,
  UpdateProductStatusDto,
} from "./dto/publish-product.dto.js";

@Controller("admin")
@UseGuards(SessionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("categories")
  @HttpCode(201)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Put("categories/:id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  async deleteCategory(@Param("id") id: string) {
    return this.adminService.deleteCategory(id);
  }

  @Get("products")
  async listProducts(
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.adminService.listAllProducts({
      search,
      page: Math.max(1, Number(page)),
      limit: Math.min(100, Math.max(1, Number(limit))),
    });
  }

  @Get("products/importable")
  async listImportableProducts() {
    return this.adminService.listImportableProducts();
  }

  @Post("products/publish")
  @HttpCode(201)
  async publishProduct(@Body() dto: PublishStorefrontProductDto) {
    return this.adminService.publishProduct(dto);
  }

  @Put("products/:id")
  async updateProduct(
    @Param("id") id: string,
    @Body() dto: UpdateStorefrontProductDto,
  ) {
    return this.adminService.updateProduct(id, dto);
  }

  @Patch("products/:id/status")
  async updateProductStatus(
    @Param("id") id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.adminService.updateProductStatus(id, dto.status);
  }

  @Get("orders")
  async listOrders(
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.adminService.listOrders({
      status,
      search,
      page: Math.max(1, Number(page)),
      limit: Math.min(100, Math.max(1, Number(limit))),
    });
  }

  @Get("orders/:id")
  async getOrderDetail(@Param("id") id: string) {
    return this.adminService.getOrderDetail(id);
  }
}
