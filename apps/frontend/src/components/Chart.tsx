"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickData, IChartApi, ISeriesApi } from "lightweight-charts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data, isPending } = useQuery({
    queryKey: ["chart"],
    queryFn: async () => await api<CandlestickData[]>("/trade/chart"),
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleChart = (payload: CandlestickData[]) => {
      if (!payload || payload.length === 0) {
        return;
      }
      queryClient.setQueryData(["chart"], payload);
    };

    socket.on("chart", handleChart);

    return () => {
      socket.off("chart", handleChart);
    };
  }, [queryClient, socket]);

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) {
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#000000" },
        textColor: "#eee",
      },
      grid: {
        vertLines: { color: "#545454" },
        horzLines: { color: "#545454" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries();
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (!chartContainerRef.current) {
        return;
      }
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) {
      return;
    }
    seriesRef.current.setData(data);
  }, [data]);

  const lastPrice =
    data && data.length > 0 ? data[data.length - 1].close : "N/A";

  return (
    <div className="">
      <div className="flex items-center justify-between mb-4 mx-4">
        <div>
          <h3 className="text-2xl font-bold">TNV</h3>
        </div>
        <div className="flex items-center gap-3">
          {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
          <p className="text-2xl font-bold text-green-400">${lastPrice}</p>
        </div>
      </div>
      <div
        ref={chartContainerRef}
        className="w-full h-[500px] border rounded-xl cursor-grab active:cursor-grabbing overflow-hidden"
      />
    </div>
  );
}
