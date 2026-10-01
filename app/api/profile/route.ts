import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/wardrobe/user";

const profileSchema = z.object({
  faceShape: z.enum(["Oval", "Round", "Square", "Heart", "Oblong"]).nullable(),
  bodyType: z.enum(["Rectangle", "Pear", "Inverted triangle", "Hourglass", "Athletic"]).nullable(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before saving your profile." }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid face shape and body type." }, { status: 400 });
  const [updated] = await db.update(users).set(parsed.data).where(eq(users.id, user.id)).returning({ id: users.id, name: users.name, gender: users.gender, faceShape: users.faceShape, bodyType: users.bodyType });
  return NextResponse.json({ user: updated });
}
