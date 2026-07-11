type DepthHandler = (payload: unknown) => void;
type ChartHandler = (payload: unknown) => void;

type SymbolStream = {
  source: EventSource;
  refCount: number;
  depthHandlers: Set<DepthHandler>;
  chartHandlers: Set<ChartHandler>;
};

const streams = new Map<string, SymbolStream>();

function getBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  return base.replace(/\/$/, "");
}

function ensureStream(symbol: string): SymbolStream | null {
  const existing = streams.get(symbol);
  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const base = getBaseUrl();
  if (!base) return null;

  const url = `${base}/events?symbol=${encodeURIComponent(symbol)}`;
  let source: EventSource;
  try {
    source = new EventSource(url, { withCredentials: true });
  } catch {
    return null;
  }

  const stream: SymbolStream = {
    source,
    refCount: 1,
    depthHandlers: new Set(),
    chartHandlers: new Set(),
  };

  source.addEventListener("depth", (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent).data);
      for (const handler of stream.depthHandlers) handler(payload);
    } catch {
      // ignore
    }
  });

  source.addEventListener("chart", (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent).data);
      for (const handler of stream.chartHandlers) handler(payload);
    } catch {
      // ignore
    }
  });

  source.onerror = () => {
    // Browser auto-reconnects EventSource; nothing to do here
  };

  streams.set(symbol, stream);
  return stream;
}

export function subscribeMarketStream(
  symbol: string,
  handlers: { onDepth?: DepthHandler; onChart?: ChartHandler },
) {
  const stream = ensureStream(symbol);
  if (!stream) {
    return () => {};
  }

  if (handlers.onDepth) stream.depthHandlers.add(handlers.onDepth);
  if (handlers.onChart) stream.chartHandlers.add(handlers.onChart);

  return () => {
    if (handlers.onDepth) stream.depthHandlers.delete(handlers.onDepth);
    if (handlers.onChart) stream.chartHandlers.delete(handlers.onChart);

    stream.refCount = Math.max(0, stream.refCount - 1);
    if (stream.refCount === 0) {
      stream.source.close();
      streams.delete(symbol);
    }
  };
}
