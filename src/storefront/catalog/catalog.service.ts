import { Injectable } from "@nestjs/common";
import { eq, and, ilike, desc, asc, sql, count } from "drizzle-orm";
import { DatabaseService } from "../../database/db.service.js";
import {
  sfCategories,
  sfProducts,
  sfOrderItems,
} from "../../database/schema.js";

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}

  async listActiveCategories() {
    return this.db
      .getDb()
      .select()
      .from(sfCategories)
      .where(eq(sfCategories.active, true))
      .orderBy(asc(sfCategories.sortOrder), asc(sfCategories.name));
  }

  async getCategoryBySlug(slug: string) {
    const [category] = await this.db
      .getDb()
      .select()
      .from(sfCategories)
      .where(
        and(eq(sfCategories.slug, slug), eq(sfCategories.active, true)),
      )
      .limit(1);

    return category ?? null;
  }

  async listPublishedProducts(query: {
    categoryId?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const conditions = [eq(sfProducts.status, "published")];

    if (query.categoryId) {
      conditions.push(eq(sfProducts.categoryId, query.categoryId));
    }

    if (query.search) {
      conditions.push(
        ilike(sfProducts.customTitle, `%${query.search}%`),
      );
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.limit;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .getDb()
        .select()
        .from(sfProducts)
        .where(where)
        .orderBy(asc(sfProducts.sortOrder), desc(sfProducts.createdAt))
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
      totalPages: Math.ceil((totalRow?.total ?? 0) / query.limit),
    };
  }

  async getFeaturedProducts() {
    return this.db
      .getDb()
      .select()
      .from(sfProducts)
      .where(
        and(
          eq(sfProducts.status, "published"),
          eq(sfProducts.featured, true),
        ),
      )
      .orderBy(asc(sfProducts.sortOrder))
      .limit(12);
  }

  async getProductById(id: string) {
    const [product] = await this.db
      .getDb()
      .select()
      .from(sfProducts)
      .where(
        and(eq(sfProducts.id, id), eq(sfProducts.status, "published")),
      )
      .limit(1);

    if (!product) return null;

    let category = null;
    if (product.categoryId) {
      const [cat] = await this.db
        .getDb()
        .select()
        .from(sfCategories)
        .where(eq(sfCategories.id, product.categoryId))
        .limit(1);
      category = cat ?? null;
    }

    return { ...product, category };
  }

  async getProductsByCategorySlug(
    slug: string,
    page: number,
    limit: number,
  ) {
    const category = await this.getCategoryBySlug(slug);
    if (!category) return null;

    const result = await this.listPublishedProducts({
      categoryId: category.id,
      page,
      limit,
    });

    return { category, ...result };
  }
}
