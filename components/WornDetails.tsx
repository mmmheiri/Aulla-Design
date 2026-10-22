"use client";
import { useState } from "react";
import Link from "next/link";
import { useShop } from "./Shop";
import { tx } from "../lib/catalog";
import { catalogueImage, catalogueSrcSet } from "../lib/catalogue-imagery";
import { sourceName, sourceProducts } from "../lib/source-catalogue";
import { CatalogueZoom } from "./CatalogueZoom";

export function WornDetails() {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [id, setId] = useState(sourceProducts.find(p => /طيف/.test(p.name))?.id ?? sourceProducts[0].id);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const product = sourceProducts.find(p => p.id === id)!;
  const name = sourceName(product, locale);
  return <section className="worn-details container" id="worn-details" aria-labelledby="worn-details-title">
    <div className="worn-details-heading">
      <h2 id="worn-details-title">{t("تفاصيل القطعة عن قرب", "A closer look at each piece")}</h2>
      <p>{t("اختاري العباية وشاهدي تفاصيلها وهي ملبوسة.", "Choose an abaya to see its details on the model.")}</p>
    </div>
    <div className="worn-details-layout">
      <div>
        {failed ? <div className="worn-details-failure" role="status"><p>{t("تعذّر تحميل الصورة", "The image could not load")}</p><button className="button secondary" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>{t("إعادة المحاولة", "Retry")}</button></div>
          : <button className="worn-details-photo" aria-label={`${t("تكبير تفاصيل", "Enlarge details of")} ${name}`} onClick={() => setOpen(true)}>
            <img key={`${id}-${attempt}`} src={catalogueImage(id)} srcSet={catalogueSrcSet(id)} sizes="(max-width:760px) 94vw, 50vw" alt={`${name} · ${t("لقطة مقرّبة للعباية على العارضة", "Close-up of the abaya on the model")}`} loading="lazy" onError={() => setFailed(true)} />
          </button>}
        <p className="worn-details-caption" aria-live="polite">{name}</p>
      </div>
      <div className="worn-details-selection">
        <div className="worn-details-options" role="group" aria-label={t("اختيار العباية للتقريب", "Choose an abaya for a closer look")}>
          {sourceProducts.map(p => <button key={p.id} aria-pressed={id === p.id} onClick={() => { setId(p.id); setFailed(false); }}>
            <img src={catalogueImage(p.id)} alt="" loading="lazy" /><span>{sourceName(p, locale)}</span>
          </button>)}
        </div>
        <button className="button secondary" onClick={() => setOpen(true)}>{t("تكبير الصور", "Enlarge photos")}</button>
        <Link className="text-link" href={`/collection/${id}/`}>{t("عرض تفاصيل العباية", "View abaya details")}</Link>
      </div>
    </div>
    {open && <CatalogueZoom product={product} onClose={() => setOpen(false)} />}
  </section>;
}
