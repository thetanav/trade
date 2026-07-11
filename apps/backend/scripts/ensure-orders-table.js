const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" serial PRIMARY KEY NOT NULL,
        "order_id" varchar(64) NOT NULL UNIQUE,
        "user_id" integer NOT NULL,
        "symbol" varchar(10) NOT NULL,
        "side" varchar(4) NOT NULL,
        "price" numeric DEFAULT '0' NOT NULL,
        "quantity" integer NOT NULL,
        "filled_quantity" integer DEFAULT 0 NOT NULL,
        "status" varchar(16) DEFAULT 'open' NOT NULL,
        "market" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders" ("user_id");
      CREATE INDEX IF NOT EXISTS "orders_user_status_idx" ON "orders" ("user_id", "status");
    `);
    console.log("orders table ready");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
