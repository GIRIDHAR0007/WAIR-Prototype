import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import jpeg from "jpeg-js";
import { inflateSync } from "node:zlib";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";
import { deleteImage, saveImage } from "@/lib/storage";
import { getCurrentUser } from "@/lib/wardrobe/user";
import { tagClothing } from "@/lib/vision/tag-clothing";
import { CLOTHING_GROUPS } from "@/data/taxonomy";

export const runtime = "nodejs";
export const maxDuration = 60;

type PixelColor = { name: string; hex: string };
const palette: Array<[string, [number, number, number]]> = [
  ["black", [25, 25, 25]], ["white", [245, 245, 239]], ["grey", [130, 130, 125]], ["beige", [202, 183, 150]], ["brown", [112, 75, 49]], ["red", [180, 47, 46]], ["orange", [223, 122, 47]], ["yellow", [224, 190, 66]], ["green", [74, 123, 79]], ["blue", [62, 104, 156]], ["purple", [123, 79, 147]], ["pink", [213, 133, 157]], ["navy", [37, 55, 87]],
];
function nameColor(rgb: number[]): string {
  const [name] = palette.reduce((best, candidate) => {
    const distance = candidate[1].reduce((sum, value, index) => sum + (value - (rgb[index] ?? 0)) ** 2, 0);
    return distance < best[1] ? [candidate[0], distance] as [string, number] : best;
  }, ["grey", Number.POSITIVE_INFINITY] as [string, number]);
  return name;
}
async function extractDominantColors(bytes: Buffer): Promise<PixelColor[]> {
  const buckets = new Map<string, { count: number; rgb: number[] }>();
  const pixels = decodePixels(bytes);
  for (let index = 0; index + 2 < pixels.length; index += 3) {
    const rgb = [pixels[index]!, pixels[index + 1]!, pixels[index + 2]!];
    // Ignore very dark and very bright near-background pixels in the frequency count.
    const key = rgb.map(channel => Math.round(channel / 32) * 32).join(",");
    const current = buckets.get(key) ?? { count: 0, rgb: [0, 0, 0] };
    current.count += 1;
    current.rgb = current.rgb.map((total, i) => total + rgb[i]!);
    buckets.set(key, current);
  }
  return [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 3).map(bucket => {
    const rgb = bucket.rgb.map(value => Math.round(value / bucket.count));
    const hex = `#${rgb.map(value => value.toString(16).padStart(2, "0")).join("")}`;
    return { name: nameColor(rgb), hex };
  });
}

function decodePixels(bytes: Buffer): Uint8Array {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    const rgb = new Uint8Array(decoded.width * decoded.height * 3);
    for (let source = 0, target = 0; source < decoded.data.length; source += 4, target += 3) {
      rgb[target] = decoded.data[source]!; rgb[target + 1] = decoded.data[source + 1]!; rgb[target + 2] = decoded.data[source + 2]!;
    }
    return rgb;
  }
  if (bytes.toString("ascii", 1, 4) !== "PNG") throw new Error("Use a PNG, JPEG, or WebP image.");
  let offset = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const chunks: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset); const type = bytes.toString("ascii", offset + 4, offset + 8); const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]!; colorType = data[9]!; interlace = data[12]!; }
    if (type === "IDAT") chunks.push(data);
    offset += length + 12; if (type === "IEND") break;
  }
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) throw new Error("Pixel color extraction supports 8-bit RGB/RGBA PNG and JPEG images.");
  if (width * height > 12_000_000) throw new Error("Image dimensions are too large.");
  const channels = colorType === 6 ? 4 : 3, stride = width * channels;
  const raw = inflateSync(Buffer.concat(chunks)); const scanlines = new Uint8Array(height * stride); let input = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[input++]!; const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[input++]!; const left = x >= channels ? scanlines[row + x - channels]! : 0;
      const above = y > 0 ? scanlines[row + x - stride]! : 0; const upperLeft = y > 0 && x >= channels ? scanlines[row + x - stride - channels]! : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) { const p = left + above - upperLeft; const pa = Math.abs(p - left), pb = Math.abs(p - above), pc = Math.abs(p - upperLeft); predictor = pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft; }
      else if (filter !== 0) throw new Error("Unsupported PNG filter.");
      scanlines[row + x] = (value + predictor) & 255;
    }
  }
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 12000)));
  const rgb = new Uint8Array(Math.ceil(width / step) * Math.ceil(height / step) * 3); let target = 0;
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const source = y * stride + x * channels; rgb[target++] = scanlines[source]!; rgb[target++] = scanlines[source + 1]!; rgb[target++] = scanlines[source + 2]!;
  }
  return rgb.subarray(0, target);
}

function isUpload(file: FormDataEntryValue): file is File { return file instanceof File && file.size > 0; }
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });
  const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, user.id)).orderBy(desc(wardrobeItems.createdAt));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before adding wardrobe items." }, { status: 401 });
  const form = await request.formData();
  const files = form.getAll("files").filter(isUpload);
  if (files.length === 0) return NextResponse.json({ error: "Choose at least one image." }, { status: 400 });
  if (files.length > 20) return NextResponse.json({ error: "Upload up to 20 images at a time." }, { status: 400 });
  const items = [];
  for (const file of files) {
    if (file.size > 12 * 1024 * 1024) continue;
    const bytes = Buffer.from(await file.arrayBuffer());
    try {
      const colors = await extractDominantColors(bytes);
      const tag = await tagClothing(bytes, file.name);
      const key = await saveImage(file);
      const [item] = await db.insert(wardrobeItems).values({
        id: randomUUID(), userId: user.id, imageKey: key, category: CLOTHING_GROUPS.includes(tag.category as typeof CLOTHING_GROUPS[number]) ? tag.category : "Upper",
        subcategory: tag.subcategory, colors: JSON.stringify(colors.map((color, index) => ({ ...color, name: index === 0 && tag.colorName !== "neutral" ? tag.colorName : color.name }))),
        fabric: tag.fabric, seasons: JSON.stringify(tag.seasons), formality: tag.formality, isTraditional: tag.isTraditional,
      }).returning();
      items.push(item);
    } catch (error) {
      console.error("Could not process wardrobe image", file.name, error);
    }
  }
  return NextResponse.json({ items, uploaded: items.length, failed: files.length - items.length });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before editing wardrobe items." }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing item id." }, { status: 400 });
  const category = CLOTHING_GROUPS.find(group => group === body.category);
  if (!category) return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  const formality = Math.max(1, Math.min(10, Math.round(Number(body.formality) || 5)));
  const colors = Array.isArray(body.colors) ? body.colors.filter((value): value is { name: string; hex: string } => Boolean(value && typeof value === "object" && "name" in value && "hex" in value)).slice(0, 3) : [];
  const seasons = Array.isArray(body.seasons) ? body.seasons.filter((value): value is string => typeof value === "string").slice(0, 4) : [];
  const [updated] = await db.update(wardrobeItems).set({ category, subcategory: String(body.subcategory ?? "").slice(0, 80) || "Other", colors: JSON.stringify(colors), fabric: String(body.fabric ?? "").slice(0, 80), seasons: JSON.stringify(seasons), formality, isTraditional: Boolean(body.isTraditional), updatedAt: new Date() }).where(eq(wardrobeItems.id, id)).returning();
  if (!updated || updated.userId !== user.id) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  return NextResponse.json({ item: updated });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before deleting wardrobe items." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing item id." }, { status: 400 });
  const [item] = await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)).limit(1);
  if (!item || item.userId !== user.id) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  await db.delete(wardrobeItems).where(eq(wardrobeItems.id, id));
  await deleteImage(item.imageKey);
  return NextResponse.json({ success: true });
}
