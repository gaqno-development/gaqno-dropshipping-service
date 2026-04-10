import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { DatabaseService } from "../database/db.service.js";
import { orders } from "../database/schema.js";

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    return this.db
      .getDb()
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
  }

  async getById(id: string) {
    const [order] = await this.db
      .getDb()
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) throw new NotFoundException("Pedido não encontrado");
    return order;
  }
}
