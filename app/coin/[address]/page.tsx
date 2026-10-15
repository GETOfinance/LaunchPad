"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/Header";
import { useEVMWallet } from "@/components/wallet/EVMWalletProvider";
import {
  TrendingUp,
  TrendingDown,
  Copy,
  Globe,
  Activity,
  DollarSign,
  BarChart3,
  Loader2,
  ArrowLeft,
  Rocket,
  Zap,
  Sparkles,
  Star,
  Wallet
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useBondingCurveTrade } from "@/hooks/useBondingCurveTrade";
import { formatRaw18 } from "@/lib/amounts";
import { BondingCurveTradePanel } from "@/components/coin/BondingCurveTradePanel";

// Utility functions
const formatNumber = (value: string | number, decimals = 2) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  
  // For balance display, use comma separators without suffix
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatCompactNumber = (value: string | number, decimals = 2) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
  if (absNum >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
  if (absNum >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
  
  // For numbers less than 1000, show with appropriate decimals
  if (absNum < 1) return num.toFixed(decimals);
  return num.toFixed(decimals < 2 ? decimals : 2);
};

const formatAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

interface TokenDetail {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  decimals: number;
  max_supply: string | null;
  icon_uri: string | null;
  project_uri: string | null;
  mint_fee_per_unit: string;
  created_at: string;
  pool_stats: {
    hbar_reserves: string;
    token_reserves: string;
    total_volume: string;
    trade_count: number;
    is_graduated: boolean;
    graduation_threshold: string;
    updated_at: string;
  } | null;
  trades: Array<{
    id: string;
    transaction_hash: string;
    user_address: string;
    hbar_amount: string;
    token_amount: string;
    price_per_token: string;
    trade_type: "BUY" | "SELL";
    created_at: string;
  }>;
  volume_24h: string;
  trade_count_24h: number;
}

// Spectacular Text Animation Component
function SpectacularText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <motion.div className={`relative ${className}`}>
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/30 to-pink-500/20 blur-2xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main text */}
      <motion.span
        className="relative z-10 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-black"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: "200% 200%",
          textShadow: "0 0 30px rgba(139, 69, 199, 0.5)"
        }}
      >
        {text}
      </motion.span>
    </motion.div>
  );
}

// Elegant Info Ticker Component
function InfoTicker({ token }: { token: TokenDetail }) {
  const tickerItems = [
    {
      label: "Volume 24h",
      value: `${formatCompactNumber(Number(token.pool_stats?.total_volume || 0) / 1e18, 2)} USDC`,
      icon: "📊"
    },
    {
      label: "Total Trades",
      value: formatCompactNumber(token.pool_stats?.trade_count || 0, 0),
      icon: "⚡"
    },
    {
      label: "Arc Network",
      value: "5042",
      icon: "⛓️"
    },
    {
      label: "Creator",
      value: formatAddress(token.creator),
      icon: "👤"
    }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-900/30 via-slate-800/20 to-slate-900/30 backdrop-blur-xl border border-white/5 rounded-lg py-2 mb-6">
      {/* Very subtle background animation */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-purple-500/3 via-transparent to-cyan-500/3"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ backgroundSize: "200% 200%" }}
      />

      <div className="flex animate-marquee whitespace-nowrap">
        {[...Array(2)].map((_, setIndex) => (
          <div key={setIndex} className="flex items-center">
            {tickerItems.map((item, index) => (
              <motion.div
                key={`${setIndex}-${index}`}
                className="inline-flex items-center mx-8 group"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white/3 border border-white/5 group-hover:border-white/10 transition-all duration-300">
                  <span className="text-xs opacity-60">{item.icon}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white/50 text-xs font-medium">
                      {item.label}:
                    </span>
                    <span className="text-white font-medium text-xs">
                      {item.value}
                    </span>
                  </div>
                </div>

                {/* Minimal separator */}
                <div className="ml-6 w-px h-3 bg-white/10" />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Enhanced Stats Card Component
function EnhancedStatsCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  delay = 0
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{
        delay,
        duration: 0.6,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{
        y: -8,
        scale: 1.05,
        rotateY: 5,
        boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.4)"
      }}
      className="relative overflow-hidden"
    >
      <Card className={`${gradient} backdrop-blur-xl border-white/20 hover:border-white/40 transition-all duration-500 relative`}>
        {/* Animated background particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5
            }}
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`
            }}
          />
        ))}

        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs font-medium mb-1">{title}</p>
              <motion.p
                className="text-xl font-bold text-white mb-1"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {value}
              </motion.p>
              <p className="text-white/60 text-xs">{subtitle}</p>
            </div>
            <motion.div
              className="bg-white/20 p-2 rounded-lg"
              whileHover={{
                rotate: 360,
                scale: 1.1,
                backgroundColor: "rgba(255,255,255,0.3)"
              }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-5 h-5 text-white">
                {icon}
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CoinDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { account: evmAccount, signer, connect } = useEVMWallet();
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hbarAmount, setHbarAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [buyQuoteRaw, setBuyQuoteRaw] = useState(0n);
  const [sellQuoteRaw, setSellQuoteRaw] = useState(0n);
  const [slippageBps, setSlippageBps] = useState(100);
  const [deadlineMinutes, setDeadlineMinutes] = useState(10);
  
  const curveTrade = useBondingCurveTrade(address, signer, evmAccount);










  useEffect(() => {
    if (address) void fetchTokenDetail();
  }, [address]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void curveTrade.quoteBuy(hbarAmount).then(setBuyQuoteRaw).catch(() => setBuyQuoteRaw(0n));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [curveTrade.quoteBuy, hbarAmount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void curveTrade.quoteSell(tokenAmount).then(setSellQuoteRaw).catch(() => setSellQuoteRaw(0n));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [curveTrade.quoteSell, tokenAmount]);

  const fetchTokenDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tokens/${address}`);
      const data = await response.json();

      if (data.success) {
        console.log(`📊 Token Details for ${data.data.symbol}:`, {
          name: data.data.name,
          trades: data.data.trades?.length || 0,
          volume_24h: data.data.volume_24h,
          trade_count_24h: data.data.trade_count_24h,
          pool_stats: data.data.pool_stats
        });
        
        setToken(data.data);
      } else {
        setError(data.error || "Failed to fetch token details");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.7, 0.3],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gradient-to-r from-pink-500/20 to-cyan-500/20 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.6, 0.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] relative z-10">
          <motion.div
            className="flex items-center space-x-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-cyan-400" />
            </motion.div>
            <div>
              <SpectacularText text="Loading Token Details" className="text-2xl" />
              <motion.p
                className="text-white/60 text-lg mt-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Please wait while we fetch the latest data...
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] relative z-10">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-red-900/20 via-orange-900/20 to-red-900/20 border-red-500/30 backdrop-blur-xl">
              <CardContent className="p-12 text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-6"
                >
                  🚫
                </motion.div>
                <SpectacularText text="Token Not Found" className="text-3xl mb-6" />
                <motion.p
                  className="text-white/70 mb-8 text-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {error}
                </motion.p>
                <Link href="/bonding-curve">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold px-8 py-3 text-lg">
                      <ArrowLeft className="w-5 h-5 mr-3" />
                      Back to Explore
                    </Button>
                  </motion.div>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentPrice = token.pool_stats && BigInt(token.pool_stats.token_reserves || "0") > 0n
    ? Number(token.pool_stats.hbar_reserves) / Number(token.pool_stats.token_reserves)
    : 0;
  const handleBuyTokens = async () => {
    try {
      if (!evmAccount || !signer) return await connect();
      const hash = await curveTrade.buy(hbarAmount, slippageBps, deadlineMinutes);
      toast.success("Purchase confirmed", { description: hash });
      setHbarAmount("");
      await fetchTokenDetail();
    } catch (tradeError) {
      toast.error("Purchase failed", { description: tradeError instanceof Error ? tradeError.message : String(tradeError) });
    }
  };

  const handleSellTokens = async () => {
    try {
      if (!evmAccount || !signer) return await connect();
      const hash = await curveTrade.sell(tokenAmount, slippageBps, deadlineMinutes);
      toast.success("Sale confirmed", { description: hash });
      setTokenAmount("");
      await fetchTokenDetail();
    } catch (tradeError) {
      toast.error("Sale failed", { description: tradeError instanceof Error ? tradeError.message : String(tradeError) });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 left-10 w-64 h-64 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.7, 0.3],
            rotate: [0, 180, 360],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gradient-to-r from-pink-500/20 to-cyan-500/20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.6, 0.2],
            rotate: [360, 180, 0],
            x: [0, -30, 0],
            y: [0, 20, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating elements */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full opacity-40"
            animate={{
              x: [0, 100 - i * 20, 0],
              y: [0, 60 - i * 10, 0],
              scale: [0.5, 1.5, 0.5],
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{
              duration: 6 + i,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + i * 8}%`
            }}
          />
        ))}
      </div>

      <Header />

      <div className="container mx-auto max-w-7xl p-4 pt-8 relative z-10">
        {/* Enhanced Token Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <Link href="/bonding-curve">
              <motion.div
                whileHover={{ x: -5, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 transition-all duration-300 backdrop-blur-xl border border-white/10 hover:border-white/20 px-6 py-3"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Explore
                </Button>
              </motion.div>
            </Link>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <Badge className="px-4 py-2 text-xs font-medium backdrop-blur-xl border-0 bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                <motion.span
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="mr-1 text-sm"
                >
                  🚀
                </motion.span>
                Bonding Curve
              </Badge>
            </motion.div>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8 mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="relative"
            >
              {/* Glow effect around avatar */}
              <motion.div
                className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full opacity-50 blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              <Avatar className="w-20 h-20 ring-2 ring-white/20 relative z-10 backdrop-blur-xl">
                <AvatarImage src={token.icon_uri || ""} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 text-white text-xl font-black">
                  {token.symbol.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <div className="flex-1">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <SpectacularText
                  text={token.name}
                  className="text-2xl lg:text-4xl mb-3"
                />
              </motion.div>

              <motion.div
                className="flex flex-wrap items-center gap-4 mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="relative"
                >
                  <Badge
                    variant="outline"
                    className="text-cyan-300 border-cyan-300/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-xl px-4 py-2 text-lg font-bold"
                  >
                    ${token.symbol}
                  </Badge>
                </motion.div>

                <motion.div
                  className="flex items-center space-x-3 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10"
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.15)" }}
                >
                  <span className="font-mono text-white/90 text-sm">{formatAddress(token.address)}</span>
                  <motion.button
                    onClick={copyAddress}
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                </motion.div>

                <motion.div
                  className="text-white/60 text-sm bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl px-3 py-1 rounded-lg border border-white/10"
                  whileHover={{ scale: 1.05 }}
                >
                  Created by {formatAddress(token.creator)}
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              className="flex items-center gap-3"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {token.project_uri && (
                <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="bg-white/5 backdrop-blur-xl border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                  >
                    <a href={token.project_uri} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-1" />
                      Website
                    </a>
                  </Button>
                </motion.div>
              )}

              <Link href={`/bonding-curve?token=${token.address}`}>
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all duration-300"
                  >
                    <Rocket className="w-4 h-4 mr-1" />
                    Trade
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Info Ticker Section */}
        <InfoTicker token={token} />

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <EnhancedStatsCard
            title="Current Price"
            value={`$${currentPrice.toFixed(8)}`}
            subtitle="per token"
            icon={<DollarSign className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-green-500/10 via-emerald-500/15 to-green-600/10 border-green-500/30"
            delay={0.1}
          />

          <EnhancedStatsCard
            title="24h Volume"
            value={`${formatCompactNumber(Number(token.volume_24h || 0) / 1e18, 2)} USDC`}
            subtitle="traded"
            icon={<BarChart3 className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-blue-500/10 via-cyan-500/15 to-blue-600/10 border-blue-500/30"
            delay={0.2}
          />

          <EnhancedStatsCard
            title="Total Trades"
            value={formatCompactNumber(token.pool_stats?.trade_count || 0, 0)}
            subtitle="transactions"
            icon={<Activity className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-purple-500/10 via-pink-500/15 to-purple-600/10 border-purple-500/30"
            delay={0.3}
          />

          <EnhancedStatsCard
            title="Network"
            value="Arc Mainnet"
            subtitle="chain 5042"
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-yellow-500/10 via-orange-500/15 to-yellow-600/10 border-yellow-500/30"
            delay={0.4}
          />
        </div>

        {/* Enhanced Main Content */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-gradient-to-r from-black/40 via-purple-900/30 to-black/40 border border-white/20 backdrop-blur-xl p-1 rounded-lg">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:via-pink-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-white/70 hover:text-white/90 transition-all duration-300 px-4 py-2 rounded-md font-medium text-sm"
              >
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center"
                >
                  📊 Overview
                </motion.span>
              </TabsTrigger>
              <TabsTrigger
                value="trades"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:via-pink-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-white/70 hover:text-white/90 transition-all duration-300 px-4 py-2 rounded-md font-medium text-sm"
              >
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center"
                >
                  📈 Trades
                </motion.span>
              </TabsTrigger>
              <TabsTrigger
                value="info"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:via-pink-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-white/70 hover:text-white/90 transition-all duration-300 px-4 py-2 rounded-md font-medium text-sm"
              >
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center"
                >
                  ℹ️ Info
                </motion.span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enhanced Pool Stats */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <Card className="bg-gradient-to-br from-black/40 via-purple-900/20 to-black/40 border border-white/20 backdrop-blur-xl hover:border-white/40 transition-all duration-500 relative overflow-hidden">
                    {/* Animated background pattern */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/10 to-pink-500/5"
                      animate={{
                        backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                      }}
                      transition={{ duration: 8, repeat: Infinity }}
                      style={{ backgroundSize: "200% 200%" }}
                    />

                    <CardHeader className="relative z-10">
                      <CardTitle className="text-white flex items-center text-xl font-bold">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="mr-3 text-2xl"
                        >
                          🏊‍♂️
                        </motion.div>
                        Pool Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                      {[
                        {
                          label: "USDC Reserves",
                          value: `${formatCompactNumber(Number(token.pool_stats?.hbar_reserves || 0) / 1e18, 2)} USDC`,
                          icon: "💰"
                        },
                        {
                          label: "Total Volume",
                          value: `${formatCompactNumber(Number(token.pool_stats?.total_volume || 0) / 1e18, 2)} USDC`,
                          icon: "📊"
                        },
                        {
                          label: "Indexed Trades",
                          value: formatCompactNumber(token.pool_stats?.trade_count || 0, 0),
                          icon: "⚡"
                        }
                      ].map((stat, index) => (
                        <motion.div
                          key={stat.label}
                          className="flex justify-between items-center p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-xl backdrop-blur-sm border border-white/10"
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.15)" }}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          <span className="text-white/80 font-medium flex items-center">
                            <span className="mr-3 text-lg">{stat.icon}</span>
                            {stat.label}:
                          </span>
                          <motion.span
                            className="text-white font-bold text-lg"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                          >
                            {stat.value}
                          </motion.span>
                        </motion.div>
                      ))}

                    </CardContent>
                  </Card>
                </motion.div>

                {/* Enhanced Trading Interface */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <Card className="bg-gradient-to-br from-black/40 via-pink-900/20 to-black/40 border border-white/20 backdrop-blur-xl hover:border-white/40 transition-all duration-500 relative overflow-hidden">
                    {/* Animated background */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/10 to-cyan-500/5"
                      animate={{
                        backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                      }}
                      transition={{ duration: 6, repeat: Infinity }}
                      style={{ backgroundSize: "300% 300%" }}
                    />

                    <CardHeader className="relative z-10">
                      <CardTitle className="text-white flex items-center text-xl font-bold">
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 360]
                          }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="mr-3 text-2xl"
                        >
                          🚀
                        </motion.div>
                        Trade {token.symbol}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <BondingCurveTradePanel
                        symbol={token.symbol}
                        balanceRaw={curveTrade.balanceRaw}
                        buyAmount={hbarAmount}
                        sellAmount={tokenAmount}
                        buyQuoteRaw={buyQuoteRaw}
                        sellQuoteRaw={sellQuoteRaw}
                        tokenDecimals={curveTrade.tokenDecimals}
                        usdcDecimals={curveTrade.usdcDecimals}
                        slippageBps={slippageBps}
                        deadlineMinutes={deadlineMinutes}
                        pending={curveTrade.pending}
                        connected={Boolean(evmAccount)}
                        onBuyAmount={setHbarAmount}
                        onSellAmount={setTokenAmount}
                        onSlippageBps={setSlippageBps}
                        onDeadlineMinutes={setDeadlineMinutes}
                        onBuy={() => void handleBuyTokens()}
                        onSell={() => void handleSellTokens()}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="trades">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-black/40 via-blue-900/20 to-black/40 border border-white/20 backdrop-blur-xl relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/10 to-cyan-500/5"
                    animate={{
                      backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    style={{ backgroundSize: "200% 200%" }}
                  />

                  <CardHeader className="relative z-10">
                    <CardTitle className="text-white flex items-center text-xl font-bold">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mr-3 text-2xl"
                      >
                        📈
                      </motion.div>
                      Recent Trades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="space-y-4">
                      {token.trades.length > 0 ? (
                        token.trades.map((trade: any, index: number) => (
                          <motion.div
                            key={trade.id}
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{
                              scale: 1.02,
                              backgroundColor: "rgba(255,255,255,0.15)",
                              boxShadow: "0 10px 30px -10px rgba(168,85,247,0.3)"
                            }}
                            className="flex items-center justify-between p-6 bg-gradient-to-r from-white/5 to-white/10 rounded-xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                          >
                            <div className="flex items-center space-x-4">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative"
                              >
                                <Badge
                                  variant="outline"
                                  className={trade.trade_type === "SELL" ? "text-orange-400 border-orange-400/50 bg-orange-500/20 backdrop-blur-sm font-bold px-3 py-1" : "text-green-400 border-green-400/50 bg-green-500/20 backdrop-blur-sm font-bold px-3 py-1"}
                                >
                                  {trade.trade_type}
                                </Badge>
                                <motion.div
                                  className="absolute -inset-1 bg-green-400/20 rounded-lg blur-sm"
                                  animate={{ opacity: [0, 0.5, 0] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              </motion.div>
                              <div>
                                <p className="text-white font-bold text-lg">
                                  {formatRaw18(BigInt(trade.token_amount), 4)} {token.symbol}
                                </p>
                                <motion.p
                                  className="text-white/60 text-sm font-mono"
                                  whileHover={{ color: "rgba(255,255,255,0.9)" }}
                                >
                                  {formatAddress(trade.user_address)}
                                </motion.p>
                              </div>
                            </div>
                            <div className="text-right">
                              <motion.p
                                className="text-white font-bold text-lg"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 3, repeat: Infinity, delay: index * 0.2 }}
                              >
                                {formatRaw18(BigInt(trade.hbar_amount), 4)} USDC
                              </motion.p>
                              <p className="text-white/60 text-sm">
                                {new Date(trade.created_at).toLocaleString()}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div
                          className="text-center py-16"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <motion.div
                            animate={{
                              y: [0, -10, 0],
                              rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="text-6xl mb-6"
                          >
                            📊
                          </motion.div>
                          <p className="text-white/60 text-xl">No trades yet</p>
                          <p className="text-white/40 text-sm mt-2">Be the first to trade this token!</p>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="info">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-black/40 via-indigo-900/20 to-black/40 border border-white/20 backdrop-blur-xl relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/10 to-blue-500/5"
                    animate={{
                      backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
                    }}
                    transition={{ duration: 12, repeat: Infinity }}
                    style={{ backgroundSize: "200% 200%" }}
                  />

                  <CardHeader className="relative z-10">
                    <CardTitle className="text-white flex items-center text-xl font-bold">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        className="mr-3 text-2xl"
                      >
                        ℹ️
                      </motion.div>
                      Token Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { label: "Creator", value: formatAddress(token.creator), icon: "👤" },
                        { label: "Decimals", value: token.decimals.toString(), icon: "🔢" },
                        { label: "Created", value: new Date(token.created_at).toLocaleDateString(), icon: "📅" },
                        { label: "Max Supply", value: token.max_supply ? formatCompactNumber(Number(token.max_supply) / Math.pow(10, token.decimals), 0) : "1B", icon: "💰" }
                      ].map((info, index) => (
                        <motion.div
                          key={info.label}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{
                            scale: 1.02,
                            backgroundColor: "rgba(255,255,255,0.15)",
                            y: -2
                          }}
                          className="bg-gradient-to-r from-white/5 to-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                        >
                          <div className="flex items-center mb-3">
                            <motion.span
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                              className="text-2xl mr-3"
                            >
                              {info.icon}
                            </motion.span>
                            <label className="text-white/70 text-sm font-medium uppercase tracking-wider">
                              {info.label}
                            </label>
                          </div>
                          <motion.p
                            className="text-white font-bold text-lg"
                            animate={{ opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 3, repeat: Infinity, delay: index * 0.3 }}
                          >
                            {info.value}
                          </motion.p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Additional Token Stats */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-xl border border-white/10"
                    >
                      <h4 className="text-white font-bold text-lg mb-4 flex items-center">
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="mr-3 text-xl"
                        >
                          ⭐
                        </motion.span>
                        Quick Stats
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        {[
                          { label: "24h Trades", value: formatCompactNumber(token.trade_count_24h, 0) },
                          { label: "Status", value: "Bonding Curve" },
                          { label: "Total Volume", value: `${formatCompactNumber(Number(token.pool_stats?.total_volume || 0) / 1e18, 2)} USDC` },
                          { label: "Mint Fee", value: `${formatRaw18(BigInt(token.mint_fee_per_unit || "0"), 4)} USDC` }
                        ].map((stat, index) => (
                          <motion.div
                            key={stat.label}
                            whileHover={{ scale: 1.05, y: -2 }}
                            className="text-center"
                          >
                            <motion.p
                              className="text-white font-bold text-lg"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                            >
                              {stat.value}
                            </motion.p>
                            <p className="text-white/60 text-sm">{stat.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <Footer />

      {/* Custom CSS for elegant marquee animation */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
