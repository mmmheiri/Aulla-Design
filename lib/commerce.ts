import type { Product } from "./catalog.ts";
export type CartLine = { id: string; size: string; quantity: number; options?: Record<string,string> };
const validSizes = ["50", "52", "54", "56", "58", "60"];
/** Option surcharges come from the catalogue; server quotes remain authoritative. */
export function linePrice(line:Pick<CartLine,'options'>,product:Product){
  return Math.round((product.price+Object.entries(line.options||{}).reduce((sum,[group,value])=>sum+(product.choicePrices?.[group]?.[value]||0),0))*100)/100;
}
export function lineKey(line: Pick<CartLine, "id" | "size" | "options">) {
  return line.id + ":" + line.size + (line.options ? ":"+JSON.stringify(Object.entries(line.options).sort()) : "");
}
/** Stock is capped across all sizes of a product, not per line. Restored values are untrusted. */
export function normalizeCart(input: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(input)) return [];
  const lines: CartLine[] = [];
  const used = new Map<string, number>();
  for (const candidate of input.slice(0, 100)) {
    if (!candidate || typeof candidate !== "object") continue;
    const { id, size, quantity } = candidate;
    const p = products.find((p) => p.id === id);
    if (
      !p ||
      !(p.sizes ?? validSizes).includes(size) ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    )
      continue;
    const options: Record<string,string> = {};
    let invalid = false;
    for (const group of p.choices ?? []) {
      const value = candidate.options?.[group.id];
      if (value !== undefined && !group.values.includes(value)) invalid = true;
      if (group.required && !value) invalid = true;
      if (typeof value === 'string' && group.values.includes(value)) options[group.id] = value;
    }
    if (invalid) continue;
    const clean = {id,size,quantity,...(Object.keys(options).length ? {options} : {})};
    const stock = Math.max(0, Math.floor(p.stock));
    const q = Math.min(quantity, stock - (used.get(id) || 0));
    if (q <= 0) continue;
    used.set(id, (used.get(id) || 0) + q);
    const existing = lines.find((l) => lineKey(l) === lineKey(clean));
    if (existing) existing.quantity += q;
    else lines.push({ ...clean, quantity: q });
  }
  return lines;
}
export function totals(cart: CartLine[], products: Product[]) {
  const lines = normalizeCart(cart, products);
  const subtotal =
    Math.round(
      lines.reduce(
        (s, l) =>
          s + linePrice(l,products.find((p)=>p.id===l.id)!) * l.quantity,
        0,
      ) * 100,
    ) / 100;
  const delivery = subtotal === 0 || subtotal >= 600 ? 0 : 25;
  return {
    subtotal,
    delivery,
    total: Math.round((subtotal + delivery) * 100) / 100,
    count: lines.reduce((s, l) => s + l.quantity, 0),
  };
}
export function demoReceipt(attempt: string, completed: Map<string, string>) {
  if (completed.has(attempt)) return completed.get(attempt)!;
  const id = "DEMO-" + crypto.randomUUID();
  completed.set(attempt, id);
  return id;
}
