import { Chart } from "../types";

// TODO: fix it
type ChartBroadcast = (payload: Chart[]) => void;

let broadcastLatest: ChartBroadcast | null = null;

export function setChartBroadcast(fn: ChartBroadcast | null) {
  broadcastLatest = fn;
}

export async function updateChart(chart: Chart[], redisClient: any) {
  console.log("> updating chart...");
  let currentMinutePrices: number[] = [];
  let lastMinute = Math.floor(Date.now() / 60000) * 60000;

  try {
    const asks = await redisClient.lRange("asks", 0, -1);
    const bids = await redisClient.lRange("bids", 0, -1);
    if (asks.length !== 0 && bids.length !== 0) {
      const bestAsk = JSON.parse(asks[0]);
      const bestBid = JSON.parse(bids[0]);
      const price = (bestAsk.price + bestBid.price) / 2;
      const now = Date.now();
      const currentMinute = Math.floor(now / 60000) * 60000;
      if (currentMinute > lastMinute) {
        // calculate OHLC
        if (currentMinutePrices.length > 0) {
          const open = currentMinutePrices[0];
          const close = currentMinutePrices[currentMinutePrices.length - 1];
          const high = Math.max(...currentMinutePrices);
          const low = Math.min(...currentMinutePrices);
          const candle: Chart = {
            open,
            high,
            low,
            close,
            timestamp: new Date(lastMinute),
          };
          chart.push(candle);
          if (broadcastLatest) {
            broadcastLatest(chart);
          }
          console.log("> added candle to chart");
        }
        currentMinutePrices = [];
        lastMinute = currentMinute;
      }
      currentMinutePrices.push(price);
    }
  } catch (err) {
    console.error("Failed to update chart:", err);
  }
  setTimeout(() => updateChart(chart, redisClient), 60000);
}
