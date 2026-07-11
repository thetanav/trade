import { Hono, type Context } from "hono";
import { setCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, symbols, portfolios } from "../schema";

const router = new Hono();
dotenv.config();

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // seconds

function setAuthCookie(c: Context, token: string) {
  setCookie(c, "auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

router.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ ok: false, msg: "Email and password are required" }, 400);
    }

    const userRow = await db.select().from(users).where(eq(users.email, email));
    const userData = userRow[0];

    if (!userData) {
      return c.json({ ok: false, msg: "No account found" }, 401);
    }

    const isMatch = await bcrypt.compare(password, userData.password!);
    if (!isMatch) {
      return c.json({ ok: false, msg: "Invalid password" }, 401);
    }

    const token = jwt.sign(
      { id: userData.id, name: userData.name, email: userData.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    setAuthCookie(c, token);

    return c.json({
      ok: true,
      msg: "Login successfully",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ ok: false, msg: "Internal server error" }, 500);
  }
});

router.get("/logout", async (c) => {
  setCookie(c, "auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
  return c.json({
    ok: true,
    msg: "Logout successfully",
  });
});

router.post("/signup", async (c) => {
  try {
    const { name, email, password, confirmPassword } = await c.req.json();

    if (!name || !email || !password || !confirmPassword) {
      return c.json({ ok: false, msg: "All fields are required" }, 400);
    }

    if (password !== confirmPassword) {
      return c.json({ ok: false, msg: "Password doesn't match" }, 400);
    }

    if (password.length < 6) {
      return c.json(
        { ok: false, msg: "Password must be at least 6 characters" },
        400,
      );
    }

    const userRow = await db.select().from(users).where(eq(users.email, email));

    if (userRow.length > 0) {
      return c.json({ ok: false, msg: "Email already exists" }, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        cash: "1000",
        stock: "5",
      })
      .returning();

    const allSymbols = await db.select().from(symbols);
    for (const sym of allSymbols) {
      const qty = sym.symbol === "TNV" ? "5" : "0";
      await db.insert(portfolios).values({
        userId: newUser[0].id,
        symbol: sym.symbol,
        quantity: qty,
      });
    }

    const token = jwt.sign(
      { id: newUser[0].id, name, email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    setAuthCookie(c, token);

    return c.json({
      ok: true,
      msg: "Account created successfully",
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ ok: false, msg: "Internal server error" }, 500);
  }
});

export default router;
