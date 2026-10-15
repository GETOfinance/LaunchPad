"use client";

import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import { useEVMWallet } from "../../components/wallet/EVMWalletProvider";
import tokenAbi from "../../artifacts/contracts/LaunchPadToken.sol/LaunchPadToken.json";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, ExternalLink, Globe, Image as ImageIcon, Sparkles, Zap, Activity } from "lucide-react";
import { toast } from "sonner";
import { ARCDEX_FACTORY_ABI, ARCDEX_PAIR_ABI, ARCDEX_ROUTER_ABI } from "@/lib/arcdex";
import { FACTORY_ADDRESS, ROUTER_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/arc";

interface Asset {
  name: string;
  symbol: string;
  logo: string;
  fallback: string;
  amount: number;
  decimals: number;
  valueUSD: number;
  coinType: string;
  category: string;
  iconUri?: string;
  projectUri?: string;
  currentPrice?: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
}

interface CoinInfo {
  name: string;
  symbol: string;
  decimals: number;
}

export default function PortfolioPage() {
  useEffect(() => {
    document.title = "Portfolio | LaunchPad";
  }, []);

  const { account, provider, connected, connect } = useEVMWallet() as any;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [priceChange24h, setPriceChange24h] = useState(0);

  // Function to determine asset category
  const getAssetCategory = (coinType: string, symbol: string, name: string): string => {
    if (symbol.includes("USDC")) {
      return "core";
    }

    const lowerSymbol = symbol.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerSymbol.includes("dog") ||
        lowerSymbol.includes("pepe") ||
        lowerSymbol.includes("meme") ||
        lowerName.includes("dog") ||
        lowerName.includes("pepe") ||
        lowerName.includes("meme")) {
      return "meme";
    }

    return "other";
  };

  // Function to get asset logo
  const getAssetLogo = (category: string, symbol: string): string => {
    if (category === "core") {
      return "/tokens/default.svg";
    } else if (category === "meme") {
      return `/tokens/${symbol.toLowerCase()}.svg`;
    }
    return "/tokens/default.svg";
  };

  // Function to fetch wallet assets using direct balance API
  const fetchAssets = async () => {
    if (!account || !provider) {
      toast.error("Connect EVM wallet to view your portfolio");
      return;
    }

    setLoading(true);
    try {
      const address = account.toString();
      const out: Asset[] = [];

      // 1) Arc native USDC balance (18 decimals)
      let hbarPrice = 1;
      let hbarChange = 0;

      const hbarWei = await provider.getBalance(address);
      const hbarAmount = parseFloat(ethers.formatEther(hbarWei));
      out.push({
        name: "Arc native USDC",
        symbol: "USDC",
        logo: "",
        fallback: "U",
        amount: hbarAmount,
        decimals: 18,
        valueUSD: hbarAmount * hbarPrice,
        coinType: "USDC",
        category: "core", // Core Assets
        currentPrice: hbarPrice,
        priceChange24h: hbarChange,
      });

      // 2) LaunchPad ERC-20 balances discovered via factory
      if (FACTORY_ADDRESS) {
        try {
          const factory = new Contract(
            FACTORY_ADDRESS,
            ARCDEX_FACTORY_ABI,
            provider
          );
          const len = Number(await factory.allPairsLength());
          const addrs: string[] = [];
          for (let i = 0; i < len; i++) {
            const pairAddress = String(await factory.allPairs(i));
            const pair = new Contract(pairAddress, ARCDEX_PAIR_ABI, provider);
            const [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
            if (String(token0).toLowerCase() === USDC_ADDRESS.toLowerCase()) addrs.push(String(token1));
            else if (String(token1).toLowerCase() === USDC_ADDRESS.toLowerCase()) addrs.push(String(token0));
          }

          const tokenAssets = await Promise.all(
            addrs.map(async (addr) => {
              try {
                const token = new Contract(
                  addr,
                  (tokenAbi as any).abi || (tokenAbi as any),
                  provider
                );
                const [name, symbol, decimals, balance] = await Promise.all([
                  token.name(),
                  token.symbol(),
                  token.decimals(),
                  token.balanceOf(address),
                ]);
                const dec = Number(decimals);
                const amount = parseFloat(ethers.formatUnits(balance, dec));
                if (amount <= 0) return null; // hide zero-balance tokens

                // ArcDEX router quote for one token in canonical USDC.
                let priceHbarPerToken = 0;
                let priceUsdPerToken = 0;
                let marketCap = 0;
                let volume24h = 0;
                let poolAddr: string | null = null;
                try {
                  poolAddr = await factory.getPair(addr, USDC_ADDRESS);
                  if (poolAddr && poolAddr !== ethers.ZeroAddress) {
                    const router = new Contract(ROUTER_ADDRESS, ARCDEX_ROUTER_ABI, provider);
                    const unitIn = ethers.parseUnits("1", dec);
                    const amounts = await router.getAmountsOut(unitIn, [addr, USDC_ADDRESS]);
                    priceHbarPerToken = parseFloat(ethers.formatUnits(amounts[amounts.length - 1], USDC_DECIMALS));
                    priceUsdPerToken = priceHbarPerToken * hbarPrice;
                  }
                } catch (e) {
                  console.warn("Pool pricing failed for", addr, e);
                }

                // Market cap using totalSupply * price
                try {
                  const totalSupply = await token.totalSupply();
                  const total = parseFloat(ethers.formatUnits(totalSupply, dec));
                  marketCap = total * priceUsdPerToken;
                } catch {}

                const asset: Asset = {
                  name,
                  symbol,
                  logo: `/tokens/${String(symbol).toLowerCase()}.svg`,
                  fallback: String(symbol || "?").charAt(0).toUpperCase(),
                  amount,
                  decimals: dec,
                  valueUSD: amount * priceUsdPerToken,
                  coinType: addr,
                  category: "other",
                  currentPrice: priceUsdPerToken,
                  marketCap,
                  volume24h,
                };
                return asset;
              } catch (e) {
                console.warn("Token scan failed:", addr, e);
                return null;
              }
            })
          );

          out.push(...tokenAssets.filter((a): a is Asset => !!a));
        } catch (e) {
          console.warn("Factory scan failed:", e);
        }
      }

      // Sort by USD value (native USDC first), compute totals
      out.sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0));
      setAssets(out);
      const totalVal = out.reduce((sum, a) => sum + (a.valueUSD || 0), 0);
      setTotalValue(totalVal);
      setPriceChange24h(hbarChange);

      toast.success(`Found ${out.length} assets in wallet`);
    } catch (error) {
      console.error("Portfolio fetch error:", error);
      toast.error("Failed to load portfolio: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on wallet connection
  useEffect(() => {
    if (connected && account) {
      fetchAssets();
    } else {
      setAssets([]);
      setTotalValue(0);
      setPriceChange24h(0);
    }
  }, [connected, account]);

  const coreAssets = assets.filter(asset => asset.category === "core");
  const memeCoins = assets.filter(asset => asset.category === "meme");
  const otherAssets = assets.filter(asset => asset.category === "other");

  return (
    <div className="min-h-screen">
      <Header />

      <main className="relative z-10 py-10">
        <div className="container mx-auto px-4 space-y-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gradient-primary">Your Portfolio</h2>
                {connected && account && (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-muted-foreground font-mono">
                      {String(account).slice(0, 6)}...{String(account).slice(-6)}
                    </p>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-semibold">
                        Total Value: <span className="text-green-600">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                      {priceChange24h !== 0 && (
                        <div className={`flex items-center gap-1 text-sm ${priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceChange24h >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                          {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-gradient-primary/20 border-primary/30 text-primary">
                  Arc Mainnet (5042)
                </Badge>
                {connected && account && (
                  <Button
                    onClick={fetchAssets}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    {!loading && "Refresh"}
                  </Button>
                )}
              </div>
            </div>

            {!connected ? (
              <p className="text-muted-foreground mt-2">Connect your wallet using the button in the header to view your portfolio.</p>
            ) : !account ? (
              <p className="text-muted-foreground mt-2">Please ensure your wallet is properly connected.</p>
            ) : null}
          </motion.div>

          {/* Portfolio Content */}
          {!connected || !account ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Card className="liquid-glass">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="size-16 rounded-full bg-gradient-primary/20 flex items-center justify-center mb-4">
                    <TrendingUp className="size-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Portfolio Dashboard</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Connect your wallet to view native USDC and launched ERC-20 balances on Arc Mainnet.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : loading ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Card className="liquid-glass">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="size-12 animate-spin mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Loading Portfolio</h3>
                  <p className="text-muted-foreground">Fetching your assets from Arc Mainnet…</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : assets.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Card className="liquid-glass">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <TrendingDown className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
                  <p className="text-muted-foreground text-center">
                    Your wallet doesn't contain any assets, or they're not yet supported.
                  </p>
                  <Button onClick={fetchAssets} variant="outline" className="mt-4">
                    <RefreshCw className="size-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Portfolio Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <Card className="liquid-glass bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-300 mb-1">Total Assets</p>
                        <p className="text-2xl font-bold text-white">{assets.length}</p>
                      </div>
                      <div className="p-3 rounded-full bg-purple-500/20">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="liquid-glass bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-300 mb-1">Portfolio Value</p>
                        <p className="text-2xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-3 rounded-full bg-green-500/20">
                        <TrendingUp className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="liquid-glass bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-300 mb-1">LaunchPad Tokens</p>
                        <p className="text-2xl font-bold text-white">{otherAssets.length}</p>
                      </div>
                      <div className="p-3 rounded-full bg-blue-500/20">
                        <Zap className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Assets Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Core Assets */}
              {coreAssets.length > 0 && (
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
                  <Card className="liquid-glass bg-gradient-to-br from-orange-500/5 to-yellow-500/5 border-orange-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                          <Activity className="w-5 h-5 text-orange-400" />
                        </div>
                        Core Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {coreAssets.map((asset) => (
                          <motion.div
                            key={asset.coinType}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/30 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Avatar className="size-12">
                                  <AvatarImage src={asset.logo} alt={asset.symbol} />
                                  <AvatarFallback className="bg-orange-500/20 text-orange-300">{asset.fallback}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-lg">{asset.symbol}</p>
                                  <p className="text-sm text-muted-foreground">{asset.name}</p>
                                  {asset.currentPrice && (
                                    <p className="text-xs text-green-400">
                                      ${asset.currentPrice.toFixed(6)} per token
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold">
                                  {asset.amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: asset.amount < 1 ? 6 : 2
                                  })}
                                </p>
                                <p className="text-sm text-green-400">
                                  ${asset.valueUSD.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </p>
                                {asset.priceChange24h !== undefined && asset.priceChange24h !== 0 && (
                                  <div className={`flex items-center justify-end gap-1 text-xs ${
                                    asset.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {asset.priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {asset.priceChange24h >= 0 ? '+' : ''}{asset.priceChange24h.toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}


              {/* LaunchPad Tokens */}
              {otherAssets.length > 0 && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                  <Card className="liquid-glass bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                          <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        LaunchPad Tokens
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {otherAssets.map((asset) => (
                          <motion.div
                            key={asset.coinType}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-4">
                                <Avatar className="size-12">
                                  <AvatarImage src={asset.iconUri || asset.logo} alt={asset.symbol} />
                                  <AvatarFallback className="bg-purple-500/20 text-purple-300">{asset.fallback}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-lg">{asset.symbol}</p>
                                  <p className="text-sm text-muted-foreground">{asset.name}</p>
                                  {asset.currentPrice && (
                                    <p className="text-xs text-green-400">
                                      ${asset.currentPrice.toFixed(8)} per token
                                    </p>
                                  )}
                                  {(asset.marketCap !== undefined || asset.volume24h !== undefined) && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {asset.marketCap !== undefined && `MCap: $${asset.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                      {asset.marketCap !== undefined && asset.volume24h !== undefined && ' · '}
                                      {asset.volume24h !== undefined && `Vol(24h): $${asset.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold">
                                  {asset.amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                  })}
                                </p>
                                <p className="text-sm text-green-400">
                                  ${asset.valueUSD.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </p>
                              </div>
                            </div>

                            {/* Token Metadata */}
                            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                              {asset.iconUri && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-300">
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  Icon
                                </Badge>
                              )}
                              {asset.projectUri && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-500/10 border-green-500/30 text-green-300 cursor-pointer hover:bg-green-500/20 transition-colors"
                                  onClick={() => window.open(asset.projectUri, '_blank')}
                                >
                                  <Globe className="w-3 h-3 mr-1" />
                                  Website
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-300">
                                {asset.decimals} decimals
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
