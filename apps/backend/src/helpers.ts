import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

export async function getUserByEmail(email: string) {
  const row = await db.select().from(users).where(eq(users.email, email));
  return row[0] ?? null;
}
