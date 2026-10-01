import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const id = cookieStore.get("wair-user")?.value;
  if (id) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (user) return user;
  }
  const [demo] = await db.select().from(users).orderBy(asc(users.createdAt)).limit(1);
  return demo ?? null;
}
