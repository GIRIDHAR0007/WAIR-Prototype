/** Builds the browser URL for a stored garment image without exposing disk paths. */
export function getImageUrl(key: string): string {
  if (key.startsWith("/")) return key;
  return `/api/wardrobe/images/${encodeURIComponent(key)}`;
}
