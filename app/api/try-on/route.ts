import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { outfitItems, outfitRounds, outfits, wardrobeItems } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/wardrobe/user";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImagePart = { type: "input_image"; image_url: string };
const mimeFromFile = (file: File) => file.type && ["image/jpeg", "image/png", "image/webp"].includes(file.type) ? file.type : "image/jpeg";
const asDataUrl = async (file: File) => `data:${mimeFromFile(file)};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;

export async function POST(request: Request) {
  if (process.env.ENABLE_VIRTUAL_TRY_ON !== "true" || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Try-on generation is not enabled." }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before trying on an outfit." }, { status: 401 });

  const form = await request.formData();
  const outfitId = form.get("outfitId");
  const photo = form.get("photo");
  const garments = form.getAll("garments").filter((value): value is File => value instanceof File && value.size > 0);
  if (typeof outfitId !== "string" || !outfitId || !(photo instanceof File) || !photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Choose a full-body photo and try again." }, { status: 400 });
  }
  if (photo.size > 10 * 1024 * 1024 || garments.length < 1 || garments.length > 8 || garments.some(file => file.size > 6 * 1024 * 1024)) {
    return NextResponse.json({ error: "The selected photos are too large. Choose smaller images and try again." }, { status: 413 });
  }
  const [ownedOutfit] = await db.select({ id: outfits.id }).from(outfits).innerJoin(outfitRounds, eq(outfits.roundId, outfitRounds.id)).where(and(eq(outfits.id, outfitId), eq(outfitRounds.userId, user.id))).limit(1);
  if (!ownedOutfit) return NextResponse.json({ error: "Outfit not found." }, { status: 404 });

  const inputs: Array<{ type: "input_text"; text: string } | ImagePart> = [
    { type: "input_text", text: "Create a realistic virtual try-on preview. Use the first image as the person and preserve their identity, face, pose, body shape, and photo setting. Dress them in the exact garments shown in the remaining reference images, matching the garments' colors, patterns, and silhouette as closely as possible. Show a natural full-body result. Do not add extra accessories or change the person's appearance." },
    { type: "input_image", image_url: await asDataUrl(photo) },
    ...await Promise.all(garments.map(async file => ({ type: "input_image" as const, image_url: await asDataUrl(file) }))),
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: process.env.TRYON_RESPONSE_MODEL || "gpt-5",
        store: false,
        input: [{ role: "user", content: inputs }],
        tools: [{ type: "image_generation", model: process.env.TRYON_IMAGE_MODEL || "gpt-image-2.5-flare", action: "auto", size: "1024x1536", quality: "low" }],
        tool_choice: "required",
      }),
    });
    if (!response.ok) throw new Error(`Image generation returned ${response.status}`);
    const result = await response.json() as { output?: Array<{ type?: string; result?: string }> };
    const image = result.output?.find(output => output.type === "image_generation_call")?.result;
    if (!image) throw new Error("The try-on service returned no image.");
    return NextResponse.json({ image: `data:image/png;base64,${image}` });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: timedOut ? "This is taking a little longer than expected." : "We couldn’t make the try-on image right now." }, { status: timedOut ? 504 : 502 });
  }
}
