"use client";

import Orders from "@/components/Orders";
import Depth from "@/components/Depth";
import { useState } from "react";

export default function OrderPage() {
  const [symbol, setSymbol] = useState("TNV");

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-mono"
        >
          <option value="TNV">TNV</option>
          <option value="AAPL">AAPL</option>
          <option value="GOOGL">GOOGL</option>
          <option value="MSFT">MSFT</option>
          <option value="TSLA">TSLA</option>
        </select>
      </div>
      <div className="flex gap-4">
        <Orders />
        <Depth symbol={symbol} />
      </div>
    </div>
  );
}