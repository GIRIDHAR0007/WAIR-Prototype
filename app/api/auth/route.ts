import { eq, asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { z } from "zod";
const credentials = z.object({ name: z.string().trim().min(1).max(60), password: z.string().min(1).max(100), gender: z.enum(["MALE", "FEMALE", "OTHER"]) });
export async function POST(request: Request) {
  const parsed = credentials.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a name, password, and gender." }, { status: 400 });
  const { name, password, gender } = parsed.data;
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, name, password, gender }).onConflictDoUpdate({ target: users.name, set: { password, gender } });
  const [user] = await db.select({ id: users.id, name: users.name, gender: users.gender, faceShape: users.faceShape, bodyType: users.bodyType }).from(users).where(eq(users.name, name));
  const response = NextResponse.json({ user });
  response.cookies.set("wair-user", String(user.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
