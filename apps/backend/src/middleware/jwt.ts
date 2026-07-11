import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";

export type JwtPayload = {
  id: number;
  name: string;
  email: string;
};

declare module "hono" {
  interface ContextVariableMap {
    jwt: JwtPayload;
  }
}

const secretKey = process.env.JWT_SECRET!;

const auth = createMiddleware(async (c, next) => {
  const token = getCookie(c, "auth_token");

  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const decoded = jwt.verify(token, secretKey) as JwtPayload;
    c.set("jwt", decoded);
    await next();
  } catch {
    return c.json({ message: "Unauthorized" }, 401);
  }
});

export default auth;
