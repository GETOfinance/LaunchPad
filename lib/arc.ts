import arcDeployment from "@/addresses/arc-mainnet.json";

const chainId = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || 5_042);
const currencySymbol = process.env.NEXT_PUBLIC_ARC_CURRENCY_SYMBOL || "USDC";

export const ARC_MAINNET = {
  chainId,
  chainIdHex: `0x${chainId.toString(16)}`,
  name: process.env.NEXT_PUBLIC_ARC_NETWORK_NAME || "Arc",
  rpcUrl: process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.mainnet.arc.io",
  explorerUrl:
    process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://explorer.arc.io",
  nativeCurrency: { name: currencySymbol, symbol: currencySymbol, decimals: 18 },
} as const;

// Environment variables supply app-specific deployments. The checked-in registry
// safely defaults undeployed app contracts to the zero address on Arc Mainnet.
export const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS || arcDeployment.factory;
export const ROUTER_ADDRESS =
  process.env.NEXT_PUBLIC_ROUTER_ADDRESS || arcDeployment.router;
export const SMOKE_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_SMOKE_TOKEN_ADDRESS || arcDeployment.smokeToken;
export const PAIR_ADDRESS =
  process.env.NEXT_PUBLIC_PAIR_ADDRESS || arcDeployment.pair;
export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS || arcDeployment.usdc;
export const MULTICALL3_ADDRESS =
  process.env.NEXT_PUBLIC_MULTICALL3_ADDRESS || arcDeployment.multicall3;
export const USDC_DECIMALS = 6;

export const ARC_DEPLOYMENT_BLOCK = Number(
  process.env.ARC_DEPLOYMENT_BLOCK || arcDeployment.deploymentBlock,
);
