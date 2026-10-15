import { NextResponse } from "next/server";
import { Contract, JsonRpcProvider, ZeroAddress } from "ethers";
import { ARCDEX_FACTORY_ABI, ARCDEX_PAIR_ABI, ERC20_ABI } from "@/lib/arcdex";
import { ARC_MAINNET, FACTORY_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/arc";

const DISPLAY_DECIMALS = 18;

function normalizeUsdc(raw: bigint): bigint {
  return raw * 10n ** BigInt(DISPLAY_DECIMALS - USDC_DECIMALS);
}

async function fetchArcDexTokens() {
  const provider = new JsonRpcProvider(
    process.env.ARC_RPC_URL || ARC_MAINNET.rpcUrl,
    ARC_MAINNET.chainId,
  );
  const factory = new Contract(FACTORY_ADDRESS, ARCDEX_FACTORY_ABI, provider);
  const pairCount = Math.min(Number(await factory.allPairsLength()), 100);

  const tokens = await Promise.all(Array.from({ length: pairCount }, async (_, index) => {
    const pairAddress = String(await factory.allPairs(index));
    const pair = new Contract(pairAddress, ARCDEX_PAIR_ABI, provider);
    const [token0, token1, reserves] = await Promise.all([
      pair.token0() as Promise<string>,
      pair.token1() as Promise<string>,
      pair.getReserves() as Promise<[bigint, bigint, number]>,
    ]);
    const usdcIsToken0 = token0.toLowerCase() === USDC_ADDRESS.toLowerCase();
    const usdcIsToken1 = token1.toLowerCase() === USDC_ADDRESS.toLowerCase();
    if (!usdcIsToken0 && !usdcIsToken1) return null;

    const tokenAddress = usdcIsToken0 ? token1 : token0;
    const token = new Contract(tokenAddress, ERC20_ABI, provider);
    const [name, symbol, decimals] = await Promise.all([
      token.name() as Promise<string>,
      token.symbol() as Promise<string>,
      token.decimals() as Promise<bigint>,
    ]);
    const usdcReserve = usdcIsToken0 ? reserves[0] : reserves[1];
    const tokenReserve = usdcIsToken0 ? reserves[1] : reserves[0];

    return {
      address: tokenAddress,
      name,
      symbol,
      creator: ZeroAddress,
      decimals: Number(decimals),
      icon_uri: "",
      project_uri: "",
      pool_address: pairAddress,
      pool_stats: {
        hbar_reserves: normalizeUsdc(usdcReserve).toString(),
        token_reserves: tokenReserve.toString(),
        total_volume: "0",
        trade_count: 0,
        is_graduated: true,
        dex_pool_addr: pairAddress,
      },
      _count: { trades: 0 },
    };
  }));

  return tokens.filter((token) => token !== null);
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await fetchArcDexTokens(), source: "arc-dex" });
  } catch (error) {
    console.error("ArcDEX token discovery failed", error);
    return NextResponse.json({ success: false, error: "Failed to read ArcDEX pairs" }, { status: 502 });
  }
}
