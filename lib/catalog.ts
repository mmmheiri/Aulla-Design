export type Locale = "ar" | "en";
export type Pair = [string, string];
export type Product = {
  id: string;
  name: Pair;
  price: number;
  stock: number;
  source?: boolean;
  soldOut?: boolean;
  image?: string;
  choicePrices?: Record<string,Record<string,number>>;
  sizes?: string[];
  choices?: {id:string;required:boolean;values:string[]}[];
  tone: string;
  group: "daily" | "occasion";
};
// Independent fictional records. Nothing here asserts the reference shop's inventory or garment details.
export const catalogue: Product[] = [
  {
    id: "demo-01",
    name: ["نموذج 01", "Study 01"],
    price: 330,
    stock: 5,
    tone: "ink",
    group: "daily",
  },
  {
    id: "demo-02",
    name: ["نموذج 02", "Study 02"],
    price: 380,
    stock: 3,
    tone: "stone",
    group: "occasion",
  },
  {
    id: "demo-03",
    name: ["نموذج 03", "Study 03"],
    price: 260,
    stock: 4,
    tone: "clay",
    group: "daily",
  },
  {
    id: "demo-04",
    name: ["نموذج 04", "Study 04"],
    price: 280,
    stock: 0,
    tone: "charcoal",
    group: "occasion",
  },
  {
    id: "demo-05",
    name: ["نموذج 05", "Study 05"],
    price: 350,
    stock: 2,
    tone: "olive",
    group: "daily",
  },
  {
    id: "demo-06",
    name: ["نموذج 06", "Study 06"],
    price: 310,
    stock: 6,
    tone: "sand",
    group: "occasion",
  },
];
export const sizes = ["50", "52", "54", "56", "58", "60"];
export const tx = (locale: Locale, ar: string, en: string) =>
  locale === "ar" ? ar : en;
export const nameOf = (p: Product, locale: Locale) =>
  p.name[locale === "ar" ? 0 : 1];
export const money = (value: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(value);
