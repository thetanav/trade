import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import dotenv from "dotenv";
import { createClient } from "redis";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import tradeRoutes from "./routes/trade";
import { Hono } from "hono";
import { updateChart } from "./utils/chart";
import { chart } from "./memory";

dotenv.config();

export const app = new Hono();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: (c) =>
    c.req.header("CF-Connecting-IP") ||
    c.req.header("X-Forwarded-For") ||
    "127.0.0.1",
});
// app.use(limiter);

const clients = new Set<{
  res: any; // TODO: update for Hono
}>();

// API Routes
app.route("/trade", tradeRoutes);
app.route("/auth", authRoutes);
app.route("/user", userRoutes);

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient
  .connect()
  .then(() => {
    console.log("Connected to Redis");
  })
  .catch((err: unknown) => {
    console.error("Redis connection error:", err);
  });

updateChart(chart, redisClient);

app.get("/ping", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// app.get("/sse/orderbook", (req: Request, res: Response) => {
//   res.set({
//     "Content-Type": "text/event-stream",
//     "Cache-Control": "no-cache",
//     Connection: "keep-alive",
//   });

//   res.flushHeaders();

//   const client = { res };
//   clients.add(client);

//   req.on("close", () => {
//     clients.delete(client);
//   });
// });

export async function sendOrderbook() {
  try {
    const asks = await redisClient.lRange("asks", 0, -1);
    const bids = await redisClient.lRange("bids", 0, -1);
    const orderbook = JSON.stringify({
      type: "orderbook",
      data: {
        asks: asks.map((a) => {
          const parsed = JSON.parse(a);
          return { price: parsed.price, quantity: parsed.quantity };
        }),
        bids: bids.map((b) => {
          const parsed = JSON.parse(b);
          return { price: parsed.price, quantity: parsed.quantity };
        }),
      },
    });
    for (const client of clients) {
      client.res.write(`event: orderbook\n`);
      client.res.write(`data: ${JSON.stringify(orderbook)}\n\n`);
    }
  } catch (err: any) {
    console.error("Failed to broadcast orderbook from Redis", err);
  }
}

export default {
  port: process.env.PORT,
  fetch: app.fetch,
};
