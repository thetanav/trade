import type { Chart } from "./types";

export type DepthPayload = {
  symbol: string;
  asks: { price: number; quantity: number }[];
  bids: { price: number; quantity: number }[];
};

export type ChartPayload = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}[];

type SseClient = {
  id: string;
  symbol: string;
  send: (event: string, data: unknown) => Promise<void>;
  close: () => void;
};

const clients = new Map<string, SseClient>();

export function registerSseClient(client: SseClient) {
  clients.set(client.id, client);
}

export function unregisterSseClient(id: string) {
  clients.delete(id);
}

export function getSseClientCount(symbol?: string) {
  if (!symbol) return clients.size;
  let count = 0;
  for (const client of clients.values()) {
    if (client.symbol === symbol) count += 1;
  }
  return count;
}

async function emitToSymbol(symbol: string, event: string, data: unknown) {
  const dead: string[] = [];
  const tasks: Promise<void>[] = [];

  for (const client of clients.values()) {
    if (client.symbol !== symbol) continue;
    tasks.push(
      client.send(event, data).catch(() => {
        dead.push(client.id);
      }),
    );
  }

  await Promise.all(tasks);
  for (const id of dead) {
    const client = clients.get(id);
    client?.close();
    clients.delete(id);
  }
}

export function broadcastDepth(payload: DepthPayload) {
  return emitToSymbol(payload.symbol, "depth", payload);
}

export function broadcastChart(symbol: string, chart: Chart[]) {
  const payload: ChartPayload = chart.slice(-720).map((c) => ({
    time: Math.floor(c.timestamp.getTime() / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
  return emitToSymbol(symbol, "chart", payload);
}

export function formatChartPayload(chart: Chart[]): ChartPayload {
  return chart.slice(-720).map((c) => ({
    time: Math.floor(c.timestamp.getTime() / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}
