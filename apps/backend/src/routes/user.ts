import { Hono } from "hono";
import auth from "../middleware/jwt";
import { db } from "../db";
import { transactions, users, portfolios, symbols } from "../schema";
import { eq } from "drizzle-orm";

const router = new Hono<{
  Variables: {
    jwt: any;
  };
}>();

router.get("/", auth, async (c) => {
  const jwt = (c as any).jwt;
  const row = await db
    .select()
    .from(users)
    .where(eq(users.email, jwt.email));
  const user = row[0];
  const portfolio = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, user.id));
  return c.json({
    cash: user.cash,
    stock: user.stock,
    portfolio: portfolio.map((p) => ({
      symbol: p.symbol,
      quantity: Number(p.quantity),
    })),
    createdAt: user.createdAt,
    email: user.email,
    name: user.name,
  });
});

router.get("/verify", auth, async (c) => {
  const jwt = (c as any).jwt;
  return c.json({ user: jwt });
});

router.get("/transactions", auth, async (c) => {
  const jwt = (c as any).jwt;
  const row = await db
    .select()
    .from(users)
    .where(eq(users.email, jwt.email));
  const user = row[0];
  const data = await db
    .select()
    .from(transactions)
    .where(eq(transactions.user_id, user.id));
  return c.json(data);
});

router.get("/symbols", async (c) => {
  const allSymbols = await db.select().from(symbols);
  return c.json(allSymbols);
});

router.get("/u/:id", async (c) => {
  const id = c.req.param('id');
  const row = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(id)));
  const user = row[0];
  return c.json(user);
});

export default router;
