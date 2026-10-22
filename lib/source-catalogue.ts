import snapshot from "../docs/source-import/products.json";
import adjustments from './catalogue-adjustments.json';
export type SourceImage = { url: string; local: string | null };
export type SourceProduct = {
  managed?: boolean;
  soldOut?: boolean;
  compareAtPrice?:number;
  catalogueBadges?: string[];
  inventory?: {size:string;quantity:number;reserved:number;available:number}[];
  id: string;
  url: string;
  name: string;
  description: string;
  price: number;
  offers: { price?: number; lowPrice?: number; highPrice?: number };
  images: SourceImage[];
  optionGroups: { id: string; name: string; values: string[] }[];
  addonGroups: {
    id: string;
    name: string;
    required?: boolean;
    options: {
      id: string;
      name: string;
      price?: number;
      image?: SourceImage;
    }[];
  }[];
  warnings: string[];
};
export const sourceProducts = (snapshot.products as SourceProduct[]).map(product=>{const update=(adjustments as Record<string,{price:number;compareAtPrice:number;soldOut:boolean}>)[product.id];return update?{...product,price:update.price,offers:{price:update.price},compareAtPrice:update.compareAtPrice,soldOut:update.soldOut}:product;});
export const sourceSeller = snapshot.seller;
export const sourceDate = snapshot.capturedAt;
export const sourcePrice = (p: SourceProduct) =>
  p.offers.lowPrice ?? p.offers.price ?? p.price;
export function sourceName(p: SourceProduct, locale: "ar" | "en") {
  const parts = p.name.split("|");
  const name=(parts[locale === "ar" ? 0 : 1] || p.name).trim();
  return locale==='en'?name.toLowerCase().replace(/\b[a-z]/g,letter=>letter.toUpperCase()):name;
}
