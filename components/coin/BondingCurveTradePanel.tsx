"use client";

import { ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRaw } from "@/lib/amounts";

type Props = {
  symbol: string;
  balanceRaw: bigint;
  buyAmount: string;
  sellAmount: string;
  buyQuoteRaw: bigint;
  sellQuoteRaw: bigint;
  tokenDecimals: number;
  usdcDecimals: number;
  slippageBps: number;
  deadlineMinutes: number;
  pending: boolean;
  connected: boolean;
  onBuyAmount: (value: string) => void;
  onSellAmount: (value: string) => void;
  onSlippageBps: (value: number) => void;
  onDeadlineMinutes: (value: number) => void;
  onBuy: () => void;
  onSell: () => void;
};

export function BondingCurveTradePanel(props: Props) {
  return (
    <div className="space-y-5 p-6">
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/20 p-3 text-sm">
        <div><p className="text-muted-foreground">Your balance</p><p className="font-semibold">{formatRaw(props.balanceRaw, props.tokenDecimals, 4)} {props.symbol}</p></div>
        <div><p className="text-muted-foreground">Execution</p><p className="font-semibold">ArcDEX Router</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="trade-slippage">Slippage (%)</Label><Input id="trade-slippage" type="number" min="0" max="50" step="0.1" value={props.slippageBps / 100} onChange={(event) => props.onSlippageBps(Math.max(0, Math.min(5000, Math.round(Number(event.target.value) * 100))))} /></div>
        <div><Label htmlFor="trade-deadline">Deadline (minutes)</Label><Input id="trade-deadline" type="number" min="1" max="120" value={props.deadlineMinutes} onChange={(event) => props.onDeadlineMinutes(Math.max(1, Math.min(120, Number(event.target.value) || 10)))} /></div>
      </div>
      <Tabs defaultValue="buy">
        <TabsList className="grid w-full grid-cols-2 bg-muted/20"><TabsTrigger value="buy"><TrendingUp className="mr-2 h-4 w-4" />Buy</TabsTrigger><TabsTrigger value="sell"><TrendingDown className="mr-2 h-4 w-4" />Sell</TabsTrigger></TabsList>
        <TabsContent value="buy" className="mt-5 space-y-4">
          <div><Label htmlFor="buy-usdc">USDC amount</Label><Input id="buy-usdc" type="number" min="0" value={props.buyAmount} onChange={(event) => props.onBuyAmount(event.target.value)} /></div>
          <ArrowUpDown className="mx-auto h-5 w-5 text-muted-foreground" />
          <div><Label>Estimated output</Label><Input readOnly value={formatRaw(props.buyQuoteRaw, props.tokenDecimals, 6)} /><p className="mt-1 text-xs text-muted-foreground">{props.symbol}</p></div>
          <Button className="w-full bg-gradient-primary" onClick={props.onBuy} disabled={!props.buyAmount || !props.connected || props.pending}>{props.pending ? "Confirming…" : `Buy ${props.symbol}`}</Button>
        </TabsContent>
        <TabsContent value="sell" className="mt-5 space-y-4">
          <div><Label htmlFor="sell-token">Token amount</Label><Input id="sell-token" type="number" min="0" value={props.sellAmount} onChange={(event) => props.onSellAmount(event.target.value)} /></div>
          <ArrowUpDown className="mx-auto h-5 w-5 text-muted-foreground" />
          <div><Label>Estimated output</Label><Input readOnly value={formatRaw(props.sellQuoteRaw, props.usdcDecimals, 6)} /><p className="mt-1 text-xs text-muted-foreground">USDC</p></div>
          <Button className="w-full bg-gradient-secondary" onClick={props.onSell} disabled={!props.sellAmount || !props.connected || props.pending}>{props.pending ? "Confirming…" : `Sell ${props.symbol}`}</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
