export type Gender = "MALE" | "FEMALE" | "OTHER";
export type ClothingGroup = "Upper" | "Lower" | "Full Body" | "Outerwear" | "Footwear" | "Accessories";
export type Taxonomy = Record<Gender, Partial<Record<ClothingGroup, Record<string, string[]>>>>;

export const TAXONOMY: Taxonomy = {
  MALE: {
    Upper: {
      "T-Shirts": ["Crew neck", "V-neck", "Henley", "Graphic tee"],
      Shirts: ["Formal button-down", "Casual", "Chambray", "Flannel"],
      "Polos & Knits": ["Polo", "Turtleneck", "Sweater", "Cardigan", "Hoodie", "Sweatshirt"],
      Traditional: ["Kurta", "Sherwani", "Nehru jacket"],
    },
    Lower: { Pants: ["Chinos", "Formal trousers", "Cargo", "Joggers", "Trackpants"], Denim: ["Slim", "Straight", "Relaxed"], "Shorts & Traditional": ["Bermuda", "Athletic shorts", "Dhoti", "Lungi"] },
    Outerwear: { Jackets: ["Denim jacket", "Bomber", "Leather jacket", "Windbreaker"], Formal: ["Blazer", "Suit", "Overcoat"] },
    Footwear: { Shoes: ["Sneakers", "Oxford", "Derby", "Monk", "Loafers", "Boots", "Sandals", "Sliders"] },
    Accessories: { Accessories: ["Belt", "Watch", "Wallet", "Tie", "Pocket square", "Cufflinks", "Hat/Cap", "Sunglasses", "Ring", "Bracelet", "Chain"] },
  },
  FEMALE: {
    Upper: { Tops: ["Blouse", "Crop top", "Tank top", "Camisole", "Tunic", "T-shirt"], Traditional: ["Kurti", "Anarkali", "Saree blouse"], Layers: ["Cardigan", "Pullover", "Shrug", "Cape", "Hoodie"] },
    Lower: { Pants: ["Formal trousers", "Palazzo", "Culottes", "Cigarette pants", "Joggers"], "Denim & Leggings": ["Skinny jeans", "Straight jeans", "Leggings", "Jeggings"], "Skirts & Ethnic": ["Mini skirt", "Midi skirt", "Maxi skirt", "Sharara", "Salwar", "Lehenga"] },
    "Full Body": { Dress: ["Casual", "Party", "Maxi"], OnePiece: ["Jumpsuit", "Romper", "Saree", "Gown"] },
    Outerwear: { Coats: ["Blazer", "Trench coat", "Denim jacket", "Biker jacket", "Bomber"] },
    Footwear: { Shoes: ["Stiletto", "Block heels", "Flats", "Sneakers", "Boots", "Loafers", "Wedges", "Sandals", "Kolhapuri"] },
    Accessories: { Accessories: ["Stud earrings", "Hoop earrings", "Dangler earrings", "Necklace", "Ring", "Bracelet", "Bangles", "Tote", "Sling", "Clutch", "Belt", "Hair accessory", "Scarf/Stole", "Sunglasses"] },
  },
  OTHER: {},
};
TAXONOMY.OTHER = { ...TAXONOMY.MALE, ...TAXONOMY.FEMALE };
export const CLOTHING_GROUPS: ClothingGroup[] = ["Upper", "Lower", "Full Body", "Outerwear", "Footwear", "Accessories"];
