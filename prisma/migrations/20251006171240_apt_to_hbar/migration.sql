/*
  Warnings:

  - You are about to drop the column `apt_reserves` on the `PoolStats` table. All the data in the column will be lost.
  - You are about to drop the column `apt_amount` on the `Trade` table. All the data in the column will be lost.
  - Added the required column `hbar_reserves` to the `PoolStats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hbar_amount` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."PoolStats" DROP COLUMN "apt_reserves",
ADD COLUMN     "hbar_reserves" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Trade" DROP COLUMN "apt_amount",
ADD COLUMN     "hbar_amount" DECIMAL(65,30) NOT NULL;
