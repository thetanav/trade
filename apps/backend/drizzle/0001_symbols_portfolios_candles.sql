CREATE TABLE IF NOT EXISTS "symbols" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "symbols_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"quantity" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"open" numeric NOT NULL,
	"high" numeric NOT NULL,
	"low" numeric NOT NULL,
	"close" numeric NOT NULL,
	"volume" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "symbol" varchar(10) DEFAULT 'TNV';
--> statement-breakpoint
INSERT INTO "symbols" ("symbol", "name") VALUES ('TNV', 'Tenacity Ventures'), ('AAPL', 'Apple Inc.'), ('GOOGL', 'Alphabet Inc.'), ('MSFT', 'Microsoft Corp.'), ('TSLA', 'Tesla Inc.') ON CONFLICT ("symbol") DO NOTHING;
--> statement-breakpoint
-- Migrate existing user stock to portfolios
INSERT INTO "portfolios" ("user_id", "symbol", "quantity") SELECT "id", 'TNV', COALESCE("stock", 0) FROM "users" ON CONFLICT DO NOTHING;
