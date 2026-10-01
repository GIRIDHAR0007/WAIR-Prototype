import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { feedback, outfitItems, outfitRounds, outfits, preferenceWeights, users, wardrobeItems } from "@/lib/db/schema";
import { buildPreferenceWeights, pickTopOutfits, type ColorMode, type PlannerOccasion, type ScoredOutfit } from "@/data/outfit-rules";
import { getCurrentUser } from "@/lib/wardrobe/user";
import { writeOutfitExplanation } from "@/lib/outfits/explanation";

const generateSchema = z.object({ occasion: z.enum(["Formal", "Informal"]), colorMode: z.enum(["harmonious", "bold", "specific", "skip"]), preferredColors: z.array(z.string().max(30)).max(8).default([]), excludeRecent: z.boolean().default(true) });
const jsonList = (value: string | null | undefined): string[] => { try { const parsed = JSON.parse(value ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const rowToItem = (item: typeof wardrobeItems.$inferSelect) => ({ ...item, colors: item.colors });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before planning an outfit." }, { status: 401 });
  const parsed = generateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid occasion and color direction." }, { status: 400 });
  const preferences = parsed.data;
  const rows = (await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, user.id))).map(rowToItem);
  const weights = await db.select().from(preferenceWeights).where(eq(preferenceWeights.userId, user.id));
  const previousRounds = await db.select({ id: outfitRounds.id }).from(outfitRounds).where(eq(outfitRounds.userId, user.id)).orderBy(desc(outfitRounds.createdAt));
  const previousRoundIds = previousRounds.map(round => round.id);
  const shown = previousRoundIds.length ? await db.select({ wardrobeItemId: outfitItems.wardrobeItemId }).from(outfitItems).innerJoin(outfits, eq(outfitItems.outfitId, outfits.id)).where(inArray(outfits.roundId, previousRoundIds)) : [];
  const recentIds = preferences.excludeRecent ? new Set(shown.map(row => row.wardrobeItemId)) : new Set<string>();
  const [profile] = await db.select({ faceShape: users.faceShape, bodyType: users.bodyType }).from(users).where(eq(users.id, user.id)).limit(1);
  const options = { occasion: preferences.occasion as PlannerOccasion, colorMode: preferences.colorMode as ColorMode, preferredColors: preferences.preferredColors, weights: buildPreferenceWeights(weights), faceShape: profile?.faceShape, bodyType: profile?.bodyType };
  let selected = pickTopOutfits(rows, { ...options, previouslyShown: recentIds, limit: 3 });
  if (selected.length < 3 && recentIds.size) {
    const have = new Set(selected.flatMap(outfit => outfit.items.map(item => item.id)));
    const fallback = pickTopOutfits(rows, { ...options, previouslyShown: new Set<string>(), limit: 3 }).filter(outfit => !outfit.items.some(item => have.has(item.id)));
    selected = [...selected, ...fallback].slice(0, 3);
  }
  if (selected.length < 3) return NextResponse.json({ error: `I could find ${selected.length} distinct outfit${selected.length === 1 ? "" : "s"}. Add more compatible pieces so I can make three without reusing garments. Informal looks need an upper and lower; formal looks need pieces rated 7 or higher.` }, { status: 422 });
  const roundId = randomUUID();
  await db.insert(outfitRounds).values({ id: roundId, userId: user.id, occasion: preferences.occasion, colorMode: preferences.colorMode, preferredColors: JSON.stringify(preferences.preferredColors) });
  const results = [];
  for (const selectedOutfit of selected as ScoredOutfit[]) {
    const id = randomUUID();
    const explanation = await writeOutfitExplanation(selectedOutfit.items, preferences.occasion, preferences.colorMode);
    await db.insert(outfits).values({ id, roundId, explanation, score: selectedOutfit.score });
    await db.insert(outfitItems).values(selectedOutfit.items.map(item => ({ outfitId: id, wardrobeItemId: item.id, slot: item.category })));
    results.push({ id, explanation, score: selectedOutfit.score, items: selectedOutfit.items });
  }
  return NextResponse.json({ roundId, outfits: results });
}

const feedbackSchema = z.object({ outfitId: z.string().min(1), liked: z.boolean() });
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before sharing feedback." }, { status: 401 });
  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose Like or Dislike." }, { status: 400 });
  const [outfit] = await db.select().from(outfits).innerJoin(outfitRounds, eq(outfits.roundId, outfitRounds.id)).where(and(eq(outfits.id, parsed.data.outfitId), eq(outfitRounds.userId, user.id))).limit(1);
  if (!outfit) return NextResponse.json({ error: "Outfit not found." }, { status: 404 });
  const itemRows = await db.select({ item: wardrobeItems }).from(outfitItems).innerJoin(wardrobeItems, eq(outfitItems.wardrobeItemId, wardrobeItems.id)).where(eq(outfitItems.outfitId, parsed.data.outfitId));
  const [prior] = await db.select().from(feedback).where(and(eq(feedback.userId, user.id), eq(feedback.outfitId, parsed.data.outfitId))).limit(1);
  const nextDirection = parsed.data.liked ? 1 : -1;
  const oldDirection = prior ? prior.liked ? 1 : -1 : 0;
  await db.insert(feedback).values({ id: randomUUID(), userId: user.id, outfitId: parsed.data.outfitId, liked: parsed.data.liked }).onConflictDoUpdate({ target: [feedback.userId, feedback.outfitId], set: { liked: parsed.data.liked, createdAt: new Date() } });
  const deltas = new Map<string, number>();
  const items = itemRows.map(row => rowToItem(row.item));
  for (const direction of [oldDirection ? -oldDirection : 0, nextDirection]) {
    if (!direction) continue;
    const adjustment = direction > 0 ? 1 : -1;
    const { updatePreferenceWeights } = await import("@/data/outfit-rules");
    for (const delta of updatePreferenceWeights(items, adjustment as 1 | -1)) deltas.set(`${delta.kind}:${delta.value}`, (deltas.get(`${delta.kind}:${delta.value}`) ?? 0) + delta.delta);
  }
  for (const [key, delta] of deltas) {
    const [kind, ...valueParts] = key.split(":"); const value = valueParts.join(":");
    const [existing] = await db.select().from(preferenceWeights).where(and(eq(preferenceWeights.userId, user.id), eq(preferenceWeights.kind, kind!), eq(preferenceWeights.value, value))).limit(1);
    await db.insert(preferenceWeights).values({ id: randomUUID(), userId: user.id, kind: kind!, value, weight: delta }).onConflictDoUpdate({ target: [preferenceWeights.userId, preferenceWeights.kind, preferenceWeights.value], set: { weight: (existing?.weight ?? 0) + delta } });
  }
  return NextResponse.json({ success: true, liked: parsed.data.liked });
}
