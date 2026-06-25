"use client";

import Chart from "@/components/Chart";
import MakeOrder from "@/components/MakeOrder";
import Depth from "@/components/Depth";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SymbolInfo } from "@/types";

export default function TradePage() {
  const [symbol, setSymbol] = useState("TNV");

  const { data: symbols } = useQuery({
    queryKey: ["symbols"],
    queryFn: async () => await api<SymbolInfo[]>("/symbols"),
  });

  return (
    <div className="px-2 py-6">
      <div className="mb-4">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-card border border-border rounded-lg px-4 py-2 text-lg font-bold font-mono"
        >
          {symbols?.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Chart symbol={symbol} />
        </div>
        <div className="w-96 flex flex-col gap-2 h-full">
          <MakeOrder symbol={symbol} />
          <Depth symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
