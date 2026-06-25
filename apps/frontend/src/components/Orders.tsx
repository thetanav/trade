"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

type Order = {
  orderId: string;
  price: number;
  quantity: number;
  symbol: string;
};

type OrdersResponse = {
  ok: boolean;
  data?: {
    asks: Order[];
    bids: Order[];
  };
};

type CancelOrderResponse = {
  ok: boolean;
  msg?: string;
  error?: string;
};

export default function Orders() {
  const [symbol, setSymbol] = useState("TNV");
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery<OrdersResponse>({
    queryKey: ["myorders", symbol],
    queryFn: async () =>
      await api<OrdersResponse>(`/trade/myorders?symbol=${symbol}`),
    refetchOnWindowFocus: true,
    retry: false,
  });

  const cancelOrder = useMutation({
    mutationFn: async ({
      orderId,
      side,
      symbol: sym,
    }: { orderId: string; side: string; symbol: string }) =>
      await api<CancelOrderResponse>("/trade/cancelorder", {
        method: "POST",
        body: JSON.stringify({ orderId, side, symbol: sym }),
      }),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success("Order cancelled successfully!");
        queryClient.invalidateQueries({ queryKey: ["myorders"] });
        queryClient.invalidateQueries({ queryKey: ["depth"] });
      } else {
        toast.info(data.msg);
      }
    },
    onError: () => {
      toast.error("Failed to cancel order.");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">My Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  const orders = data?.data;
  const hasOrders =
    orders && (orders.asks.length > 0 || orders.bids.length > 0);

  return (
    <Card className="shadow-md border-0 w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Active Orders
          <div className="flex items-center gap-2">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-transparent border border-border rounded px-2 py-1 text-xs font-mono"
            >
              <option value="TNV">TNV</option>
              <option value="AAPL">AAPL</option>
              <option value="GOOGL">GOOGL</option>
              <option value="MSFT">MSFT</option>
              <option value="TSLA">TSLA</option>
            </select>
            <Button
              onClick={() => refetch()}
              variant="ghost"
              size="icon"
              disabled={isLoading}>
              <RefreshCcw className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasOrders ? (
          <div className="text-muted-foreground text-sm">No active orders.</div>
        ) : (
          <div className="space-y-3">
            {orders?.bids.map((order) => (
              <div
                key={order.orderId}
                className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                    BUY
                  </span>
                  <Button
                    onClick={() =>
                      cancelOrder.mutate({
                        orderId: order.orderId,
                        side: "bid",
                        symbol,
                      })
                    }
                    variant="outline"
                    size="sm"
                    disabled={cancelOrder.isPending}>
                    <X className="w-4 h-4" /> Close Order
                  </Button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Qty: {order.quantity}
                  </span>
                  <span className="font-mono font-medium">
                    ${order.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {orders?.asks.map((order) => (
              <div
                key={order.orderId}
                className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">
                    SELL
                  </span>
                  <Button
                    onClick={() =>
                      cancelOrder.mutate({
                        orderId: order.orderId,
                        side: "ask",
                        symbol,
                      })
                    }
                    variant="outline"
                    size="sm"
                    disabled={cancelOrder.isPending}>
                    <X className="w-4 h-4" /> Close Order
                  </Button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Qty: {order.quantity}
                  </span>
                  <span className="font-mono font-medium">
                    ${order.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
