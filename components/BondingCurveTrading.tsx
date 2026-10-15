"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Coins, RefreshCw } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { formatRaw18 } from "@/lib/amounts";

type IndexedToken = {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  icon_uri?: string | null;
  pool_stats?: {
    hbar_reserves: string;
    token_reserves?: string;
    total_volume: string;
    trade_count: number;
  } | null;
};

export function BondingCurveTrading() {
  const [tokens, setTokens] = useState<IndexedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tokens", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to load indexed tokens");
      setTokens(payload.data);
    } catch (reason) {
      setTokens([]);
      setError(reason instanceof Error ? reason.message : "Unable to load indexed tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary"><BarChart3 className="mr-2 h-4 w-4" />ArcDEX markets</Badge>
          <h1 className="text-4xl font-bold text-gradient-primary">Discover and trade ArcDEX tokens</h1>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">Markets and reserves are read directly from Arc Mainnet pairs.</p>
        </div>
        <div className="mb-8 flex justify-center">
          <Button onClick={() => void refresh()} disabled={loading} variant="outline"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
        </div>
        {error ? <p className="text-center text-red-400">{error}</p> : loading ? <p className="text-center text-muted-foreground">Loading indexed pools…</p> : tokens.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground"><Coins className="mb-4 h-12 w-12" /><p>No indexed Arc pools yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tokens.map((token) => (
              <Link href={`/coin/${token.address}`} key={token.address}>
                <Card className="h-full border-white/10 bg-black/30 transition-transform hover:-translate-y-1 hover:border-cyan-400/40">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {token.icon_uri ? <Image src={token.icon_uri} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 font-bold">{token.symbol.slice(0, 1)}</div>}
                      <div><CardTitle>{token.name}</CardTitle><p className="text-sm text-muted-foreground">{token.symbol}</p></div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground">USDC reserve</p><p className="font-semibold">{formatRaw18(BigInt(token.pool_stats?.hbar_reserves || "0"), 4)}</p></div>
                    <div><p className="text-muted-foreground">Volume</p><p className="font-semibold">{formatRaw18(BigInt(token.pool_stats?.total_volume || "0"), 4)}</p></div>
                    <div><p className="text-muted-foreground">Indexed trades</p><p className="font-semibold">{token.pool_stats?.trade_count || 0}</p></div>
                    <div><p className="text-muted-foreground">Status</p><p className="font-semibold">ArcDEX pair</p></div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
