import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import dotenv from "dotenv";
import { createClient } from "redis";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import tradeRoutes from "./routes/trade";
import { Hono } from "hono";
import {
  updateChart,
  setChartBroadcast,
  initChart,
  getCandles,
} from "./utils/chart";
import { db } from "./db";
import { symbols } from "./schema";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { serve } from "@hono/node-server";

dotenv.config();

export const app = new Hono();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: (c) =>
    c.req.header("CF-Connecting-IP") ||
    c.req.header("X-Forwarded-For") ||
    "127.0.0.1",
});

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// API Routes
app.route("/trade", tradeRoutes);
app.route("/auth", authRoutes);
app.route("/user", userRoutes);

export const redisClient = createClient({
  url: process.env.REDIS_URL!,
});

let activeSymbols: string[] = [];

async function init() {
  await redisClient.connect();
  console.log("Connected to Redis");

  // Load active symbols from DB
  const allSymbols = await db.select().from(symbols);
  activeSymbols = allSymbols.map((s) => s.symbol);
  console.log("Active symbols:", activeSymbols);

  // Load chart data from DB
  await initChart(db, activeSymbols);

  // Start chart updater
  updateChart(db, redisClient, activeSymbols);
}

init().catch((err) => console.error("Init error:", err));

app.get("/ping", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/symbols", async (c) => {
  const allSymbols = await db.select().from(symbols);
  return c.json(allSymbols);
});

export async function sendOrderbook(symbol?: string) {
  const syms = symbol ? [symbol] : activeSymbols;
  for (const sym of syms) {
    try {
      const asks = await redisClient.lRange(`asks:${sym}`, 0, -1);
      const bids = await redisClient.lRange(`bids:${sym}`, 0, -1);
      const orderbook = {
        symbol: sym,
        asks: asks.map((a: string) => {
          const parsed = JSON.parse(a);
          return { price: parsed.price, quantity: parsed.quantity };
        }),
        bids: bids.map((b: string) => {
          const parsed = JSON.parse(b);
          return { price: parsed.price, quantity: parsed.quantity };
        }),
      };
      io.to(`symbol:${sym}`).emit("depth", orderbook);
    } catch (err: any) {
      console.error(`Failed to broadcast orderbook for ${sym}`, err);
    }
  }
}

io.on("connection", (socket) => {
  // Client joins symbol room
  socket.on("joinSymbol", (symbol: string) => {
    const sym = symbol.toUpperCase();
    socket.join(`symbol:${sym}`);
    console.log(`Socket ${socket.id} joined symbol:${sym}`);

    // Seed depth for this symbol
    redisClient
      .lRange(`asks:${sym}`, 0, -1)
      .then((asks: string[]) =>
        redisClient.lRange(`bids:${sym}`, 0, -1).then((bids: string[]) => {
          socket.emit("depth", {
            symbol: sym,
            asks: asks.map((a: string) => {
              const parsed = JSON.parse(a);
              return { price: parsed.price, quantity: parsed.quantity };
            }),
            bids: bids.map((b: string) => {
              const parsed = JSON.parse(b);
              return { price: parsed.price, quantity: parsed.quantity };
            }),
          });
        }),
      )
      .catch((err: any) =>
        console.error("Failed to seed depth for symbol:", err),
      );

    // Seed chart for this symbol
    const chart = getCandles(sym);
    socket.emit(
      "chart",
      chart.slice(-720).map((c) => ({
        time: Math.floor(c.timestamp.getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
  });

  socket.on("leaveSymbol", (symbol: string) => {
    socket.leave(`symbol:${symbol.toUpperCase()}`);
  });
});

setChartBroadcast((symbol: string, payload) => {
  io.to(`symbol:${symbol}`).emit(
    "chart",
    payload.slice(-720).map((c) => ({
      time: Math.floor(c.timestamp.getTime() / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })),
  );
});

const port = Number(process.env.PORT) || 8080;

serve({
  fetch: app.fetch,
  createServer: () => httpServer,
  port,
});
