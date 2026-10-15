ALTER TABLE "FA" ADD COLUMN IF NOT EXISTS "pool_address" TEXT;
ALTER TABLE "FA" ALTER COLUMN "decimals" SET DEFAULT 18;
ALTER TABLE "FA" ALTER COLUMN "max_supply" TYPE TEXT USING "max_supply"::TEXT;
ALTER TABLE "FA" ALTER COLUMN "mint_fee_per_unit" TYPE TEXT USING "mint_fee_per_unit"::TEXT;

ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "log_index" INTEGER NOT NULL DEFAULT 0;
DROP INDEX IF EXISTS "Trade_transaction_hash_key";
ALTER TABLE "Trade" ALTER COLUMN "hbar_amount" TYPE TEXT USING "hbar_amount"::TEXT;
ALTER TABLE "Trade" ALTER COLUMN "token_amount" TYPE TEXT USING "token_amount"::TEXT;
ALTER TABLE "Trade" ALTER COLUMN "price_per_token" TYPE TEXT USING "price_per_token"::TEXT;
ALTER TABLE "Trade" ALTER COLUMN "fee_amount" TYPE TEXT USING "fee_amount"::TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Trade_transaction_hash_log_index_key" ON "Trade"("transaction_hash", "log_index");
CREATE INDEX IF NOT EXISTS "Trade_fa_address_created_at_idx" ON "Trade"("fa_address", "created_at");

ALTER TABLE "PoolStats" ADD COLUMN IF NOT EXISTS "token_reserves" TEXT NOT NULL DEFAULT '0';
ALTER TABLE "PoolStats" ALTER COLUMN "hbar_reserves" TYPE TEXT USING "hbar_reserves"::TEXT;
ALTER TABLE "PoolStats" ALTER COLUMN "total_volume" TYPE TEXT USING "total_volume"::TEXT;
ALTER TABLE "PoolStats" ALTER COLUMN "graduation_threshold" TYPE TEXT USING "graduation_threshold"::TEXT;
ALTER TABLE "PoolStats" ALTER COLUMN "graduation_threshold" SET DEFAULT '0';

ALTER TABLE "FAEvent" ADD COLUMN IF NOT EXISTS "log_index" INTEGER NOT NULL DEFAULT 0;
WITH ranked_events AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "transaction_hash" ORDER BY "created_at", "id") - 1 AS inferred_log_index
  FROM "FAEvent"
)
UPDATE "FAEvent" event
SET "log_index" = ranked_events.inferred_log_index
FROM ranked_events
WHERE event."id" = ranked_events."id";
CREATE UNIQUE INDEX IF NOT EXISTS "FAEvent_transaction_hash_log_index_key" ON "FAEvent"("transaction_hash", "log_index");

ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SELL_TOKENS';

ALTER TABLE "TokenSnapshot" ALTER COLUMN "priceUsd" TYPE TEXT USING "priceUsd"::TEXT;
ALTER TABLE "TokenSnapshot" ALTER COLUMN "priceHbar" TYPE TEXT USING "priceHbar"::TEXT;
ALTER TABLE "TokenSnapshot" ALTER COLUMN "hbarPriceUsd" TYPE TEXT USING "hbarPriceUsd"::TEXT;
ALTER TABLE "TokenSnapshot" ALTER COLUMN "reservesHbar" TYPE TEXT USING "reservesHbar"::TEXT;
ALTER TABLE "TokenSnapshot" ALTER COLUMN "reservesToken" TYPE TEXT USING "reservesToken"::TEXT;

CREATE TABLE IF NOT EXISTS "IndexerState" (
  "id" TEXT PRIMARY KEY,
  "blockNumber" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
