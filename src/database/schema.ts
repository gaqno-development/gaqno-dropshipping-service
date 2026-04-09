import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  numeric,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const productStatusEnum = pgEnum("ds_product_status", [
  "draft",
  "active",
  "inactive",
  "failed",
]);

export const orderStatusEnum = pgEnum("ds_order_status", [
  "payment_confirmed",
  "supplier_ordered",
  "processing",
  "shipped",
  "delivered",
  "supplier_error",
  "cancelled",
]);

export const syncLogActionEnum = pgEnum("ds_sync_log_action", [
  "product_fetch",
  "product_publish",
  "order_create",
  "order_status_update",
  "shopee_status_update",
  "webhook_received",
]);

export const products = pgTable(
  "ds_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aliexpressId: varchar("aliexpress_id", { length: 64 }).notNull(),
    shopeeItemId: varchar("shopee_item_id", { length: 64 }),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description"),
    imageUrls: text("image_urls"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 2 }).notNull(),
    sellingPriceBrl: numeric("selling_price_brl", { precision: 12, scale: 2 }).notNull(),
    exchangeRateUsed: numeric("exchange_rate_used", { precision: 8, scale: 4 }).notNull(),
    shopeeFeePct: numeric("shopee_fee_pct", { precision: 5, scale: 2 }).notNull(),
    profitMarginPct: numeric("profit_margin_pct", { precision: 5, scale: 2 }).notNull(),
    mappedVariations: jsonb("mapped_variations"),
    status: productStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    aliexpressIdx: index("ds_products_aliexpress_idx").on(t.aliexpressId),
    shopeeIdx: index("ds_products_shopee_idx").on(t.shopeeItemId),
    statusIdx: index("ds_products_status_idx").on(t.status),
  }),
);

export const orders = pgTable(
  "ds_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mpPaymentId: varchar("mp_payment_id", { length: 128 }).notNull(),
    mpExternalReference: varchar("mp_external_reference", { length: 255 }),
    aliexpressOrderId: varchar("aliexpress_order_id", { length: 128 }),
    shopeeOrderSn: varchar("shopee_order_sn", { length: 128 }),
    productId: uuid("product_id"),
    customerEmail: varchar("customer_email", { length: 255 }),
    totalBrl: numeric("total_brl", { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("payment_confirmed"),
    errorLog: text("error_log"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    mpPaymentIdx: index("ds_orders_mp_payment_idx").on(t.mpPaymentId),
    aliexpressIdx: index("ds_orders_aliexpress_idx").on(t.aliexpressOrderId),
    shopeeIdx: index("ds_orders_shopee_idx").on(t.shopeeOrderSn),
    statusIdx: index("ds_orders_status_idx").on(t.status),
  }),
);

export const syncLogs = pgTable(
  "ds_sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: syncLogActionEnum("action").notNull(),
    referenceId: varchar("reference_id", { length: 255 }).notNull(),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    success: varchar("success", { length: 5 }).notNull().default("true"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    actionIdx: index("ds_sync_logs_action_idx").on(t.action),
    referenceIdx: index("ds_sync_logs_reference_idx").on(t.referenceId),
    createdAtIdx: index("ds_sync_logs_created_at_idx").on(t.createdAt),
  }),
);
