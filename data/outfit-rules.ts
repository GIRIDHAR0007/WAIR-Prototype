import type { WardrobeRow } from "@/components/wardrobe-library";

export type PlannerOccasion = "Formal" | "Informal";
export type ColorMode = "harmonious" | "bold" | "specific" | "skip";
export type ColorValue = { name: string; hex: string };
export type ScoredOutfit = { items: WardrobeRow[]; score: number };

const NEUTRALS = new Set(["black", "white", "grey", "gray", "beige", "navy", "denim", "brown", "cream", "ivory", "charcoal"]);
const TRADITIONAL_WORDS = /kurta|sherwani|nehru|dhoti|lungi|anarkali|saree|salwar|lehenga|sharara|kolhapuri|ethnic|traditional/i;
const WESTERN_WORDS = /t-shirt|tee|jean|denim|chino|trouser|pant|sneaker|blazer|hoodie|jogger|top|dress|skirt|loafer|suit|coat/i;

export function hueFromHex(hex: string): number | null {
  if (!/^#[\da-f]{6}$/i.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (delta < 0.035 || max < 0.16) return null;
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

export function hueDistance(a: number, b: number): number { const raw = Math.abs(a - b) % 360; return Math.min(raw, 360 - raw); }

function parseColors(item: WardrobeRow): ColorValue[] {
  try { const colors = JSON.parse(item.colors); return Array.isArray(colors) ? colors : []; }
  catch { return []; }
}

function isNeutral(color: ColorValue): boolean { return NEUTRALS.has(color.name.toLowerCase()) || hueFromHex(color.hex) === null; }

/** Return the best HSL relationship score between two garments. Neutrals anchor any palette. */
export function pairColorHarmony(a: WardrobeRow, b: WardrobeRow, mode: ColorMode = "harmonious"): number {
  if (mode === "bold") return 0.8;
  if (mode === "skip") return 0.55;
  const first = parseColors(a), second = parseColors(b);
  if (!first.length || !second.length) return 0.35;
  let best = 0;
  for (const colorA of first) for (const colorB of second) {
    if (isNeutral(colorA) || isNeutral(colorB)) { best = Math.max(best, 0.8); continue; }
    const ha = hueFromHex(colorA.hex), hb = hueFromHex(colorB.hex);
    if (ha === null || hb === null) { best = Math.max(best, 0.7); continue; }
    const difference = hueDistance(ha, hb);
    // Complementary, triadic, analogous, and monochromatic palettes each receive a strong score.
    const relationships = [Math.max(0, 1 - difference / 18), Math.max(0, 1 - Math.abs(difference - 30) / 22), Math.max(0, 1 - Math.abs(difference - 120) / 24), Math.max(0, 1 - Math.abs(difference - 180) / 25)];
    best = Math.max(best, ...relationships);
  }
  return mode === "harmonious" ? best : Math.max(best, 0.45);
}

function isTraditional(item: WardrobeRow): boolean { return item.isTraditional || TRADITIONAL_WORDS.test(`${item.subcategory} ${item.category}`); }
function isWestern(item: WardrobeRow): boolean { return WESTERN_WORDS.test(`${item.subcategory} ${item.category}`) && !isTraditional(item); }
function withinFormality(items: WardrobeRow[]): boolean { return Math.max(...items.map(item => item.formality)) - Math.min(...items.map(item => item.formality)) <= 2; }

export function outfitScore(items: WardrobeRow[], options: { occasion: PlannerOccasion; colorMode: ColorMode; preferredColors?: string[]; weights?: Map<string, number>; faceShape?: string | null; bodyType?: string | null }): number {
  if (!withinFormality(items)) return Number.NEGATIVE_INFINITY;
  const trad = items.some(isTraditional), western = items.some(isWestern);
  if (trad && western) return Number.NEGATIVE_INFINITY;
  const targetFormal = options.occasion === "Formal";
  if (items.some(item => targetFormal ? item.formality < 7 : item.formality > 6)) return Number.NEGATIVE_INFINITY;
  let harmony = 0, pairs = 0;
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { harmony += pairColorHarmony(items[i]!, items[j]!, options.colorMode); pairs++; }
  const colorScore = pairs ? harmony / pairs : 0.55;
  const averageFormality = items.reduce((sum, item) => sum + item.formality, 0) / items.length;
  const target = targetFormal ? 8.5 : 4;
  const formalityScore = Math.max(0, 1 - Math.abs(averageFormality - target) / 5);
  const preferenceScore = options.preferredColors?.length ? items.reduce((sum, item) => sum + (parseColors(item).some(color => options.preferredColors!.some(preference => color.name.toLowerCase() === preference.toLowerCase())) ? 1 : 0), 0) / items.length : 0;
  const fitScore = items.reduce((sum, item) => {
    let value = 0.5;
    if (options.faceShape?.toLowerCase() === "round" && /v-neck|open collar|v neck/i.test(item.subcategory)) value += 0.4;
    if (["pear", "hourglass"].includes(options.bodyType?.toLowerCase() ?? "") && item.category === "Outerwear") value += 0.1;
    if (["rectangle", "athletic"].includes(options.bodyType?.toLowerCase() ?? "") && /structured|blazer/i.test(item.subcategory)) value += 0.2;
    return sum + value;
  }, 0) / items.length;
  const learned = items.reduce((sum, item) => {
    const weights = options.weights;
    if (!weights) return sum;
    const colors = parseColors(item);
    return sum + (weights.get(`category:${item.category.toLowerCase()}`) ?? 0) + (weights.get(`style:${item.subcategory.toLowerCase()}`) ?? 0) + colors.reduce((acc, color) => acc + (weights.get(`color:${color.name.toLowerCase()}`) ?? 0), 0);
  }, 0) / items.length;
  return colorScore * 35 + formalityScore * 30 + preferenceScore * 15 + fitScore * 10 + learned * 10;
}

function combinations<T>(values: T[], count: number): T[][] {
  const result: T[][] = [];
  const visit = (start: number, current: T[]) => { if (current.length === count) { result.push([...current]); return; } for (let i = start; i < values.length; i++) visit(i + 1, [...current, values[i]!]); };
  visit(0, []); return result;
}

/** Enumerate wardrobe combinations and choose up to three distinct outfits with no shared garments. */
export function pickTopOutfits(items: WardrobeRow[], options: { occasion: PlannerOccasion; colorMode: ColorMode; preferredColors?: string[]; weights?: Map<string, number>; faceShape?: string | null; bodyType?: string | null; previouslyShown?: Set<string>; limit?: number }): ScoredOutfit[] {
  const recent = options.previouslyShown ?? new Set<string>();
  const formal = options.occasion === "Formal";
  const eligible = items.filter(item => formal ? item.formality >= 7 : item.formality <= 6);
  const fullBody = eligible.filter(item => item.category === "Full Body");
  const prioritize = (group: string, limit: number) => eligible.filter(item => item.category === group).sort((a, b) => Number(recent.has(a.id)) - Number(recent.has(b.id))).slice(0, limit);
  const uppers = prioritize("Upper", 12);
  const lowers = prioritize("Lower", 12);
  const shoes = prioritize("Footwear", 8);
  const outerwear = prioritize("Outerwear", 8);
  const accessories = prioritize("Accessories", 8);
  const bases: WardrobeRow[][] = fullBody.map(item => [item]);
  for (const upper of uppers) for (const lower of lowers) bases.push([upper, lower]);
  const candidates = new Map<string, ScoredOutfit>();
  const expansions = <T extends WardrobeRow>(base: WardrobeRow[], choices: T[]) => [base, ...choices.map(item => [...base, item])];
  for (const base of bases) {
    const shoeVariants = expansions(base, shoes);
    for (const withShoes of shoeVariants) {
      const outerVariants = expansions(withShoes, outerwear);
      for (const withOuter of outerVariants) {
        const all = expansions(withOuter, accessories);
        for (const outfit of all) {
          if (new Set(outfit.map(item => item.id)).size !== outfit.length) continue;
          const score = outfitScore(outfit, options);
          if (!Number.isFinite(score)) continue;
          const key = [...outfit.map(item => item.id)].sort().join("|");
          const reusePenalty = outfit.reduce((sum, item) => sum + (recent.has(item.id) ? 1 : 0), 0) * 5;
          candidates.set(key, { items: outfit, score: score - reusePenalty });
        }
      }
    }
  }
  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
  const chosen: ScoredOutfit[] = [], used = new Set<string>();
  for (const candidate of ranked) {
    if (candidate.items.some(item => used.has(item.id))) continue;
    chosen.push(candidate); candidate.items.forEach(item => used.add(item.id));
    if (chosen.length >= (options.limit ?? 3)) break;
  }
  return chosen;
}

export function outfitsDoNotRepeat(outfits: ScoredOutfit[]): boolean {
  const ids = outfits.flatMap(outfit => outfit.items.map(item => item.id));
  return new Set(ids).size === ids.length;
}

export function buildPreferenceWeights(rows: Array<{ kind: string; value: string; weight: number }>): Map<string, number> {
  return new Map(rows.map(row => [`${row.kind}:${row.value.toLowerCase()}`, row.weight]));
}

export function updatePreferenceWeights(items: WardrobeRow[], direction: 1 | -1): Array<{ kind: string; value: string; delta: number }> {
  const deltas = new Map<string, number>();
  for (const item of items) {
    const keys = [`category:${item.category}`, `style:${item.subcategory}`, ...parseColors(item).map(color => `color:${color.name.toLowerCase()}`)];
    keys.forEach(key => deltas.set(key, (deltas.get(key) ?? 0) + direction * 0.12));
  }
  return [...deltas].map(([key, delta]) => { const [kind, ...value] = key.split(":"); return { kind: kind!, value: value.join(":"), delta }; });
}

export function localOutfitExplanation(items: WardrobeRow[], occasion: PlannerOccasion, colorMode: ColorMode): string {
  const namedColors = [...new Set(items.flatMap(parseColors).map(color => color.name))].slice(0, 2);
  const lead = namedColors.length ? `${namedColors.join(" and ")} tones ${colorMode === "bold" ? "add a confident contrast" : "give the look a cohesive palette"}` : "The pieces work together through their shape and feel";
  return `${lead}, while the ${occasion.toLowerCase()} formality keeps the outfit suited to your plans. The combination brings together ${items.slice(0, 2).map(item => item.subcategory.toLowerCase()).join(" with ")}.`;
}
