import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";
import { ListProductsQueryDto } from "./dto/catalog-query.dto.js";

@Controller("storefront")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("categories")
  async listCategories() {
    return this.catalogService.listActiveCategories();
  }

  @Get("categories/:slug")
  async getCategoryBySlug(
    @Param("slug") slug: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const result = await this.catalogService.getProductsByCategorySlug(
      slug,
      Math.max(1, Number(page)),
      Math.min(100, Math.max(1, Number(limit))),
    );

    if (!result) throw new NotFoundException("Categoria não encontrada");
    return result;
  }

  @Get("products/featured")
  async getFeaturedProducts() {
    return this.catalogService.getFeaturedProducts();
  }

  @Get("products")
  async listProducts(@Query() query: ListProductsQueryDto) {
    return this.catalogService.listPublishedProducts({
      categoryId: query.categoryId,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get("products/:id")
  async getProductById(@Param("id") id: string) {
    const product = await this.catalogService.getProductById(id);
    if (!product) throw new NotFoundException("Produto não encontrado");
    return product;
  }
}
