"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type FormData = {
  side: "bid" | "ask";
  price: string;
  quantity: string;
  market: boolean;
};

type MakeOrderResponse = {
  ok: boolean;
  msg: string;
};

const MakeOrder = () => {
  const [formData, setFormData] = useState<FormData>({
    side: "bid",
    price: "",
    quantity: "",
    market: false,
  });

  const { isPending, mutate } = useMutation({
    mutationFn: async (data: FormData) =>
      await api<MakeOrderResponse>("/trade/makeorder", {
        method: "POST",
        body: JSON.stringify({
          side: data.side,
          price: Number(data.price),
          quantity: Number(data.quantity),
          market: data.market,
        }),
      }),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(data.msg || "Order submitted successfully!");
        setFormData((prev) => ({ ...prev, price: "", quantity: "" }));
      } else {
        toast.info(data.msg);
      }
    },
    onError: () => {
      toast.warning("Network busy.");
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.market && !formData.quantity) {
      toast.error("Quantity is required for market orders.");
      return;
    }
    if (!formData.market && (!formData.price || !formData.quantity)) {
      toast.error("Price and quantity are required for limit orders.");
      return;
    }
    mutate(formData);
  };

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Place Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={formData.side}
          onValueChange={(v: string) =>
            setFormData((prev) => ({ ...prev, side: v as "bid" | "ask" }))
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="bid"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              BUY
            </TabsTrigger>
            <TabsTrigger
              value="ask"
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
            >
              SELL
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center space-x-2">
          <Switch
            id="market-mode"
            checked={formData.market}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, market: checked, price: "" }))
            }
          />
          <Label htmlFor="market-mode" className="text-sm font-medium">
            Market Order
          </Label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!formData.market && (
            <div className="space-y-1">
              <Label htmlFor="price" className="text-sm">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="0.00"
                required={!formData.market}
                className="font-mono"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="quantity" className="text-sm">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              step="1"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, quantity: e.target.value }))
              }
              placeholder="0"
              required
              className="font-mono"
            />
          </div>

          <Button
            type="submit"
            className={`w-full font-medium ${
              formData.side === "bid"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
            variant={formData.side === "bid" ? "default" : "destructive"}
            disabled={
              isPending ||
              (!formData.market && !formData.price) ||
              !formData.quantity
            }
          >
            {isPending
              ? "Processing..."
              : formData.market
                ? formData.side === "bid"
                  ? "Market Buy"
                  : "Market Sell"
                : formData.side === "bid"
                  ? "Limit Buy"
                  : "Limit Sell"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MakeOrder;
