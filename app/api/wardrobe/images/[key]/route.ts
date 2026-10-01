import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { extname } from "node:path";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";
import { readImage } from "@/lib/storage";
import { getCurrentUser } from "@/lib/wardrobe/user";

export const runtime = "nodejs";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view this image." }, { status: 401 });

  const { key } = await params;
  if (!/^[\w-]+\.(?:jpe?g|png|webp|gif)$/i.test(key)) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const [item] = await db.select({ imageKey: wardrobeItems.imageKey }).from(wardrobeItems)
    .where(and(eq(wardrobeItems.userId, user.id), eq(wardrobeItems.imageKey, key))).limit(1);
  if (!item) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  try {
    const image = await readImage(item.imageKey);
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": mimeTypes[extname(key).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image file is missing from local storage." }, { status: 404 });
  }
}
