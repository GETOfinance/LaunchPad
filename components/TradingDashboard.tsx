"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { formatRaw18 } from "@/lib/amounts";

type IndexedTrade = {
  id: string;
  fa_address: string;
  trade_type: "BUY" | "SELL";
  hbar_amount: string;
  token_amount: string;
  transaction_hash: string;
  created_at: string;
  fa: { name: string; symbol: string };
};

export function TradingDashboard() {
  const [trades, setTrades] = useState<IndexedTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/trades/recent?limit=12", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => setTrades(payload.success ? payload.data.trades : []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <section className="py-16" aria-labelledby="indexed-activity-title">
      <div className="container mx-auto px-4">
        <Card className="border-white/10 bg-black/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle id="indexed-activity-title" className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              Indexed Arc activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">Confirmed Bought and Sold events from Arc Mainnet. Trade from a token page.</p>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-muted-foreground">Loading indexed events…</p> : trades.length === 0 ? (
              <p className="text-muted-foreground">No indexed trades yet. Run the protected indexer after deployment.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {trades.map((trade) => (
                  <Link key={trade.id} href={`/coin/${trade.fa_address}`} className="grid grid-cols-2 gap-2 py-3 text-sm transition-colors hover:bg-white/5 md:grid-cols-5">
                    <span className="font-medium">{trade.fa.name} ({trade.fa.symbol})</span>
                    <Badge variant="outline" className={trade.trade_type === "BUY" ? "text-emerald-400" : "text-orange-400"}>{trade.trade_type}</Badge>
                    <span>{formatRaw18(BigInt(trade.hbar_amount), 4)} USDC</span>
                    <span>{formatRaw18(BigInt(trade.token_amount), 4)} {trade.fa.symbol}</span>
                    <time className="text-muted-foreground">{new Date(trade.created_at).toLocaleString()}</time>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
