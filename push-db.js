try { require("dotenv").config(); } catch {}
const { Pool } = require("pg");

let PushDbReporter;
try {
  ({ PushDbReporter } = require("../push-db-utils"));
} catch {}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();

  const reporter = PushDbReporter
    ? new PushDbReporter("Dropshipping Service", client, connectionString)
    : null;

  try {
    if (reporter) {
      await reporter.init();
      await reporter.printHeader();
      console.log("  \x1b[1mExisting tables:\x1b[0m");
      await reporter.printExistingTables("ds_");
      await reporter.printLastMigration();
      console.log("  \x1b[1mRunning migrations:\x1b[0m");
    } else {
      console.log("Creating Dropshipping service tables (idempotent, no drops)...");
    }

    const run = reporter
      ? (name, fn) => reporter.step(name, fn)
      : async (name, fn) => {
          await fn();
          console.log(`  ${name}`);
        };

    await run("Create DS enums", async () => {
      await client.query(`
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
      `);
    });

    await run("Create ds_products table", async () => {
      await client.query(`
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
      `);
    });

    await run("Create ds_orders table", async () => {
      await client.query(`
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
      `);
    });

    await run("Create ds_sync_logs table", async () => {
      await client.query(`
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
      `);
    });

    await run("Create outbox table", async () => {
      await client.query(`
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
        CREATE INDEX IF NOT EXISTS "outbox_unpublished_idx" ON "outbox" ("published_at", "created_at");
      `);
    });

    await run("Create DS indexes", async () => {
      await client.query(`
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
      `);
    });

    if (reporter) {
      await reporter.printSummary(["ds_", "outbox"]);
    } else {
      console.log("\nDropshipping service schema ensured successfully!");
    }
  } catch (err) {
    console.error("Error ensuring schema:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
