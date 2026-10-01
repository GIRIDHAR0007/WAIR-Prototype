export type DemoGarment = {
  category: string;
  subcategory: string;
  color: string;
  hex: string;
  formality: number;
  traditional: boolean;
};

export const DEMO_WARDROBE: DemoGarment[] = [
  { category: "Upper", subcategory: "Crew neck T-shirt", color: "White", hex: "#f4f1e8", formality: 3, traditional: false },
  { category: "Upper", subcategory: "Formal button-down", color: "Blue", hex: "#7393b4", formality: 8, traditional: false },
  { category: "Upper", subcategory: "Sweater", color: "Olive", hex: "#78805b", formality: 5, traditional: false },
  { category: "Upper", subcategory: "Kurta", color: "Rust", hex: "#b65c3a", formality: 6, traditional: true },
  { category: "Upper", subcategory: "Blouse", color: "Black", hex: "#292725", formality: 7, traditional: false },
  { category: "Lower", subcategory: "Chinos", color: "Beige", hex: "#c9b99d", formality: 6, traditional: false },
  { category: "Lower", subcategory: "Straight jeans", color: "Denim", hex: "#426887", formality: 4, traditional: false },
  { category: "Lower", subcategory: "Formal trousers", color: "Charcoal", hex: "#4b4b4b", formality: 8, traditional: false },
  { category: "Lower", subcategory: "Midi skirt", color: "Burgundy", hex: "#772c42", formality: 6, traditional: false },
  { category: "Full Body", subcategory: "Casual dress", color: "Sage", hex: "#a0aa91", formality: 5, traditional: false },
  { category: "Outerwear", subcategory: "Denim jacket", color: "Denim", hex: "#587b95", formality: 5, traditional: false },
  { category: "Outerwear", subcategory: "Blazer", color: "Navy", hex: "#263b56", formality: 9, traditional: false },
  { category: "Footwear", subcategory: "Sneakers", color: "White", hex: "#ecebe5", formality: 3, traditional: false },
  { category: "Footwear", subcategory: "Loafers", color: "Brown", hex: "#735541", formality: 7, traditional: false },
  { category: "Accessories", subcategory: "Scarf", color: "Mustard", hex: "#c59a3b", formality: 4, traditional: false },
  { category: "Upper", subcategory: "Henley", color: "Olive", hex: "#87906b", formality: 4, traditional: false },
  { category: "Lower", subcategory: "Joggers", color: "Charcoal", hex: "#646761", formality: 5, traditional: false },
  { category: "Upper", subcategory: "Silk blouse", color: "Cream", hex: "#e7deca", formality: 7, traditional: false },
  { category: "Lower", subcategory: "Formal skirt", color: "Navy", hex: "#33415b", formality: 7, traditional: false },
  { category: "Upper", subcategory: "Structured shirt", color: "Slate", hex: "#697c8e", formality: 9, traditional: false },
  { category: "Lower", subcategory: "Wide-leg trousers", color: "Black", hex: "#33332f", formality: 9, traditional: false },
];

export function demoImageSvg(hex: string, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><rect width="500" height="500" fill="#f1efe8"/><circle cx="250" cy="230" r="160" fill="${hex}" opacity=".13"/><path d="M180 130h140l75 90-50 42-35-40v155H190V222l-35 40-50-42z" fill="${hex}"/><text x="250" y="440" text-anchor="middle" font-family="Arial" font-size="20" fill="#777">${label}</text></svg>`;
}
