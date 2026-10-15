import "dotenv/config";
import { Contract, JsonRpcProvider, ZeroAddress, getAddress } from "ethers";
import registry from "../addresses/arc-mainnet.json" with { type: "json" };

const deployment = {
  ...registry,
  factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || registry.factory,
  router: process.env.NEXT_PUBLIC_ROUTER_ADDRESS || registry.router,
  smokeToken: process.env.NEXT_PUBLIC_SMOKE_TOKEN_ADDRESS || registry.smokeToken,
  pair: process.env.NEXT_PUBLIC_PAIR_ADDRESS || registry.pair,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || registry.usdc,
  multicall3: process.env.NEXT_PUBLIC_MULTICALL3_ADDRESS || registry.multicall3,
};

const factoryAbi = [
  "function allPairsLength() view returns (uint256)",
  "function getPair(address,address) view returns (address)",
];
const routerAbi = [
  "function factory() view returns (address)",
  "function USDC() view returns (address)",
  "function getAmountsOut(uint256,address[]) view returns (uint256[])",
];
const pairAbi = [
  "function factory() view returns (address)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)",
];
const erc20Abi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

function sameAddress(left, right) {
  return getAddress(left) === getAddress(right);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const provider = new JsonRpcProvider(
  process.env.ARC_RPC_URL || deployment.rpc,
  { chainId: deployment.chainId, name: "arc-mainnet" },
  { staticNetwork: true },
);

const contracts = [
  ["factory", deployment.factory],
  ["router", deployment.router],
  ["smoke token", deployment.smokeToken],
  ["pair", deployment.pair],
  ["USDC", deployment.usdc],
  ["Multicall3", deployment.multicall3],
];

const network = await provider.getNetwork();
assert(Number(network.chainId) === deployment.chainId, "Unexpected Arc chain ID");
for (const [label, address] of contracts) {
  assert(address !== ZeroAddress, `${label} is not configured for Arc Mainnet`);
  assert((await provider.getCode(address)) !== "0x", `${label} has no deployed bytecode`);
}

const factory = new Contract(deployment.factory, factoryAbi, provider);
const router = new Contract(deployment.router, routerAbi, provider);
const pair = new Contract(deployment.pair, pairAbi, provider);
const token = new Contract(deployment.smokeToken, erc20Abi, provider);
const usdc = new Contract(deployment.usdc, erc20Abi, provider);

const [pairCount, mappedPair, routerFactory, routerUsdc, pairFactory, token0, token1, reserves, tokenSymbol, tokenDecimals, usdcSymbol, usdcDecimals] = await Promise.all([
  factory.allPairsLength(),
  factory.getPair(deployment.usdc, deployment.smokeToken),
  router.factory(),
  router.USDC(),
  pair.factory(),
  pair.token0(),
  pair.token1(),
  pair.getReserves(),
  token.symbol(),
  token.decimals(),
  usdc.symbol(),
  usdc.decimals(),
]);

assert(pairCount > 0n, "Factory contains no pairs");
assert(sameAddress(mappedPair, deployment.pair), "Factory pair mapping mismatch");
assert(sameAddress(routerFactory, deployment.factory), "Router factory mismatch");
assert(sameAddress(routerUsdc, deployment.usdc), "Router USDC mismatch");
assert(sameAddress(pairFactory, deployment.factory), "Pair factory mismatch");
assert(
  [token0, token1].some((address) => sameAddress(address, deployment.smokeToken)) &&
    [token0, token1].some((address) => sameAddress(address, deployment.usdc)),
  "Pair token composition mismatch",
);
assert(tokenSymbol === "GSTEST", "Unexpected smoke-test token symbol");
assert(usdcSymbol === "USDC" && Number(usdcDecimals) === 6, "Unexpected canonical USDC metadata");
assert(reserves[0] > 0n && reserves[1] > 0n, "Pair has no liquidity");

const quote = await router.getAmountsOut(1n, [deployment.usdc, deployment.smokeToken]);
assert(quote.length === 2 && quote[1] > 0n, "Router returned no GSTEST quote");

console.log(JSON.stringify({
  chainId: Number(network.chainId),
  pairCount: pairCount.toString(),
  token: { symbol: tokenSymbol, decimals: Number(tokenDecimals) },
  usdc: { symbol: usdcSymbol, decimals: Number(usdcDecimals) },
  pair: deployment.pair,
  reserves: [reserves[0].toString(), reserves[1].toString()],
  quoteForOneRawUsdc: quote[1].toString(),
  status: "ok",
}, null, 2));
