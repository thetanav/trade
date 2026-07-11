"use client";

import { User as UserType } from "../types";
import { Loader2, RefreshCcw, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Image from "next/image";

function midPrice(bids: { price: number }[], asks: { price: number }[]): number {
  if (bids.length && asks.length) {
    return (bids[0].price + asks[0].price) / 2;
  }
  if (bids.length) return bids[0].price;
  if (asks.length) return asks[0].price;
  return 0;
}

const Profile = () => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["user_info"],
    queryFn: async () => await api<UserType | null>("/user"),
  });

  const symbols = data?.portfolio?.map((p) => p.symbol) ?? [];

  const { data: prices } = useQuery({
    queryKey: ["portfolio_prices", symbols],
    queryFn: async () => {
      const map: Record<string, number> = {};
      await Promise.all(
        symbols.map(async (sym) => {
          try {
            const res = await api<{
              ok: boolean;
              data: { bids: { price: number }[]; asks: { price: number }[] };
            }>(`/trade/depth?symbol=${sym}`);
            map[sym] = midPrice(res.data.bids, res.data.asks);
          } catch {
            map[sym] = 0;
          }
        }),
      );
      return map;
    },
    enabled: symbols.length > 0,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-md border-0">
        <CardContent className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading profile...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.email) {
    return (
      <Card className="shadow-md border-0">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sign in to view your portfolio.
        </CardContent>
      </Card>
    );
  }

  // Estimate portfolio value using mid-market prices from order book
  const portfolioValue =
    data.portfolio?.reduce(
      (sum, p) => sum + Number(p.quantity) * (prices?.[p.symbol] ?? 0),
      0,
    ) || 0;
  const totalValue = Number(data.cash) + portfolioValue;

  return (
    <Card className="shadow-md border-0 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-primary/20">
            <Image
              src={"https://avatar.vercel.sh/" + data.name}
              alt="avatar"
              width={48}
              height={48}
              draggable={false}
              className="w-full h-full rounded-full select-none"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base truncate">{data.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {data.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-primary/10"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw
            className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">
            Total Portfolio Value
          </p>
          <p className="font-mono text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            $
            {totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                Cash Balance
              </p>
            </div>
            <p className="font-mono font-semibold text-green-700 dark:text-green-400">
              ${Number(data.cash).toLocaleString()}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                Holdings
              </p>
            </div>
            <div className="space-y-1">
              {data.portfolio?.map((p) => (
                <div key={p.symbol} className="flex justify-between text-xs">
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {p.symbol}
                  </span>
                  <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                    {Number(p.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {data.createdAt && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              Member since {formatDate(data.createdAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Profile;
