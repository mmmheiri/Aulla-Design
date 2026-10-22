"use client";
import { useState } from "react";
import { Dialog } from "./Dialog";
import { useShop } from "./Shop";
import { tx } from "../lib/catalog";
import { catalogueImage, catalogueOriginal } from "../lib/catalogue-imagery";
import { sourceName, type SourceProduct } from "../lib/source-catalogue";

export function CatalogueZoom({ product, onClose }: { product: SourceProduct; onClose: () => void }) {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [source, setSource] = useState(-1);
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const select = (value: number) => { setSource(value); setScale(1); setFailed(false); };
  const src = source < 0 ? catalogueOriginal(product.id) : product.images[source].local!;
  return <Dialog wide title={`${t("تكبير صور", "Enlarge photos of")} ${sourceName(product, locale)}`} closeLabel={t("إغلاق", "Close")} onClose={onClose}>
    <div className="zoom-toolbar">
      <span className="zoom-photo-count"><bdi>{source + 2} / {product.images.length + 1}</bdi></span>
      <div className="zoom-levels" role="group" aria-label={t("مستوى التكبير", "Zoom level")}>
        {[1,2,4].map(value=><button key={value} aria-pressed={scale===value} aria-label={value===1?t("الصورة كاملة","Fit image"):`${value}×`} onClick={()=>setScale(value)}>{value===1?t("كاملة","Fit"):`${value}×`}</button>)}
      </div>
    </div>    <div className={`catalogue-zoom-image ${scale > 1 ? "enlarged" : ""}`} tabIndex={0} role="region" aria-label={t("الصورة المكبّرة؛ قابلة للتمرير", "Enlarged image; scrollable")}>
      {failed ? <div className="media-fallback" role="status"><p>{t("تعذّر تحميل الصورة", "The image could not load")}</p><button className="button secondary" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>{t("إعادة المحاولة", "Retry")}</button></div>
        : <img key={`${source}-${retry}`} src={src} alt={`${sourceName(product, locale)} · ${source < 0 ? t("على العارضة", "On the model") : t(`صورة ${source + 1}`, `Photo ${source + 1}`)}`} style={scale > 1 ? { width: `${scale * 100}%` } : undefined} onError={() => setFailed(true)} />}
    </div>
    <div className="zoom-thumbnails" role="group" aria-label={t("اختيار الصورة","Choose image")}>
      {[catalogueImage(product.id),...product.images.map(image=>image.local!)].map((image,index)=><button key={index} aria-pressed={source===index-1} aria-label={index===0?t("على العارضة","On the model"):t(`صورة ${index}`,`Photo ${index}`)} onClick={()=>select(index-1)}><img src={image} alt="" loading="lazy"/></button>)}
    </div>
    {scale>1&&<p className="zoom-pan-hint">{t("مرّري الصورة لرؤية التفاصيل","Scroll the image to inspect details")}</p>}  </Dialog>;
}
