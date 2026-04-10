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
  integer,
  boolean,
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

export const sfProductStatusEnum = pgEnum("sf_product_status", [
  "draft",
  "published",
  "archived",
]);

export const sfOrderStatusEnum = pgEnum("sf_order_status", [
  "pending",
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const sfPaymentMethodEnum = pgEnum("sf_payment_method", [
  "pix",
  "checkout_pro",
]);

export const sfCategories = pgTable(
  "sf_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: index("sf_categories_slug_idx").on(t.slug),
    activeIdx: index("sf_categories_active_idx").on(t.active),
  }),
);

export const sfProducts = pgTable(
  "sf_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dsProductId: uuid("ds_product_id")
      .notNull()
      .references(() => products.id),
    customTitle: varchar("custom_title", { length: 512 }).notNull(),
    customDescription: text("custom_description"),
    categoryId: uuid("category_id").references(() => sfCategories.id),
    sellingPriceBrl: numeric("selling_price_brl", {
      precision: 12,
      scale: 2,
    }).notNull(),
    images: jsonb("images").$type<string[]>().default([]),
    variations: jsonb("variations"),
    status: sfProductStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    dsProductIdx: index("sf_products_ds_product_idx").on(t.dsProductId),
    categoryIdx: index("sf_products_category_idx").on(t.categoryId),
    statusIdx: index("sf_products_status_idx").on(t.status),
    featuredIdx: index("sf_products_featured_idx").on(t.featured),
  }),
);

export const sfOrders = pgTable(
  "sf_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 32 }),
    customerCpf: varchar("customer_cpf", { length: 14 }),
    shippingAddress: jsonb("shipping_address"),
    subtotalBrl: numeric("subtotal_brl", {
      precision: 12,
      scale: 2,
    }).notNull(),
    shippingBrl: numeric("shipping_brl", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalBrl: numeric("total_brl", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: sfPaymentMethodEnum("payment_method"),
    mpPaymentId: varchar("mp_payment_id", { length: 128 }),
    mpPreferenceId: varchar("mp_preference_id", { length: 128 }),
    pixQrCode: text("pix_qr_code"),
    pixCopyPaste: text("pix_copy_paste"),
    pixExpiresAt: timestamp("pix_expires_at"),
    initPoint: text("init_point"),
    status: sfOrderStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    mpPaymentIdx: index("sf_orders_mp_payment_idx").on(t.mpPaymentId),
    statusIdx: index("sf_orders_status_idx").on(t.status),
    emailIdx: index("sf_orders_email_idx").on(t.customerEmail),
    createdAtIdx: index("sf_orders_created_at_idx").on(t.createdAt),
  }),
);

export const sfOrderItems = pgTable(
  "sf_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => sfOrders.id, { onDelete: "cascade" }),
    sfProductId: uuid("sf_product_id")
      .notNull()
      .references(() => sfProducts.id),
    quantity: integer("quantity").notNull(),
    unitPriceBrl: numeric("unit_price_brl", {
      precision: 12,
      scale: 2,
    }).notNull(),
    variationLabel: varchar("variation_label", { length: 255 }),
    subtotalBrl: numeric("subtotal_brl", {
      precision: 12,
      scale: 2,
    }).notNull(),
  },
  (t) => ({
    orderIdx: index("sf_order_items_order_idx").on(t.orderId),
    productIdx: index("sf_order_items_product_idx").on(t.sfProductId),
  }),
);
