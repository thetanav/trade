"use client";

import Orders from "@/components/Orders";
import OrderHistory from "@/components/OrderHistory";
import Depth from "@/components/Depth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SymbolInfo } from "@/types";

export default function OrderPage() {
  const [symbol, setSymbol] = useState("TNV");

  const { data: symbols } = useQuery({
    queryKey: ["symbols"],
    queryFn: async () => await api<SymbolInfo[]>("/symbols"),
  });

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-mono"
        >
          {(symbols ?? [{ symbol: "TNV", name: "TradeX" }]).map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-4 flex-col lg:flex-row">
        <div className="flex-1 space-y-4">
          <Orders symbol={symbol} />
          <OrderHistory symbol={symbol} />
        </div>
        <div className="w-full lg:w-96">
          <Depth symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
