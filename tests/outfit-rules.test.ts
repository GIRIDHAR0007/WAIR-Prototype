import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { outfitsDoNotRepeat, pairColorHarmony, pickTopOutfits, type ScoredOutfit } from "../data/outfit-rules";
import type { WardrobeRow } from "../components/wardrobe-library";

const item = (id: string, category: string, hex: string, name: string, formality = 4): WardrobeRow => ({
  id, imageKey: `${id}.jpg`, category, subcategory: `${id} piece`, colors: JSON.stringify([{ name, hex }]),
  fabric: "cotton", seasons: '["All season"]', formality, isTraditional: false,
});

describe("color harmony", () => {
  it("treats analogous hues as harmonious", () => {
    const red = item("red-top", "Upper", "#e53935", "red");
    const orange = item("orange-bottom", "Lower", "#f28e2b", "orange");
    assert.ok(pairColorHarmony(red, orange) > 0.7);
  });

  it("lets neutral colors anchor any outfit", () => {
    const blue = item("blue-top", "Upper", "#2864b8", "blue");
    const white = item("white-bottom", "Lower", "#f5f5ef", "white");
    assert.ok(pairColorHarmony(blue, white) >= 0.8);
  });

  it("permits contrast in bold mode", () => {
    const red = item("red", "Upper", "#e53935", "red");
    const blue = item("blue", "Lower", "#2864b8", "blue");
    assert.equal(pairColorHarmony(red, blue, "bold"), 0.8);
  });
});

describe("non-repeating outfit selection", () => {
  it("never shares an item across chosen outfits", () => {
    const wardrobe = [
      item("u1", "Upper", "#e53935", "red"), item("u2", "Upper", "#2255aa", "blue"), item("u3", "Upper", "#208050", "green"),
      item("l1", "Lower", "#f5f5ef", "white"), item("l2", "Lower", "#292929", "black"), item("l3", "Lower", "#bdbdb7", "grey"),
    ];
    const outfits = pickTopOutfits(wardrobe, { occasion: "Informal", colorMode: "harmonious" });
    assert.equal(outfits.length, 3);
    assert.ok(outfitsDoNotRepeat(outfits));
  });

  it("detects a repeat in supplied outfit cards", () => {
    const shared = item("same", "Upper", "#e53935", "red");
    const cards: ScoredOutfit[] = [{ items: [shared], score: 1 }, { items: [shared], score: 1 }];
    assert.equal(outfitsDoNotRepeat(cards), false);
  });

  it("penalizes garments shown in an earlier round", () => {
    const wardrobe = [item("u1", "Upper", "#e53935", "red"), item("u2", "Upper", "#2255aa", "blue"), item("l1", "Lower", "#f5f5ef", "white"), item("l2", "Lower", "#292929", "black")];
    const baseline = pickTopOutfits(wardrobe, { occasion: "Informal", colorMode: "harmonious", limit: 1 });
    const shown = new Set(baseline[0]!.items.map(candidate => candidate.id));
    const later = pickTopOutfits(wardrobe, { occasion: "Informal", colorMode: "harmonious", previouslyShown: shown, limit: 1 });
    assert.ok(later[0]!.items.some(candidate => !shown.has(candidate.id)));
  });
});
