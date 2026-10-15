import React from "react";
import { formatRaw18 } from "@/lib/amounts";

export function RawAmount({ value, symbol = "USDC", precision = 4 }: { value: string | bigint; symbol?: string; precision?: number }) {
  return <span>{formatRaw18(value, precision)} {symbol}</span>;
}
