import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  eq,
  desc,
  asc,
  and,
  ilike,
  notInArray,
  count,
} from "drizzle-orm";
import { DatabaseService } from "../../database/db.service.js";
import {
  sfCategories,
  sfProducts,
  sfOrders,
  sfOrderItems,
  products,
  orders,
} from "../../database/schema.js";
import type { CreateCategoryDto, UpdateCategoryDto } from "./dto/create-category.dto.js";
import type {
  PublishStorefrontProductDto,
  UpdateStorefrontProductDto,
} from "./dto/publish-product.dto.js";

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async createCategory(dto: CreateCategoryDto) {
    const [cat] = await this.db
      .getDb()
      .insert(sfCategories)
      .values({
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();

    return cat;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.slug !== undefined) updates.slug = dto.slug;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.imageUrl !== undefined) updates.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) updates.active = dto.active;

    const [updated] = await this.db
      .getDb()
      .update(sfCategories)
      .set(updates)
      .where(eq(sfCategories.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Categoria não encontrada");
    return updated;
  }

  async deleteCategory(id: string) {
    const [updated] = await this.db
      .getDb()
      .update(sfCategories)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(sfCategories.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Categoria não encontrada");
    return updated;
  }

  async listAllProducts(query: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const conditions = [];

    if (query.search) {
      conditions.push(
        ilike(sfProducts.customTitle, `%${query.search}%`),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.limit;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .getDb()
        .select()
        .from(sfProducts)
        .where(where)
        .orderBy(desc(sfProducts.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.db
        .getDb()
        .select({ total: count() })
        .from(sfProducts)
        .where(where),
    ]);

    return {
      items,
      total: totalRow?.total ?? 0,
      page: query.page,
      limit: query.limit,
    };
  }

  async listImportableProducts() {
    const publishedIds = await this.db
      .getDb()
      .select({ dsProductId: sfProducts.dsProductId })
      .from(sfProducts);

    const ids = publishedIds.map((r) => r.dsProductId);

    if (ids.length === 0) {
      return this.db
        .getDb()
        .select()
        .from(products)
        .orderBy(desc(products.createdAt));
    }

    return this.db
      .getDb()
      .select()
      .from(products)
      .where(notInArray(products.id, ids))
      .orderBy(desc(products.createdAt));
  }

  async publishProduct(dto: PublishStorefrontProductDto) {
    const [dsProduct] = await this.db
      .getDb()
      .select()
      .from(products)
      .where(eq(products.id, dto.dsProductId))
      .limit(1);

    if (!dsProduct) {
      throw new BadRequestException("Produto importado não encontrado");
    }

    const [sfProduct] = await this.db
      .getDb()
      .insert(sfProducts)
      .values({
        dsProductId: dto.dsProductId,
        customTitle: dto.customTitle,
        customDescription: dto.customDescription ?? null,
        categoryId: dto.categoryId ?? null,
        sellingPriceBrl: String(dto.sellingPriceBrl),
        images: dto.images ?? [],
        variations: dto.variations ?? null,
        featured: dto.featured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        status: "draft",
      })
      .returning();

    return sfProduct;
  }

  async updateProduct(id: string, dto: UpdateStorefrontProductDto) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.customTitle !== undefined) updates.customTitle = dto.customTitle;
    if (dto.customDescription !== undefined)
      updates.customDescription = dto.customDescription;
    if (dto.categoryId !== undefined) updates.categoryId = dto.categoryId;
    if (dto.sellingPriceBrl !== undefined)
      updates.sellingPriceBrl = String(dto.sellingPriceBrl);
    if (dto.images !== undefined) updates.images = dto.images;
    if (dto.variations !== undefined) updates.variations = dto.variations;
    if (dto.featured !== undefined) updates.featured = dto.featured;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;

    const [updated] = await this.db
      .getDb()
      .update(sfProducts)
      .set(updates)
      .where(eq(sfProducts.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Produto não encontrado");
    return updated;
  }

  async updateProductStatus(
    id: string,
    status: "draft" | "published" | "archived",
  ) {
    const [updated] = await this.db
      .getDb()
      .update(sfProducts)
      .set({ status, updatedAt: new Date() })
      .where(eq(sfProducts.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Produto não encontrado");
    return updated;
  }

  async listOrders(query: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const conditions = [];

    if (query.status) {
      conditions.push(eq(sfOrders.status, query.status as never));
    }

    if (query.search) {
      conditions.push(
        ilike(sfOrders.customerEmail, `%${query.search}%`),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.limit;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .getDb()
        .select()
        .from(sfOrders)
        .where(where)
        .orderBy(desc(sfOrders.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.db
        .getDb()
        .select({ total: count() })
        .from(sfOrders)
        .where(where),
    ]);

    return {
      items,
      total: totalRow?.total ?? 0,
      page: query.page,
      limit: query.limit,
    };
  }

  async getOrderDetail(id: string) {
    const [order] = await this.db
      .getDb()
      .select()
      .from(sfOrders)
      .where(eq(sfOrders.id, id))
      .limit(1);

    if (!order) throw new NotFoundException("Pedido não encontrado");

    const items = await this.db
      .getDb()
      .select()
      .from(sfOrderItems)
      .where(eq(sfOrderItems.orderId, id));

    const dsOrders = await this.db
      .getDb()
      .select()
      .from(orders)
      .where(eq(orders.mpExternalReference, id));

    return { ...order, items, dsOrders };
  }
}
