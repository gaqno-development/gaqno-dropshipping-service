-- Dropshipping Service Migrations
-- Run on database: gaqno_dropshipping_db

-- Enums
DO $$ BEGIN
  CREATE TYPE ds_product_status AS ENUM ('draft', 'active', 'inactive', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ds_order_status AS ENUM ('payment_confirmed', 'supplier_ordered', 'processing', 'shipped', 'delivered', 'supplier_error', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ds_sync_log_action AS ENUM ('product_fetch', 'product_publish', 'order_create', 'order_status_update', 'shopee_status_update', 'webhook_received');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sf_product_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sf_order_status AS ENUM ('pending', 'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sf_payment_method AS ENUM ('pix', 'checkout_pro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ds_products table
CREATE TABLE IF NOT EXISTS ds_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  aliexpress_id VARCHAR(64) NOT NULL,
  shopee_item_id VARCHAR(64),
  title VARCHAR(512) NOT NULL,
  description TEXT,
  image_urls TEXT,
  cost_usd NUMERIC(12,2) NOT NULL,
  selling_price_brl NUMERIC(12,2) NOT NULL,
  exchange_rate_used NUMERIC(8,4) NOT NULL,
  shopee_fee_pct NUMERIC(5,2) NOT NULL,
  profit_margin_pct NUMERIC(5,2) NOT NULL,
  mapped_variations JSONB,
  status ds_product_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ds_orders table
CREATE TABLE IF NOT EXISTS ds_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  mp_payment_id VARCHAR(128) NOT NULL,
  mp_external_reference VARCHAR(255),
  aliexpress_order_id VARCHAR(128),
  shopee_order_sn VARCHAR(128),
  product_id UUID,
  customer_email VARCHAR(255),
  total_brl NUMERIC(12,2) NOT NULL,
  status ds_order_status NOT NULL DEFAULT 'payment_confirmed',
  error_log TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ds_sync_logs table
CREATE TABLE IF NOT EXISTS ds_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  action ds_sync_log_action NOT NULL,
  reference_id VARCHAR(255) NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  success VARCHAR(5) NOT NULL DEFAULT 'true',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- sf_categories table
CREATE TABLE IF NOT EXISTS sf_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- sf_products table
CREATE TABLE IF NOT EXISTS sf_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  ds_product_id UUID NOT NULL,
  custom_title VARCHAR(512) NOT NULL,
  custom_description TEXT,
  category_id UUID REFERENCES sf_categories(id),
  selling_price_brl NUMERIC(12,2) NOT NULL,
  images JSONB DEFAULT '[]',
  variations JSONB,
  status sf_product_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- sf_orders table
CREATE TABLE IF NOT EXISTS sf_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(32),
  customer_cpf VARCHAR(14),
  shipping_address JSONB,
  subtotal_brl NUMERIC(12,2) NOT NULL,
  shipping_brl NUMERIC(12,2) NOT NULL DEFAULT '0',
  total_brl NUMERIC(12,2) NOT NULL,
  payment_method sf_payment_method,
  mp_payment_id VARCHAR(128),
  mp_preference_id VARCHAR(128),
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_expires_at TIMESTAMP,
  init_point TEXT,
  status sf_order_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- sf_order_items table
CREATE TABLE IF NOT EXISTS sf_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  order_id UUID NOT NULL REFERENCES sf_orders(id) ON DELETE CASCADE,
  sf_product_id UUID NOT NULL REFERENCES sf_products(id),
  quantity INTEGER NOT NULL,
  unit_price_brl NUMERIC(12,2) NOT NULL,
  variation_label VARCHAR(255),
  subtotal_brl NUMERIC(12,2) NOT NULL
);

-- outbox table
CREATE TABLE IF NOT EXISTS "outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "topic" text NOT NULL,
  "message_key" text NOT NULL,
  "message_value" text NOT NULL,
  "org_id" text NOT NULL,
  "event_id" text NOT NULL,
  "correlation_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone
);

-- Indexes for ds_
CREATE INDEX IF NOT EXISTS ds_products_aliexpress_idx ON ds_products(aliexpress_id);
CREATE INDEX IF NOT EXISTS ds_products_shopee_idx ON ds_products(shopee_item_id);
CREATE INDEX IF NOT EXISTS ds_products_status_idx ON ds_products(status);
CREATE INDEX IF NOT EXISTS ds_orders_mp_payment_idx ON ds_orders(mp_payment_id);
CREATE INDEX IF NOT EXISTS ds_orders_aliexpress_idx ON ds_orders(aliexpress_order_id);
CREATE INDEX IF NOT EXISTS ds_orders_shopee_idx ON ds_orders(shopee_order_sn);
CREATE INDEX IF NOT EXISTS ds_orders_status_idx ON ds_orders(status);
CREATE INDEX IF NOT EXISTS ds_sync_logs_action_idx ON ds_sync_logs(action);
CREATE INDEX IF NOT EXISTS ds_sync_logs_reference_idx ON ds_sync_logs(reference_id);
CREATE INDEX IF NOT EXISTS ds_sync_logs_created_at_idx ON ds_sync_logs(created_at);

-- Indexes for sf_
CREATE INDEX IF NOT EXISTS sf_categories_slug_idx ON sf_categories(slug);
CREATE INDEX IF NOT EXISTS sf_categories_active_idx ON sf_categories(active);
CREATE INDEX IF NOT EXISTS sf_products_ds_product_idx ON sf_products(ds_product_id);
CREATE INDEX IF NOT EXISTS sf_products_category_idx ON sf_products(category_id);
CREATE INDEX IF NOT EXISTS sf_products_status_idx ON sf_products(status);
CREATE INDEX IF NOT EXISTS sf_products_featured_idx ON sf_products(featured);
CREATE INDEX IF NOT EXISTS sf_orders_mp_payment_idx ON sf_orders(mp_payment_id);
CREATE INDEX IF NOT EXISTS sf_orders_status_idx ON sf_orders(status);
CREATE INDEX IF NOT EXISTS sf_orders_email_idx ON sf_orders(customer_email);
CREATE INDEX IF NOT EXISTS sf_orders_created_at_idx ON sf_orders(created_at);
CREATE INDEX IF NOT EXISTS sf_order_items_order_idx ON sf_order_items(order_id);
CREATE INDEX IF NOT EXISTS sf_order_items_product_idx ON sf_order_items(sf_product_id);

-- Outbox index
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON "outbox" ("published_at", "created_at");