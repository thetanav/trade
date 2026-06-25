import { Hono } from "hono";
import { redisClient, sendOrderbook } from "../index";
import { db } from "../db";
import { transactions, users, portfolios, candles } from "../schema";
import { eq, sql, and, desc } from "drizzle-orm";
import auth from "../middleware/jwt";
import { z } from "zod";

const router = new Hono();

const makeOrderSchema = z.object({
  side: z.enum(["bid", "ask"]),
  symbol: z.string().min(1).max(10).default("TNV"),
  price: z
    .number()
    .refine(
      (val) => Number.isFinite(val) && Math.round(val * 100) === val * 100,
      { message: "Must have at most 2 decimal places" },
    ),
  market: z.boolean().default(false),
  quantity: z.int().positive(),
});

function symbolKey(symbol: string, side: string): string {
  return `${side === "bid" ? "bids" : "asks"}:${symbol.toUpperCase()}`;
}

async function getPortfolio(userId: number, symbol: string): Promise<number> {
  const row = await db
    .select()
    .from(portfolios)
    .where(
      and(eq(portfolios.userId, userId), eq(portfolios.symbol, symbol)),
    );
  return row.length > 0 ? Number(row[0].quantity) : 0;
}

async function updatePortfolio(
  userId: number,
  symbol: string,
  delta: number,
) {
  await db
    .update(portfolios)
    .set({
      quantity: sql`${portfolios.quantity} + ${delta}`,
    })
    .where(
      and(eq(portfolios.userId, userId), eq(portfolios.symbol, symbol)),
    );
}

// Insert order in price-time priority order
async function insertSorted(
  key: string,
  order: any,
) {
  const orders = (await redisClient.lRange(key, 0, -1)).map((o: string) =>
    JSON.parse(o),
  );
  const isAsk = key.startsWith("asks");

  let insertIdx = orders.length;
  for (let i = 0; i < orders.length; i++) {
    if (isAsk) {
      // Asks: ascending price, then FIFO by timestamp
      if (
        order.price < orders[i].price ||
        (order.price === orders[i].price && order.timestamp < orders[i].timestamp)
      ) {
        insertIdx = i;
        break;
      }
    } else {
      // Bids: descending price, then FIFO by timestamp
      if (
        order.price > orders[i].price ||
        (order.price === orders[i].price && order.timestamp < orders[i].timestamp)
      ) {
        insertIdx = i;
        break;
      }
    }
  }

  if (insertIdx === 0) {
    await redisClient.lPush(key, JSON.stringify(order));
  } else if (insertIdx >= orders.length) {
    await redisClient.rPush(key, JSON.stringify(order));
  } else {
    await redisClient.lInsert(
      key,
      "BEFORE",
      JSON.stringify(orders[insertIdx]),
      JSON.stringify(order),
    );
  }
}

// Rebuild an entire Redis list atomically
async function rebuildList(key: string, orders: any[]) {
  if (orders.length === 0) {
    await redisClient.del(key);
    return;
  }
  const multi = redisClient.multi();
  multi.del(key);
  multi.rPush(key, orders.map((o) => JSON.stringify(o)));
  await multi.exec();
}

router.post("/makeorder", auth, async (c) => {
  const { side, symbol, price, quantity, market } =
    await makeOrderSchema.parseAsync(await c.req.json());

  const jwt = (c as any).jwt;
  const userRow = await db
    .select()
    .from(users)
    .where(eq(users.email, jwt.email));
  const userData = userRow[0];
  const userId = userData.id;
  const sym = symbol.toUpperCase();
  const key = symbolKey(sym, side);

  const holdingQty = await getPortfolio(userId, sym);

  if (market) {
    if (side === "bid") {
      const asks = (await redisClient.lRange(key, 0, -1)).map((a: any) =>
        JSON.parse(a),
      );
      if (asks.length === 0) {
        return c.json({
          ok: false,
          msg: `No asks available for market order on ${sym}.`,
        });
      }
      const minAskPrice = Math.min(...asks.map((a) => a.price));
      if (Number(userData.cash) < minAskPrice * quantity) {
        return c.json({
          ok: false,
          msg: `Not enough cash for market order on ${sym}.`,
        });
      }
    } else {
      const bids = (await redisClient.lRange(key, 0, -1)).map((b: any) =>
        JSON.parse(b),
      );
      if (bids.length === 0) {
        return c.json({
          ok: false,
          msg: `No bids available for market order on ${sym}.`,
        });
      }
      if (holdingQty < quantity) {
        return c.json({
          ok: false,
          msg: `Not enough ${sym} for market order. You have ${holdingQty}.`,
        });
      }
    }
  } else {
    if (side === "bid") {
      if (Number(userData.cash) < price * quantity) {
        return c.json({
          ok: false,
          msg: `Not enough cash.`,
        });
      }
    } else {
      if (holdingQty < quantity) {
        return c.json({
          ok: false,
          msg: `Not enough ${sym}. You have ${holdingQty}.`,
        });
      }
    }
  }

  const remainingQty = await fillOrders(
    side,
    sym,
    price,
    quantity,
    userId,
    market,
  );
  if (remainingQty === 0) {
    sendOrderbook(sym);
    return c.json({
      ok: true,
      msg: `All quantity of ${quantity} filled on ${sym}.`,
    });
  }

  if (market) {
    sendOrderbook(sym);
    return c.json({
      ok: false,
      msg: `Market order partially filled. ${quantity - remainingQty} filled.`,
    });
  }

  const orderId = `${Date.now()}-${userId}-${Math.random().toString(36).substr(2, 9)}`;
  const order = {
    orderId,
    userId,
    symbol: sym,
    price,
    quantity: remainingQty,
    timestamp: Date.now(),
  };
  await insertSorted(key, order);

  sendOrderbook(sym);
  return c.json({
    ok: true,
    msg: `${quantity - remainingQty} filled. ${remainingQty} placed in orderbook.`,
  });
});

async function fillOrders(
  side: string,
  symbol: string,
  price: number,
  quantity: number,
  userId: number,
  market: boolean = false,
): Promise<number> {
  const key = symbolKey(symbol, side);
  let remainingQty = quantity;

  const orders = (await redisClient.lRange(key, 0, -1)).map((o: string) =>
    JSON.parse(o),
  );

  if (side === "bid") {
    // Sort asks by price asc, then timestamp asc (FIFO)
    orders.sort((a: any, b: any) =>
      a.price !== b.price ? a.price - b.price : a.timestamp - b.timestamp,
    );
  } else {
    // Sort bids by price desc, then timestamp asc (FIFO)
    orders.sort((a: any, b: any) =>
      a.price !== b.price ? b.price - a.price : a.timestamp - b.timestamp,
    );
  }

  const result: any[] = [];
  for (const ord of orders) {
    if (remainingQty <= 0) {
      result.push(ord);
      continue;
    }
    if (ord.userId === userId) {
      result.push(ord);
      continue;
    }

    const shouldMatch = market
      ? true
      : side === "bid"
        ? ord.price <= price
        : ord.price >= price;

    if (!shouldMatch) {
      result.push(ord);
      continue;
    }

    if (ord.quantity > remainingQty) {
      if (side === "bid") {
        flipBalance(symbol, ord.userId, userId, remainingQty, ord.price);
      } else {
        flipBalance(symbol, userId, ord.userId, remainingQty, ord.price);
      }
      ord.quantity -= remainingQty;
      result.push(ord);
      remainingQty = 0;
    } else {
      if (side === "bid") {
        flipBalance(symbol, ord.userId, userId, ord.quantity, ord.price);
      } else {
        flipBalance(symbol, userId, ord.userId, ord.quantity, ord.price);
      }
      remainingQty -= ord.quantity;
    }
  }

  await rebuildList(key, result);
  return remainingQty;
}

async function flipBalance(
  symbol: string,
  userId1: number,
  userId2: number,
  quantity: number,
  price: number,
) {
  // User1: seller — decrease portfolio, increase cash
  await updatePortfolio(userId1, symbol, -quantity);
  await db
    .update(users)
    .set({
      cash: sql`${users.cash} + ${quantity * price}`,
      stock: sql`GREATEST(${users.stock} - ${quantity}, 0)`,
    })
    .where(eq(users.id, userId1));
  await db.insert(transactions).values({
    user_id: userId1,
    symbol,
    type: "sell",
    quantity: quantity.toString(),
    price: price.toString(),
  });

  // User2: buyer — increase portfolio, decrease cash
  await updatePortfolio(userId2, symbol, quantity);
  await db
    .update(users)
    .set({
      cash: sql`${users.cash} - ${quantity * price}`,
      stock: sql`${users.stock} + ${quantity}`,
    })
    .where(eq(users.id, userId2));
  await db.insert(transactions).values({
    user_id: userId2,
    symbol,
    type: "buy",
    quantity: quantity.toString(),
    price: price.toString(),
  });
}

router.get("/chart", async (c) => {
  const symbol = (c.req.query("symbol") || "TNV").toUpperCase();
  try {
    const rows = await db
      .select()
      .from(candles)
      .where(eq(candles.symbol, symbol))
      .orderBy(desc(candles.timestamp))
      .limit(720);
    return c.json(
      rows.reverse().map((r) => ({
        time: Math.floor(new Date(r.timestamp).getTime() / 1000),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
      })),
    );
  } catch {
    return c.json([]);
  }
});

router.get("/depth", async (c) => {
  const symbol = (c.req.query("symbol") || "TNV").toUpperCase();
  try {
    const asks = await redisClient.lRange(`asks:${symbol}`, 0, -1);
    const bids = await redisClient.lRange(`bids:${symbol}`, 0, -1);
    return c.json({
      ok: true,
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
  } catch (err) {
    return c.json(
      { ok: false, error: "Failed to fetch orderbook from Redis" },
      500,
    );
  }
});

router.get("/myorders", auth, async (c) => {
  const jwt = (c as any).jwt;
  const symbol = (c.req.query("symbol") || "TNV").toUpperCase();
  const userRow = await db
    .select()
    .from(users)
    .where(eq(users.email, jwt.email));
  const userId = userRow[0].id;

  try {
    const asks = (await redisClient.lRange(`asks:${symbol}`, 0, -1))
      .map((a) => JSON.parse(a))
      .filter((a: any) => a.userId === userId);
    const bids = (await redisClient.lRange(`bids:${symbol}`, 0, -1))
      .map((b) => JSON.parse(b))
      .filter((b: any) => b.userId === userId);

    return c.json({
      ok: true,
      data: {
        asks: asks.map((a: any) => ({
          orderId: a.orderId,
          price: a.price,
          quantity: a.quantity,
          symbol: a.symbol,
        })),
        bids: bids.map((b: any) => ({
          orderId: b.orderId,
          price: b.price,
          quantity: b.quantity,
          symbol: b.symbol,
        })),
      },
    });
  } catch (err) {
    return c.json({ ok: false, error: "Failed to fetch orders" }, 500);
  }
});

router.post("/cancelorder", auth, async (c) => {
  const { orderId, side, symbol } = await c.req.json();
  const jwt = (c as any).jwt;
  const userRow = await db
    .select()
    .from(users)
    .where(eq(users.email, jwt.email));
  const userId = userRow[0].id;
  const sym = (symbol || "TNV").toUpperCase();

  try {
    const key = symbolKey(sym, side);
    const orders = await redisClient.lRange(key, 0, -1);

    for (const order of orders) {
      const parsed = JSON.parse(order);
      if (parsed.orderId === orderId && parsed.userId === userId) {
        await redisClient.lRem(key, 1, order);
        sendOrderbook(sym);
        return c.json({
          ok: true,
          msg: "Order cancelled successfully.",
        });
      }
    }

    return c.json({
      ok: false,
      msg: "Order not found or you don't have permission.",
    });
  } catch (err) {
    return c.json({ ok: false, error: "Failed to cancel order" }, 500);
  }
});

export default router;
