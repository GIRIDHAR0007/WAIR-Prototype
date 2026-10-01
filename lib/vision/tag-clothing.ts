import { CLOTHING_GROUPS } from "@/data/taxonomy";

export type ClothingTag = {
  category: string;
  subcategory: string;
  colorName: string;
  fabric: string;
  seasons: string[];
  formality: number;
  isTraditional: boolean;
};

const taxonomyLabel = CLOTHING_GROUPS.join(", ");
const defaultTag = (category: string, subcategory: string, overrides: Partial<ClothingTag> = {}): ClothingTag => ({
  category, subcategory, colorName: "neutral", fabric: "cotton", seasons: ["All season"], formality: 5, isTraditional: false, ...overrides,
});

/** Explicit garment names in filenames are high-confidence hints, including when vision AI is configured. */
const tagFromFilenameHint = (filename: string): ClothingTag | null => {
  const name = filename.toLowerCase().replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_.-]+/g, " ");
  const rules: [RegExp, ClothingTag][] = [
    [/\bdress shirts?\b/, defaultTag("Upper", "Formal button-down", { formality: 8 })],
    // One-piece garments must win before any incidental words such as "coat" or "jacket".
    [/\b(full ?body|one piece|onepiece|bodycon|mini dress(?:es)?|midi dress(?:es)?|maxi dress(?:es)?|shirt dress(?:es)?|coat dress(?:es)?|jacket dress(?:es)?)\b/, defaultTag("Full Body", "Casual dress")],
    [/\b(saree|sari)\b/, defaultTag("Full Body", "Saree", { isTraditional: true, formality: 8, fabric: "woven" })],
    [/\b(anarkali|gown)\b/, defaultTag("Full Body", "Gown", { isTraditional: /anarkali/.test(name), formality: 8 })],
    [/\b(jumpsuit|jump suit)\b/, defaultTag("Full Body", "Jumpsuit")],
    [/\b(romper|playsuit)\b/, defaultTag("Full Body", "Romper")],
    [/\bdress(?:es)?\b|\bfrocks?\b/, defaultTag("Full Body", "Casual dress")],
    // Match coat and jacket phrases before "denim" can fall through to jeans.
    [/\b(blazer|sport coat)\b/, defaultTag("Outerwear", "Blazer", { formality: 8 })],
    [/\b(trench coats?|trenchcoats?)\b/, defaultTag("Outerwear", "Trench coat", { formality: 7 })],
    [/\b(overcoats?|coats?|parkas?|puffers?)\b/, defaultTag("Outerwear", "Overcoat", { formality: 7 })],
    [/\b(bombers?|varsity jackets?)\b/, defaultTag("Outerwear", "Bomber")],
    [/\bwind ?breakers?\b/, defaultTag("Outerwear", "Windbreaker")],
    [/\b(leather|biker) jackets?\b/, defaultTag("Outerwear", "Leather jacket")],
    [/\bdenim jackets?\b/, defaultTag("Outerwear", "Denim jacket")],
    [/\b(shackets?|jackets?)\b/, defaultTag("Outerwear", "Denim jacket")],
    [/\bsuits?\b/, defaultTag("Outerwear", "Suit", { formality: 9 })],
    [/\bhenley\b/, defaultTag("Upper", "Henley")],
    [/\b(formal|dress) button down\b|\bbutton down\b/, defaultTag("Upper", "Formal button-down", { formality: 8 })],
    [/\bchambray\b/, defaultTag("Upper", "Chambray")],
    [/\bflannel\b/, defaultTag("Upper", "Flannel")],
    [/\b(polo|polos)\b/, defaultTag("Upper", "Polo")],
    [/\bturtle ?neck\b/, defaultTag("Upper", "Turtleneck", { formality: 6 })],
    [/\bsweater\b/, defaultTag("Upper", "Sweater", { formality: 6 })],
    [/\bcardigan\b/, defaultTag("Upper", "Cardigan", { formality: 6 })],
    [/\bhoodie\b/, defaultTag("Upper", "Hoodie", { formality: 3 })],
    [/\bsweatshirt\b/, defaultTag("Upper", "Sweatshirt", { formality: 3 })],
    [/\bkurti\b/, defaultTag("Upper", "Kurti", { isTraditional: true, formality: 7 })],
    [/\bkurta\b/, defaultTag("Upper", "Kurta", { isTraditional: true, formality: 7 })],
    [/\bsherwani\b/, defaultTag("Upper", "Sherwani", { isTraditional: true, formality: 9 })],
    [/\bnehru jacket\b/, defaultTag("Upper", "Nehru jacket", { isTraditional: true, formality: 8 })],
    [/\b(blouse)\b/, defaultTag("Upper", "Blouse", { formality: 6 })],
    [/\bcrop top\b/, defaultTag("Upper", "Crop top")],
    [/\btank top\b/, defaultTag("Upper", "Tank top")],
    [/\bcamisole\b/, defaultTag("Upper", "Camisole")],
    [/\btunic\b/, defaultTag("Upper", "Tunic")],
    [/\bt ?shirt\b|\btee\b/, defaultTag("Upper", "T-shirt")],
    [/\b(chino|chinos)\b/, defaultTag("Lower", "Chinos", { fabric: "cotton twill", formality: 6 })],
    [/\bcargo(s)?\b/, defaultTag("Lower", "Cargo")],
    [/\bjogger(s)?\b/, defaultTag("Lower", "Joggers", { formality: 3 })],
    [/\btrack ?pants\b/, defaultTag("Lower", "Trackpants", { formality: 3 })],
    [/\bformal trousers?\b|\bdress pants?\b/, defaultTag("Lower", "Formal trousers", { formality: 8 })],
    [/\btrousers?\b|\bpants?\b/, defaultTag("Lower", "Formal trousers", { formality: 6 })],
    [/\bshorts?\b|\bbermuda\b/, defaultTag("Lower", "Bermuda")],
    [/\bjeans?\b|\bdenim\b/, defaultTag("Lower", "Straight jeans", { fabric: "denim" })],
    [/\bleggings?\b|\bjeggings?\b/, defaultTag("Lower", "Leggings")],
    [/\bskirt\b/, defaultTag("Lower", "Midi skirt")],
    [/\boxford\b/, defaultTag("Footwear", "Oxford", { fabric: "leather", formality: 8 })],
    [/\bderby\b/, defaultTag("Footwear", "Derby", { fabric: "leather", formality: 8 })],
    [/\bsneakers?\b|\btrainers?\b/, defaultTag("Footwear", "Sneakers", { fabric: "synthetic" })],
    [/\bboots?\b/, defaultTag("Footwear", "Boots", { fabric: "leather" })],
    [/\bsandals?\b/, defaultTag("Footwear", "Sandals")],
    [/\bheels?\b|\bstiletto\b/, defaultTag("Footwear", "Heels")],
    [/\bloafers?\b/, defaultTag("Footwear", "Loafers", { fabric: "leather" })],
    [/\bsunglasses\b/, defaultTag("Accessories", "Sunglasses", { fabric: "mixed materials" })],
    [/\bwatch\b/, defaultTag("Accessories", "Watch", { fabric: "metal" })],
    [/\bbelt\b/, defaultTag("Accessories", "Belt", { fabric: "leather" })],
    [/\b(wallet)\b/, defaultTag("Accessories", "Wallet", { fabric: "leather" })],
    [/\btie\b/, defaultTag("Accessories", "Tie", { fabric: "silk blend", formality: 8 })],
    [/\b(pocket square)\b/, defaultTag("Accessories", "Pocket square", { formality: 8 })],
    [/\b(necklace|chain)\b/, defaultTag("Accessories", "Necklace", { fabric: "metal" })],
    [/\b(earrings?|studs?|hoops?)\b/, defaultTag("Accessories", "Earrings", { fabric: "metal" })],
    [/\b(ring)\b/, defaultTag("Accessories", "Ring", { fabric: "metal" })],
    [/\b(bracelet|bangles?)\b/, defaultTag("Accessories", "Bracelet", { fabric: "metal" })],
    [/\b(handbag|tote|sling bag|clutch)\b/, defaultTag("Accessories", "Handbag", { fabric: "leather" })],
    [/\b(scarf|stole)\b/, defaultTag("Accessories", "Scarf/Stole", { fabric: "woven" })],
    [/\b(hat|cap)\b/, defaultTag("Accessories", "Hat/Cap", { fabric: "cotton" })],
    [/\b(accessory|accessories|bag)\b/, defaultTag("Accessories", "Handbag", { fabric: "woven" })],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? null;
};

/** Filename rules make the no-key demo predictable; unknown filenames use a safe generic upper. */
export const tagFromFilename = (filename: string): ClothingTag => tagFromFilenameHint(filename) ?? defaultTag("Upper", "T-shirt", { seasons: ["Spring", "Summer"] });

function parseTag(value: unknown): ClothingTag {
  const source = typeof value === "string" ? JSON.parse(value) as Record<string, unknown> : value as Record<string, unknown>;
  const category = CLOTHING_GROUPS.find(group => group.toLowerCase() === String(source.category).toLowerCase()) ?? "Upper";
  const seasons = Array.isArray(source.seasons) ? source.seasons.filter((season): season is string => typeof season === "string").slice(0, 4) : ["All season"];
  return {
    category,
    subcategory: String(source.subcategory ?? "T-shirt").slice(0, 60),
    colorName: String(source.colorName ?? "neutral").slice(0, 40),
    fabric: String(source.fabric ?? "unknown").slice(0, 60),
    seasons,
    formality: Math.max(1, Math.min(10, Math.round(Number(source.formality) || 5))),
    isTraditional: Boolean(source.isTraditional),
  };
}

/** One integration point for wardrobe vision tagging. Missing credentials use the local demo classifier. */
export async function tagClothing(image: Buffer, filename: string): Promise<ClothingTag> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return tagFromFilename(filename);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
        input: [{ role: "user", content: [
          { type: "input_text", text: `Analyze this single clothing photo. The original filename is "${filename.replace(/[\r\n"\\]/g, " ").slice(0, 140)}" and may help identify a specific garment type. Use it as a hint while checking the photo. Return only JSON with category (one of ${taxonomyLabel}), subcategory, colorName (name only, no hex), fabric, seasons (array), formality (integer 1-10), and isTraditional (boolean).` },
          { type: "input_image", image_url: `data:image/jpeg;base64,${image.toString("base64")}` },
        ] }],
        text: { format: { type: "json_object" } },
      }),
    });
    if (!response.ok) throw new Error(`Vision API returned ${response.status}`);
    const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const outputText = data.output_text ?? data.output?.flatMap(block => block.content ?? []).find(content => content.text)?.text;
    if (!outputText) throw new Error("Vision API returned no tag data");
    const visionTag = parseTag(outputText);
    const filenameHint = tagFromFilenameHint(filename);
    return filenameHint ? { ...visionTag, category: filenameHint.category, subcategory: filenameHint.subcategory, formality: filenameHint.formality, isTraditional: filenameHint.isTraditional } : visionTag;
  } catch {
    return tagFromFilename(filename);
  }
}
