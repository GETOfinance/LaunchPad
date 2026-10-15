-- CreateTable
CREATE TABLE "public"."TokenSnapshot" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "pool" TEXT NOT NULL,
    "priceUsd" DECIMAL(65,30) NOT NULL,
    "priceHbar" DECIMAL(65,30) NOT NULL,
    "hbarPriceUsd" DECIMAL(65,30) NOT NULL,
    "reservesHbar" DECIMAL(65,30),
    "reservesToken" DECIMAL(65,30),
    "blockNumber" INTEGER NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenSnapshot_token_createdAt_idx" ON "public"."TokenSnapshot"("token", "createdAt");

-- CreateIndex
CREATE INDEX "TokenSnapshot_pool_createdAt_idx" ON "public"."TokenSnapshot"("pool", "createdAt");
