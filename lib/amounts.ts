import { formatUnits, parseUnits } from "ethers";

export const CHAIN_DECIMALS = 18;

export function parseRaw18(value: string): bigint {
  return parseUnits(value || "0", CHAIN_DECIMALS);
}

export function formatRaw18(value: bigint | string, precision = 6): string {
  return formatRaw(value, CHAIN_DECIMALS, precision);
}

export function formatRaw(value: bigint | string, decimals: number, precision = 6): string {
  const formatted = formatUnits(BigInt(value), decimals);
  const [whole, fraction = ""] = formatted.split(".");
  return precision === 0 || !fraction ? whole : `${whole}.${fraction.slice(0, precision)}`.replace(/\.?0+$/, "");
}

export function applySlippage(value: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5_000) {
    throw new Error("Invalid slippage tolerance");
  }
  return (value * BigInt(10_000 - slippageBps)) / 10_000n;
}
