import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export { getImageUrl } from "./image-url";

const uploadDir = path.join(process.cwd(), "uploads");
const publicDir = path.join(process.cwd(), "public");
const safeExtension = (name: string) => {
  const ext = path.extname(name).toLowerCase();
  return /^\.(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : ".jpg";
};

export async function saveImage(file: File): Promise<string> {
  await mkdir(uploadDir, { recursive: true });
  const key = `${randomUUID()}${safeExtension(file.name)}`;
  await writeFile(path.join(uploadDir, key), Buffer.from(await file.arrayBuffer()));
  return key;
}

export async function readImage(key: string): Promise<Buffer> {
  const safeKey = path.basename(key);
  const file = key.startsWith("/placeholders/")
    ? path.join(publicDir, "placeholders", path.basename(key))
    : path.join(uploadDir, safeKey);
  const { readFile } = await import("node:fs/promises");
  return readFile(file);
}

export async function deleteImage(key: string): Promise<void> {
  try { await unlink(path.join(uploadDir, path.basename(key))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
