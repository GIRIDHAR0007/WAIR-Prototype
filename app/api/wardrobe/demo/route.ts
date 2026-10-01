import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { DEMO_WARDROBE } from "@/data/demo-wardrobe";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/wardrobe/user";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before loading the demo wardrobe." }, { status: 401 });
  const existing = await db.select({ imageKey: wardrobeItems.imageKey }).from(wardrobeItems).where(eq(wardrobeItems.userId, user.id));
  const existingImages = new Set(existing.map(item => item.imageKey));
  const now = new Date();
  const missing = DEMO_WARDROBE.map((item, index) => ({ item, index })).filter(({ index }) => !existingImages.has(`/placeholders/sample-${String(index + 1).padStart(2, "0")}.svg`));
  if (missing.length) {
    await db.insert(wardrobeItems).values(missing.map(({ item, index }) => ({
      id: `demo-${user.id}-${index + 1}`,
      userId: user.id,
      imageKey: `/placeholders/sample-${String(index + 1).padStart(2, "0")}.svg`,
      category: item.category,
      subcategory: item.subcategory,
      colors: JSON.stringify([{ name: item.color, hex: item.hex }]),
      fabric: "Demo sample",
      seasons: JSON.stringify(["All season"]),
      formality: item.formality,
      isTraditional: item.traditional,
      createdAt: now,
      updatedAt: now,
    }))).onConflictDoNothing();
  }
  const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, user.id));
  return NextResponse.json({ items, added: missing.length, total: items.length });
}
