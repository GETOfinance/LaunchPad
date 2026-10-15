import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedCron } from "@/lib/api";

const MAX_TOKENS = 25;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  const rawTokens = request.nextUrl.searchParams.get("tokens");
  if (!rawTokens) return NextResponse.json({ success: false, error: "tokens parameter required" }, { status: 400 });
  const tokens = [...new Set(rawTokens.split(",").map((value) => value.trim().toLowerCase()).filter((value) => /^0x[a-f0-9]{40}$/.test(value)))];
  if (tokens.length === 0 || tokens.length > MAX_TOKENS) {
    return NextResponse.json({ success: false, error: `provide 1-${MAX_TOKENS} valid token addresses` }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1_000);
  const data = await Promise.all(tokens.map(async (token) => {
    const [latest, old, tokenRow, trades] = await Promise.all([
      prisma.tokenSnapshot.findFirst({ where: { token }, orderBy: { createdAt: "desc" } }),
      prisma.tokenSnapshot.findFirst({ where: { token, createdAt: { lte: cutoff } }, orderBy: { createdAt: "desc" } }),
      prisma.fA.findUnique({ where: { address: token }, include: { pool_stats: true } }),
      prisma.trade.findMany({ where: { fa_address: token, created_at: { gte: cutoff } }, select: { hbar_amount: true }, take: 10_000 }),
    ]);
    if (!tokenRow) return { token, error: "not indexed" };
    const current = BigInt(latest?.priceHbar || "0");
    const previous = BigInt(old?.priceHbar || "0");
    const changeBps = previous === 0n ? 0n : ((current - previous) * 10_000n) / previous;
    const volume24hRaw = trades.reduce((sum, trade) => sum + BigInt(trade.hbar_amount), 0n);
    return { token, pool: tokenRow.pool_address, currentPriceRaw: current.toString(), priceChangeBps: changeBps.toString(), volume24hRaw: volume24hRaw.toString(), reservesNativeRaw: tokenRow.pool_stats?.hbar_reserves || "0", reservesTokenRaw: tokenRow.pool_stats?.token_reserves || "0", snapshotAt: latest?.createdAt || null };
  }));
  return NextResponse.json({ success: true, data });
}
