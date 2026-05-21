export type Category = "all" | "tees" | "outerwear" | "headwear" | "accessories";

export type Product = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  category: Exclude<Category, "all">;
  images: string[];
  sizes: string[];
  badge?: "new" | "low-stock" | "sold-out" | "best";
  description: string;
};

export const categoryLabels: Record<Category, string> = {
  all: "All",
  tees: "Tees",
  outerwear: "Outerwear",
  headwear: "Headwear",
  accessories: "Accessories",
};

export const products: Product[] = [
  {
    id: "p1",
    name: "Crimson Mass Tee",
    tagline: "Heavyweight cotton · garment-dyed",
    price: 68,
    category: "tees",
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "best",
    description:
      "12oz oversized boxy fit. Hand-screened crest at the chest. Pre-shrunk and washed for a worn-in feel from day one.",
  },
  {
    id: "p2",
    name: "Night Run Hoodie",
    tagline: "Brushed fleece · midweight",
    price: 148,
    category: "outerwear",
    images: [
      "https://images.unsplash.com/photo-1556821833-fda6df5b9f1e?w=800",
      "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=800",
    ],
    sizes: ["S", "M", "L", "XL"],
    badge: "new",
    description:
      "Heavy brushed-back fleece in matte black. Tonal embroidered monogram at the heart. Ribbed cuffs and waistband.",
  },
  {
    id: "p3",
    name: "Society Leather Vest",
    tagline: "Italian lambskin · hand-finished",
    price: 685,
    category: "outerwear",
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800",
    ],
    sizes: ["S", "M", "L", "XL"],
    badge: "low-stock",
    description:
      "Made in small batches by a third-generation Florentine atelier. Brass snap closure. Crimson silk lining. Embossed crest at the back yoke.",
  },
  {
    id: "p4",
    name: "Iron Saint Cap",
    tagline: "Garment-washed twill",
    price: 48,
    category: "headwear",
    images: ["https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800"],
    sizes: ["One Size"],
    description:
      "Six-panel low-profile cap. Antique brass buckle. Embroidered monogram in tonal crimson thread.",
  },
  {
    id: "p5",
    name: "Long Shadow Tee",
    tagline: "Pima cotton · oversized",
    price: 72,
    category: "tees",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Long-line silhouette in heavyweight Peruvian Pima. Side-vented hem. Screen-printed mantra at the back.",
  },
  {
    id: "p6",
    name: "Red Veil Bandana",
    tagline: "Silk-cotton blend",
    price: 38,
    category: "accessories",
    images: ["https://images.unsplash.com/photo-1611601679499-95c1cb1fdf66?w=800"],
    sizes: ["One Size"],
    badge: "new",
    description:
      "Hand-rolled edges. Tonal crimson paisley with the Society crest in the center. Versatile under helmets or as a neck wrap.",
  },
  {
    id: "p7",
    name: "Savage Grace Beanie",
    tagline: "Merino-cashmere blend",
    price: 62,
    category: "headwear",
    images: ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800"],
    sizes: ["One Size"],
    description:
      "Italian-spun merino with 10% cashmere. Cuffed silhouette. Crimson woven label at the fold.",
  },
  {
    id: "p8",
    name: "Black Mass Jacket",
    tagline: "Waxed canvas · waterproof",
    price: 385,
    category: "outerwear",
    images: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    badge: "sold-out",
    description:
      "Heavy 14oz waxed canvas from Halley Stevensons. YKK brass hardware. Cropped moto silhouette. Crimson satin lining.",
  },
];

export const formatPrice = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

export const badgeStyle = (b?: Product["badge"]) => {
  if (b === "new") return "border-[#e87a82]/60 bg-[#b4141e]/15 text-[#e87a82]";
  if (b === "low-stock") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  if (b === "best") return "border-white/30 bg-black/60 text-white";
  if (b === "sold-out") return "border-white/20 bg-black/80 text-white/60";
  return "";
};

export const badgeLabel = (b?: Product["badge"]) => {
  if (b === "new") return "New";
  if (b === "low-stock") return "Low Stock";
  if (b === "best") return "Best Seller";
  if (b === "sold-out") return "Sold Out";
  return "";
};

export const getProduct = (id: string) => products.find((p) => p.id === id);