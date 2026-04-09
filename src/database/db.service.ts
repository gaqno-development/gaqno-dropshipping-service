import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  public db!: NodePgDatabase<typeof schema>;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const connectionString = this.config.get<string>("DATABASE_URL");
    if (!connectionString) {
      throw new Error("DATABASE_URL is not defined");
    }

    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  getDb(): NodePgDatabase<typeof schema> {
    return this.db;
  }

  getPool(): Pool {
    return this.pool;
  }
}
