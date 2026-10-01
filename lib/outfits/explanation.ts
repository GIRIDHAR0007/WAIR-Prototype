import { localOutfitExplanation, type ColorMode, type PlannerOccasion } from "@/data/outfit-rules";
import type { WardrobeRow } from "@/components/wardrobe-library";

export async function writeOutfitExplanation(items: WardrobeRow[], occasion: PlannerOccasion, colorMode: ColorMode): Promise<string> {
  const fallback = localOutfitExplanation(items, occasion, colorMode);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallback;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini", input: `Write one or two concise, friendly sentences explaining why this deterministic ${occasion.toLowerCase()} outfit works. Mention specific visible colors and garments if useful. Do not invent items. Outfit: ${items.map(item => `${item.subcategory} (${item.category}, formality ${item.formality}/10, colors ${item.colors})`).join("; ")}. Color direction: ${colorMode}.` }),
    });
    if (!response.ok) return fallback;
    const data = await response.json() as { output_text?: string };
    const explanation = data.output_text?.trim();
    return explanation ? explanation.slice(0, 440) : fallback;
  } catch { return fallback; }
}
