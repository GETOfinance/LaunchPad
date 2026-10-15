import { NextRequest, NextResponse } from "next/server";
import { Contract, getAddress, JsonRpcProvider, ZeroAddress } from "ethers";
import { ARCDEX_FACTORY_ABI, ARCDEX_PAIR_ABI, ERC20_ABI } from "@/lib/arcdex";
import { ARC_MAINNET, FACTORY_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/arc";

const DISPLAY_DECIMALS = 18;
const normalizeUsdc = (raw: bigint) => raw * 10n ** BigInt(DISPLAY_DECIMALS - USDC_DECIMALS);

async function readArcDexToken(address: string) {
  const tokenAddress = getAddress(address);
  const provider = new JsonRpcProvider(
    process.env.ARC_RPC_URL || ARC_MAINNET.rpcUrl,
    ARC_MAINNET.chainId,
  );
  const factory = new Contract(FACTORY_ADDRESS, ARCDEX_FACTORY_ABI, provider);
  const pairAddress = String(await factory.getPair(USDC_ADDRESS, tokenAddress));
  if (pairAddress === ZeroAddress) return null;

  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  const pair = new Contract(pairAddress, ARCDEX_PAIR_ABI, provider);
  const [name, symbol, decimals, token0, reserves] = await Promise.all([
    token.name() as Promise<string>,
    token.symbol() as Promise<string>,
    token.decimals() as Promise<bigint>,
    pair.token0() as Promise<string>,
    pair.getReserves() as Promise<[bigint, bigint, number]>,
  ]);
  const usdcIsToken0 = token0.toLowerCase() === USDC_ADDRESS.toLowerCase();
  const usdcReserve = usdcIsToken0 ? reserves[0] : reserves[1];
  const tokenReserve = usdcIsToken0 ? reserves[1] : reserves[0];

  return {
    address: tokenAddress,
    name,
    symbol,
    creator: ZeroAddress,
    decimals: Number(decimals),
    max_supply: null,
    icon_uri: null,
    project_uri: null,
    mint_fee_per_unit: "0",
    created_at: new Date().toISOString(),
    pool_address: pairAddress,
    pool_stats: {
      fa_address: tokenAddress,
      hbar_reserves: normalizeUsdc(usdcReserve).toString(),
      token_reserves: tokenReserve.toString(),
      total_volume: "0",
      trade_count: 0,
      is_graduated: true,
      graduation_threshold: "0",
      dex_pool_addr: pairAddress,
    },
    trades: [],
    volume_24h: "0",
    trade_count_24h: 0,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    const token = await readArcDexToken(address);
    if (!token) return NextResponse.json({ success: false, error: "USDC pair not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: token, source: "arc-dex" });
  } catch (error) {
    console.error("ArcDEX token read failed", error);
    return NextResponse.json({ success: false, error: "Failed to read ArcDEX token" }, { status: 502 });
  }
}
