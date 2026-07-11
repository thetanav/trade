import { Chart } from "../types";
import { candles as candlesTable } from "../schema";
import { eq, desc } from "drizzle-orm";

type ChartBroadcast = (symbol: string, payload: Chart[]) => void;

let broadcastLatest: ChartBroadcast | null = null;

export function setChartBroadcast(fn: ChartBroadcast | null) {
  broadcastLatest = fn;
}

const candlesPerSymbol: Map<string, Chart[]> = new Map();
const pricesPerSymbol: Map<string, number[]> = new Map();
const lastMinutePerSymbol: Map<string, number> = new Map();

export function getCandles(symbol: string): Chart[] {
  return candlesPerSymbol.get(symbol) || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initChart(db: any, symbols: string[]) {
  for (const symbol of symbols) {
    try {
      const rows = await db
        .select()
        .from(candlesTable)
        .where(eq(candlesTable.symbol, symbol))
        .orderBy(desc(candlesTable.timestamp))
        .limit(720);

      const chart: Chart[] = rows.reverse().map((r: any) => ({
        timestamp: new Date(r.timestamp),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
      }));

      candlesPerSymbol.set(symbol, chart);
      lastMinutePerSymbol.set(
        symbol,
        chart.length > 0
          ? Math.floor(chart[chart.length - 1].timestamp.getTime() / 60000) * 60000
          : Math.floor(Date.now() / 60000) * 60000,
      );
      pricesPerSymbol.set(symbol, []);
      console.log(`> loaded ${chart.length} candles for ${symbol}`);
    } catch (err) {
      console.error(`Failed to load candles for ${symbol}:`, err);
      candlesPerSymbol.set(symbol, []);
      pricesPerSymbol.set(symbol, []);
      lastMinutePerSymbol.set(symbol, Math.floor(Date.now() / 60000) * 60000);
    }
  }
}

export async function updateChartForSymbol(
  db: any,
  redisClient: any,
  symbol: string,
) {
  const chart = candlesPerSymbol.get(symbol) || [];
  let prices = pricesPerSymbol.get(symbol) || [];
  let lastMinute = lastMinutePerSymbol.get(symbol) || Math.floor(Date.now() / 60000) * 60000;

  try {
    const asks = await redisClient.lRange(`asks:${symbol}`, 0, -1);
    const bids = await redisClient.lRange(`bids:${symbol}`, 0, -1);
    if (asks.length !== 0 && bids.length !== 0) {
      const bestAskPrices = asks.map((a: string) => JSON.parse(a).price);
      const bestBidPrices = bids.map((b: string) => JSON.parse(b).price);
      const bestAsk = Math.min(...bestAskPrices);
      const bestBid = Math.max(...bestBidPrices);
      const price = (bestAsk + bestBid) / 2;
      const now = Date.now();
      const currentMinute = Math.floor(now / 60000) * 60000;

      if (currentMinute > lastMinute) {
        if (prices.length > 0) {
          const open = prices[0];
          const close = prices[prices.length - 1];
          const high = Math.max(...prices);
          const low = Math.min(...prices);
          const candle: Chart = {
            open,
            high,
            low,
            close,
            timestamp: new Date(lastMinute),
          };

          chart.push(candle);
          candlesPerSymbol.set(symbol, chart);

          // Persist to DB
          try {
            await db.insert(candlesTable).values({
              symbol,
              timestamp: candle.timestamp,
              open: open.toString(),
              high: high.toString(),
              low: low.toString(),
              close: close.toString(),
              volume: "0",
            });
          } catch (err) {
            console.error(`Failed to persist candle for ${symbol}:`, err);
          }

          if (broadcastLatest) {
            broadcastLatest(symbol, chart);
          }
          console.log(`> added candle for ${symbol}`);
        }
        prices = [];
        lastMinute = currentMinute;
      }
      prices.push(price);
      pricesPerSymbol.set(symbol, prices);
      lastMinutePerSymbol.set(symbol, lastMinute);
    }
  } catch (err) {
    console.error(`Failed to update chart for ${symbol}:`, err);
  }
}

export async function updateChart(
  db: any,
  redisClient: any,
  symbols: string[],
) {
  for (const symbol of symbols) {
    await updateChartForSymbol(db, redisClient, symbol);
  }
  setTimeout(() => updateChart(db, redisClient, symbols), 60000);
}
