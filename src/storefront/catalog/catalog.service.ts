import { Injectable } from "@nestjs/common";
import { eq, and, ilike, desc, asc, count } from "drizzle-orm";
import { DatabaseService } from "../../database/db.service.js";
import {
  sfCategories,
  sfProducts,
  sfOrderItems,
} from "../../database/schema.js";

export interface SampleProduct {
  id: string;
  customTitle: string;
  customDescription: string;
  sellingPriceBrl: number;
  images: string[];
  category: { id: string; name: string; slug: string } | null;
  featured: boolean;
  status: string;
  createdAt: string;
}

const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: "sample-1",
    customTitle: "Fone Bluetooth Kids Gato - Infantil Sem Fio",
    customDescription: "Fone de ouvido bluetooth infantil com design de gato, ideal para crianças. Sons seguros, bateria de longa duração e microfone integrado.",
    sellingPriceBrl: 89.90,
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"],
    category: { id: "cat-1", name: "Eletrônicos", slug: "eletronicos" },
    featured: true,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    customTitle: "Luminária LED Noturna RGB Inteligente",
    customDescription: "Luminária de mesa com controle remoto, várias cores, temporizador e controle por app. Perfeita para quarto ou ambiente infantil.",
    sellingPriceBrl: 129.90,
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500"],
    category: { id: "cat-1", name: "Eletrônicos", slug: "eletronicos" },
    featured: true,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-3",
    customTitle: "Organizador Cosmético Acrílico 360°",
    customDescription: "Porta-trecos giratório transparente para maquiagem e cosméticos. Organize seus produtos de beleza com estilo.",
    sellingPriceBrl: 79.90,
    images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500"],
    category: { id: "cat-3", name: "Beleza", slug: "beleza" },
    featured: true,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-4",
    customTitle: "Mala de Viagem 20kgABS Rigida",
    customDescription: "Mala de viagem rígida com rodas 360°, TSA lock,Compartimentos internos. Ideal para viagens nacionais e internacionais.",
    sellingPriceBrl: 299.90,
    images: ["https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=500"],
    category: { id: "cat-2", name: "Casa", slug: "casa" },
    featured: false,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-5",
    customTitle: "Boneca Pikachu Aprendiz Pokemon",
    customDescription: "Boneca plush Pikachu que aprende palavras e faz carinho. Educativa e divertida para crianças.",
    sellingPriceBrl: 159.90,
    images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500"],
    category: { id: "cat-4", name: "Brinquedos", slug: "brinquedos" },
    featured: true,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-6",
    customTitle: "Cabo USB-C 3 em 1 Carregamento Rápido",
    customDescription: "Cabo universal para iPhone, Android e USB-C. Carregamento rápido 100W, transferência de dados.",
    sellingPriceBrl: 49.90,
    images: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500"],
    category: { id: "cat-1", name: "Eletrônicos", slug: "eletronicos" },
    featured: false,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-7",
    customTitle: "Pulseira Esportiva Xiaomi Band 8",
    customDescription: "Smartband com tela AMOLED, monitoramento cardíaco, sono e exercícios. Resistente à água 5ATM.",
    sellingPriceBrl: 199.90,
    images: ["https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500"],
    category: { id: "cat-1", name: "Eletrônicos", slug: "eletronicos" },
    featured: true,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-8",
    customTitle: "Caixa Organizadora de Roupas S/napa",
    customDescription: "Caixa organizadora dobrável para armário. Mantenha suas roupas organizadas e protegidas da poeira.",
    sellingPriceBrl: 59.90,
    images: ["https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=500"],
    category: { id: "cat-2", name: "Casa", slug: "casa" },
    featured: false,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-9",
    customTitle: "Kit Manicure Profissional 24 Peças",
    customDescription: "Kit completo com alicates, cortadores, lixa e muito mais. Para uso profissional ou doméstico.",
    sellingPriceBrl: 69.90,
    images: ["https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500"],
    category: { id: "cat-3", name: "Beleza", slug: "beleza" },
    featured: false,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-10",
    customTitle: "Quebra-Cabeça 1000 Peças Paisagem",
    customDescription: "Quebra-cabeça premium com 1000 peças. Alta qualidade de impressão, desafio para todas as idades.",
    sellingPriceBrl: 89.90,
    images: ["https://images.unsplash.com/photo-1494059980473-813e73ee784b?w=500"],
    category: { id: "cat-4", name: "Brinquedos", slug: "brinquedos" },
    featured: true,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-11",
    customTitle: "Carregador Portátil 20000mAh Power Bank",
    customDescription: "Bateria externa com 2 saídas USB e 1 Type-C. Carrega até 4 vezes seu celular.",
    sellingPriceBrl: 119.90,
    images: ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500"],
    category: { id: "cat-1", name: "Eletrônicos", slug: "eletronicos" },
    featured: false,
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-12",
    customTitle: "Tênis Esportivo Casual Confortável",
    customDescription: "Tênis masculino casual com sola antiderrapante. Leve, confortável e moderno para o dia a dia.",
    sellingPriceBrl: 159.90,
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"],
    category: { id: "cat-5", name: "Esportes", slug: "esportes" },
    featured: false,
    status: "published",
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_CATEGORIES = [
  { id: "cat-1", name: "Eletrônicos", slug: "eletronicos", active: true },
  { id: "cat-2", name: "Casa", slug: "casa", active: true },
  { id: "cat-3", name: "Beleza", slug: "beleza", active: true },
  { id: "cat-4", name: "Brinquedos", slug: "brinquedos", active: true },
  { id: "cat-5", name: "Esportes", slug: "esportes", active: true },
];

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}

  async listActiveCategories() {
    const dbCategories = await this.db
      .getDb()
      .select()
      .from(sfCategories)
      .where(eq(sfCategories.active, true))
      .orderBy(asc(sfCategories.sortOrder), asc(sfCategories.name));

    if (dbCategories.length === 0) {
      return SAMPLE_CATEGORIES;
    }

    return dbCategories;
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

    if (category) return category;

    return SAMPLE_CATEGORIES.find(c => c.slug === slug) ?? null;
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

    if (items.length === 0 && query.page === 1) {
      const filtered = SAMPLE_PRODUCTS.filter(p => {
        if (query.categoryId && p.category?.id !== query.categoryId) return false;
        if (query.search && !p.customTitle.toLowerCase().includes(query.search.toLowerCase())) return false;
        return true;
      });

      const start = 0;
      const paginated = filtered.slice(start, query.limit);

      return {
        items: paginated,
        total: filtered.length,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(filtered.length / query.limit),
      };
    }

    return {
      items,
      total: totalRow?.total ?? 0,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil((totalRow?.total ?? 0) / query.limit),
    };
  }

  async getFeaturedProducts() {
    const featured = await this.db
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

    if (featured.length === 0) {
      return SAMPLE_PRODUCTS.filter(p => p.featured);
    }

    return featured;
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

    if (!product) {
      const sample = SAMPLE_PRODUCTS.find(p => p.id === id);
      return sample ?? null;
    }

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

  getSampleProducts() {
    return SAMPLE_PRODUCTS;
  }

  getSampleCategories() {
    return SAMPLE_CATEGORIES;
  }
}
