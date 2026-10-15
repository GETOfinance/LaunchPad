"use client";

import { useMemo, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Rocket, Wallet, ShieldCheck, Info, ExternalLink, Sparkles, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { useEVMWallet } from "./wallet/EVMWalletProvider";
import { toast } from "sonner";
import { ethers } from "ethers";
import tokenArtifact from "../artifacts/contracts/LaunchPadToken.sol/LaunchPadToken.json";
import { ARCDEX_FACTORY_ABI, ARCDEX_ROUTER_ABI, ERC20_ABI } from "@/lib/arcdex";
import { ARC_MAINNET, FACTORY_ADDRESS, ROUTER_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/arc";

const TOTAL_SUPPLY = 1_000_000_000n * 10n ** 18n;

export default function LaunchTokenForm() {

  const { account, signer, connected, connect } = useEVMWallet() as any;
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [iconUri, setIconUri] = useState("");
  const [projectUri, setProjectUri] = useState("");
  const [initialBuyAmount, setInitialBuyAmount] = useState("");
  const [tokenLiquidityAmount, setTokenLiquidityAmount] = useState("100000000");
  const [submitting, setSubmitting] = useState(false);
  const [iconUrlWarning, setIconUrlWarning] = useState("");

  // Removed motion values and mouse handlers for card animations

  // Function to validate Unsplash URLs
  const validateIconUrl = (url: string) => {
    if (!url.trim()) {
      setIconUrlWarning("");
      return;
    }

    const isUnsplashUrl = url.includes('unsplash.com') || 
                         url.includes('images.unsplash.com') || 
                         url.includes('plus.unsplash.com');
    
    if (!isUnsplashUrl) {
      setIconUrlWarning("⚠️ Only Unsplash images are recommended to prevent broken icons");
    } else {
      setIconUrlWarning("");
    }
  };

  // Handle icon URI change with validation
  const handleIconUriChange = (value: string) => {
    setIconUri(value);
    validateIconUrl(value);
  };

  async function handleDeploy() {
    try {
      if (!connected) {
        await connect?.();
      }
      if (!account || !signer) {
        toast.error("Connect EVM wallet first");
        return;
      }
      if (!name.trim()) {
        toast.error("Token name is required");
        return;
      }
      if (!symbol.trim()) {
        toast.error("Token symbol is required");
        return;
      }

      const usdcLiquidity = ethers.parseUnits(initialBuyAmount || "0", USDC_DECIMALS);
      const tokenLiquidity = ethers.parseUnits(tokenLiquidityAmount || "0", 18);
      if (usdcLiquidity <= 0n) throw new Error("Enter an initial USDC liquidity amount");
      if (tokenLiquidity <= 0n || tokenLiquidity > TOTAL_SUPPLY) {
        throw new Error("Token liquidity must be between 0 and 1,000,000,000");
      }

      setSubmitting(true);
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const usdcBalance = BigInt(await usdc.balanceOf(account));
      if (usdcBalance < usdcLiquidity) {
        throw new Error(`Insufficient USDC balance. Required ${initialBuyAmount} USDC.`);
      }

      toast.info("Confirm token deployment in your wallet");
      const tokenFactory = new ethers.ContractFactory(
        tokenArtifact.abi,
        tokenArtifact.bytecode,
        signer,
      );
      const deployedToken = await tokenFactory.deploy(name.trim(), symbol.trim(), account);
      await deployedToken.waitForDeployment();
      const tokenAddr = await deployedToken.getAddress();
      const token = new ethers.Contract(tokenAddr, tokenArtifact.abi, signer);

      toast.info("Confirm initial supply mint");
      const mintTx = await token.mint(account, TOTAL_SUPPLY);
      await mintTx.wait();

      toast.info("Approve token liquidity");
      await (await token.approve(ROUTER_ADDRESS, tokenLiquidity)).wait();
      toast.info("Approve USDC liquidity");
      await (await usdc.approve(ROUTER_ADDRESS, usdcLiquidity)).wait();

      const router = new ethers.Contract(ROUTER_ADDRESS, ARCDEX_ROUTER_ABI, signer);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
      toast.info("Create the ArcDEX pair and add liquidity");
      const liquidityTx = await router.addLiquidity(
        tokenAddr,
        USDC_ADDRESS,
        tokenLiquidity,
        usdcLiquidity,
        tokenLiquidity * 99n / 100n,
        usdcLiquidity * 99n / 100n,
        account,
        deadline,
      );
      const receipt = await liquidityTx.wait();

      const factory = new ethers.Contract(FACTORY_ADDRESS, ARCDEX_FACTORY_ABI, signer);
      const poolAddr = String(await factory.getPair(tokenAddr, USDC_ADDRESS));
      toast.success("🎉 Token created and listed on ArcDEX!", {
        description: (
          <div className="space-y-1">
            <div>Token: {tokenAddr}</div>
            <div>Pair: {poolAddr}</div>
            <button
              onClick={() => window.open(`${ARC_MAINNET.explorerUrl}/tx/${receipt.hash}`, "_blank")}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
            >
              <ExternalLink size={12} /> View listing transaction
            </button>
          </div>
        ),
        duration: 15000,
      });

      // Reset fields
      setName("");
      setSymbol("");
      setIconUri("");
      setProjectUri("");
      setInitialBuyAmount("");
      setTokenLiquidityAmount("100000000");
    } catch (e: any) {
      const msg = e?.message || String(e);
      const isUserRejection = (e?.code === 4001) || /reject|denied|cancel/i.test(msg);
      if (isUserRejection) {
        toast.info("Transaction cancelled by user");
        return;
      }
      console.error("Deployment error:", e);
      toast.error("Failed to create token", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
            x: [0, -30, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <Badge variant="outline" className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300 mb-4 px-4 py-1">
              <Sparkles className="w-3 h-3 mr-1" />
              LaunchPad
            </Badge>
          </motion.div>
          <motion.h2 
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            Launch Your Token
          </motion.h2>
          <motion.p 
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Deploy a new ERC-20, mint its initial supply, and list it in a USDC pair on ArcDEX.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <motion.div 
            className="lg:col-span-2" 
            initial={{ opacity: 0, x: -20 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="liquid-glass backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/20 shadow-2xl">
                <CardHeader className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-lg" />
                  <CardTitle className="flex items-center gap-3 relative z-10">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Rocket className="w-6 h-6 text-purple-400" />
                    </motion.div>
                    <span className="text-xl">Token Configuration</span>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-8 relative">
                  {/* Floating particles */}
                  <motion.div
                    className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full"
                    animate={{ y: [-10, 10, -10], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute top-16 right-12 w-1 h-1 bg-pink-400 rounded-full"
                    animate={{ y: [10, -10, 10], opacity: [1, 0.3, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      className="relative"
                    >
                      <Label htmlFor="name" className="text-sm font-medium text-foreground/80 mb-2 block">
                        Token Name *
                      </Label>
                      <Input 
                        id="name" 
                        placeholder="My Awesome Token" 
                        className="bg-white/5 border-white/10 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all duration-300" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        required 
                      />
                      {name && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -bottom-6 left-0 text-xs text-green-400"
                        >
                          ✓ Name looks good!
                        </motion.div>
                      )}
                    </motion.div>
                    
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      className="relative"
                    >
                      <Label htmlFor="symbol" className="text-sm font-medium text-foreground/80 mb-2 block">
                        Symbol *
                      </Label>
                      <Input 
                        id="symbol" 
                        placeholder="MAT" 
                        className="bg-white/5 border-white/10 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all duration-300" 
                        value={symbol} 
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        required 
                      />
                      {symbol && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -bottom-6 left-0 text-xs text-green-400"
                        >
                          ✓ Symbol is valid!
                        </motion.div>
                      )}
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <Label htmlFor="icon" className="text-sm font-medium text-foreground/80 mb-2 block">
                        Icon URI (Unsplash Only)
                      </Label>
                      <Input 
                        id="icon" 
                        placeholder="https://images.unsplash.com/photo-..." 
                        className={`bg-white/5 border-white/10 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all duration-300 ${
                          iconUrlWarning ? 'border-yellow-500/50' : ''
                        }`}
                        value={iconUri} 
                        onChange={(e) => handleIconUriChange(e.target.value)} 
                      />
                      {iconUrlWarning && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -bottom-8 left-0 text-xs text-yellow-400 flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {iconUrlWarning}
                        </motion.div>
                      )}
                      {iconUri && !iconUrlWarning && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -bottom-6 left-0 text-xs text-green-400"
                        >
                          ✓ Unsplash URL looks good!
                        </motion.div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="project" className="text-sm font-medium text-foreground/80 mb-2 block">
                        Project URI (Optional)
                      </Label>
                      <Input 
                        id="project" 
                        placeholder="https://example.com" 
                        className="bg-white/5 border-white/10 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all duration-300" 
                        value={projectUri} 
                        onChange={(e) => setProjectUri(e.target.value)} 
                      />
                    </div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="relative"
                  >
                    <Label htmlFor="initialBuy" className="text-sm font-medium text-foreground/80 mb-2 block">
                      Initial USDC Liquidity *
                    </Label>
                    <Input 
                      id="initialBuy" 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="10" 
                      className="bg-white/5 border-white/10 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all duration-300" 
                      value={initialBuyAmount} 
                      onChange={(e) => setInitialBuyAmount(e.target.value)} 
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Canonical USDC deposited into the new ArcDEX pair.
                    </p>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.01 }} className="relative">
                    <Label htmlFor="tokenLiquidity" className="text-sm font-medium text-foreground/80 mb-2 block">
                      Initial Token Liquidity *
                    </Label>
                    <Input
                      id="tokenLiquidity"
                      type="number"
                      step="1"
                      min="1"
                      max="1000000000"
                      placeholder="100000000"
                      className="bg-white/5 border-white/10 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all duration-300"
                      value={tokenLiquidityAmount}
                      onChange={(e) => setTokenLiquidityAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Amount from the one-billion-token initial supply deposited as liquidity.
                    </p>
                  </motion.div>

                  <motion.div 
                    className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Info className="w-6 h-6 text-blue-400 mt-0.5" />
                      </motion.div>
                      <div>
                        <p className="font-semibold text-blue-200 mb-2">ArcDEX-listed Token</p>
                        <ul className="text-blue-300/80 space-y-1 text-sm">
                          <li className="flex items-center gap-2">
                            <Zap className="w-3 h-3" />
                            Fixed supply: 1 billion tokens (18 decimals)
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" />
                            USDC market created through the ArcDEX Factory
                          </li>
                          <li className="flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3" />
                            Initial supply minted to your connected wallet
                          </li>
                          <li className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            LP tokens issued to your connected wallet
                          </li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-200 mb-1">Icon URL Guidelines</p>
                        <p className="text-yellow-300/80 text-sm">
                          Use only Unsplash images (images.unsplash.com) for token icons to ensure reliability and prevent broken images. 
                          Other image sources may cause display issues.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                      </motion.div>
                      ArcDEX factory connected
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        className={`
                          relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 
                          hover:from-purple-500 hover:to-pink-500 border-0 
                          shadow-lg hover:shadow-xl transition-all duration-300
                          ${submitting ? 'animate-pulse' : ''}
                        `}
                        onClick={handleDeploy}
                        disabled={submitting || !name.trim() || !symbol.trim() || !initialBuyAmount || !tokenLiquidityAmount}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 hover:opacity-20 transition-opacity" />
                        <Wallet className="w-4 h-4 mr-2" /> 
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                            />
                            Creating...
                          </span>
                        ) : (
                          "Create & List Token"
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
          </motion.div>

          {/* Preview Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="liquid-glass backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/20 shadow-2xl sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                  Token Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <motion.div 
                  className="rounded-xl p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-sm text-purple-300 mb-3 flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 bg-purple-400 rounded-full"
                    />
                    Your Token
                  </div>
                  <motion.div 
                    className="text-xl font-bold text-white mb-1"
                    key={`token-name-${name}`}
                    initial={{ scale: 0.9, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    {name || "Token Name"}
                  </motion.div>
                  <motion.div 
                    className="text-sm text-purple-300 mb-3"
                    key={`token-symbol-${symbol}`}
                    initial={{ scale: 0.9, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    {symbol || "SYMBOL"}
                  </motion.div>
                  <div className="text-xs text-muted-foreground">
                    Supply: 1,000,000,000 tokens (18 decimals)
                  </div>
                </motion.div>
                
                <motion.div 
                  className="rounded-xl p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-sm font-semibold mb-3 text-blue-200">Network Information</div>
                  <div className="text-xs text-blue-300/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Network: Arc Mainnet (chain 5042)
                    </div>
                    <div className="break-all font-mono">
                      Factory: {`${FACTORY_ADDRESS.substring(0, 10)}...`}
                    </div>
                  </div>
                </motion.div>

                <Tabs defaultValue="bonding" className="w-full">
                  <TabsList className="bg-white/5 border-white/10 w-full">
                    <TabsTrigger value="bonding" className="flex-1 data-[state=active]:bg-purple-500/20">
                      ArcDEX Listing
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="bonding" className="space-y-4 text-sm text-muted-foreground">
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="font-semibold text-foreground">Deployed ArcDEX market</p>
                      <ul className="space-y-2">
                        {[
                          "USDC/GSTEST pair discovery",
                          "Router-based swaps",
                          "On-chain reserve quotes",
                          "Slippage and deadline protection"
                        ].map((item, index) => (
                          <motion.li 
                            key={item}
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                            />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </TabsContent>
                </Tabs>

                <motion.div 
                  className="text-xs text-muted-foreground p-4 rounded-lg bg-white/5 border border-white/10"
                  whileHover={{ borderColor: "rgba(255,255,255,0.2)" }}
                >
                  Gas fees vary by network congestion. You will confirm the exact amount in your wallet.
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Enhanced floating orbs */}
      <motion.div
        className="pointer-events-none fixed right-[-120px] top-[20%] w-[300px] h-[300px] rounded-full opacity-30"
        style={{ 
          background: "radial-gradient(circle at 30% 30%, rgba(139,69,255,0.4), rgba(236,72,153,0.3), transparent 70%)",
          filter: "blur(40px)"
        }}
        animate={{ 
          y: [0, -20, 0], 
          rotate: [0, 180, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 15, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none fixed left-[-120px] bottom-[15%] w-[350px] h-[350px] rounded-full opacity-25"
        style={{ 
          background: "radial-gradient(circle at 70% 40%, rgba(6,182,212,0.4), rgba(139,69,255,0.3), transparent 70%)",
          filter: "blur(50px)"
        }}
        animate={{ 
          y: [0, 25, 0], 
          rotate: [360, 180, 0],
          scale: [1.1, 1, 1.1]
        }}
        transition={{ duration: 18, repeat: Infinity }}
      />

      {/* Additional floating elements */}
      <motion.div
        className="pointer-events-none fixed top-1/4 left-1/3 w-4 h-4 bg-purple-400 rounded-full opacity-60"
        animate={{ 
          y: [-10, 10, -10],
          x: [-5, 5, -5],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none fixed top-3/4 right-1/3 w-3 h-3 bg-pink-400 rounded-full opacity-40"
        animate={{ 
          y: [10, -10, 10],
          x: [5, -5, 5],
          scale: [1.2, 1, 1.2]
        }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </section>
  );
}
