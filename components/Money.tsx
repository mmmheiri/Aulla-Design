import type { Locale } from "../lib/catalog";

/** Official CBUAE symbol before the amount, isolated from surrounding RTL text. */
export function Money({ value, locale, fixed=false }: { value: number; locale: Locale; fixed?:boolean }) {
  const digits = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: fixed?2:0,
  }).format(value);
  return <bdi className="money" dir="ltr">
    <span className="sr-only">{digits} {locale === "ar" ? "درهم إماراتي" : "UAE dirhams"}</span>
    <span className="dirham-symbol" aria-hidden="true" />
    <span aria-hidden="true">{digits}</span>
  </bdi>;
}
