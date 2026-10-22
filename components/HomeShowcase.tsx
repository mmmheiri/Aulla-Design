"use client";
import {ColourModel} from "./ColourModel";
import { MotionCard } from "./MotionCard";
import {CollectionShortcuts} from './CollectionShortcuts';
import {CollectionTools} from './CollectionTools';
import { ColourCards } from "./ColourCards";
import { Money } from "./Money";
import { catalogueImage, catalogueSrcSet } from "../lib/catalogue-imagery";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  sourceProducts,
  sourceName,
  sourcePrice,
  type SourceProduct,
} from "../lib/source-catalogue";
import { money, tx } from "../lib/catalog";
import { useShop } from "./Shop";
import { Icon } from "./Icons";

const taif = sourceProducts.find((p) => p.id === "knwEQbiwWA9RLQ6QirLB")!;
const pieces = [taif, ...sourceProducts.filter((p) => p.id !== taif.id)];

export { EditorialHero as HomeShowcase } from "./EditorialHero";

export function SourceCard({ product: p }: { product: SourceProduct }) {
  const { locale, saved, toggleSave, products:shopItems } = useShop();
  const [colour,setColour]=useState<number|null>(null);
  const [namedColour,setNamedColour]=useState<string|null>(null);
  const productHref=`/collection/${p.id}/${namedColour==='برغندي'?'?colourName=burgundy':namedColour==='كحلي'?'?colourName=navy':colour!==null?'?colour='+colour:''}`;
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0)
      setFailed(true);
  }, []);
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const sizes = p.optionGroups
    .flatMap((group) => group.values)
    .filter((v) => /^\d+$/.test(v));
  return (
    <MotionCard className="source-card">
      <div className="source-card-frame">
      {p.soldOut&&<div className="piece-badges"><span data-kind="sold-out">{t('نفدت الكمية','Out of stock')}</span></div>}
      {!p.soldOut&&!!p.catalogueBadges?.length&&<div className="piece-badges">{p.catalogueBadges.slice(0,2).map(b=><span key={b} data-kind={b}><i aria-hidden="true"/>{({popular:t('الأكثر اهتمامًا','Popular'),bestseller:t('الأكثر مبيعًا','Bestseller'),new:t('جديد','New'),'low-stock':t('مخزون منخفض','Low stock')} as Record<string,string>)[b]}</span>)}</div>}
      <button className="icon-button source-save" aria-pressed={saved.includes(p.id)} aria-label={t("حفظ "+sourceName(p,locale),"Save "+sourceName(p,locale))} onClick={()=>toggleSave(p.id)}><Icon name="heart"/></button>
      <Link className="source-card-media" href={productHref}>
        {failed ? (
          <span className="media-fallback">
            {t("الصورة غير متاحة", "Image unavailable")}
          </span>
        ) : namedColour==='برغندي' ? <img src="/catalogue-transparent/lnPglpYAhuumNm2wHhtA-v2-burgundy.png" alt={sourceName(p,locale)} width="1122" height="1402" loading="lazy"/> : colour!==null ? <ColourModel id={p.id} code={colour} alt={sourceName(p,locale)+" · "+colour}/> : (
          <img
            ref={image}
            src={p.managed?p.images[0]?.local||undefined:catalogueImage(p.id)}
            srcSet={p.managed?undefined:catalogueSrcSet(p.id)} sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 23vw" decoding="async"
            alt={sourceName(p, locale)}
            width="1122"
            height="1402"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        )}
      </Link>
      </div>
      <div className="source-card-body">
        <Link href={productHref}>
          <h2>{sourceName(p, locale)}</h2>
        </Link>
        <p className="source-size-note">
          {sizes.length ? (
            <>
              <span>{t("المقاسات", "Sizes")}</span>{" "}
              <bdi>{sizes.join(" · ")}</bdi>
            </>
          ) : (
            t("شاهدي الخيارات والتفاصيل", "View options and details")
          )}
        </p>
        {p.id==='lnPglpYAhuumNm2wHhtA'&&<div className="card-colour-row" role="group" aria-label={t('ألوان المياسة','Mayasa colours')}>{[['برغندي','Burgundy','#481526'],['كحلي','Navy','#11182e']].map(([ar,en,hex])=><button key={ar} className="mini-colour-card" type="button" aria-pressed={namedColour===ar} onClick={()=>setNamedColour(ar)}><span style={{background:hex}}/><small>{t(ar,en)}</small></button>)}</div>}
        {p.addonGroups.some(g=>g.id==="sgsgty6umuqzu2p8")&&<ColourCards productId={p.id} onSelect={setColour}/>}
        <div className="source-card-bottom">
          <p>
            <Money value={shopItems.find(item=>item.id===p.id)?.price??sourcePrice(p)} locale={locale} />
            {p.compareAtPrice&&<del className="previous-price"><Money value={p.compareAtPrice} locale={locale}/></del>}
            <small>{t("سعر منشور", "Published price")}</small>
          </p>
          <Link
            className="source-card-action"
            href={productHref}
            aria-label={t(
              `عرض ${sourceName(p, locale)}`,
              `View ${sourceName(p, locale)}`,
            )}
          >
            {t("اختاري القطعة", "Choose your piece")}
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </MotionCard>
  );
}

export function HomeCollection() {
  const { locale,products:shopItems,sourceCatalog:sourceProducts } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("source");
  const [size, setSize] = useState("");
  const products = sourceProducts.filter(
    (p) =>
      (sourceName(p,'en') + ' ' + p.name + ' ' + p.description).toLowerCase().includes(query.toLowerCase()) &&
      (!size || p.optionGroups.some((g) => g.values.includes(size))),
  );
  if (sort !== "source")
    products.sort(
      (a, b) => ((shopItems.find(p=>p.id===a.id)?.price??sourcePrice(a)) - (shopItems.find(p=>p.id===b.id)?.price??sourcePrice(b))) * (sort === "low" ? 1 : -1),
    );
  return (
    <section className="home-source container" id="aulla-pieces">
      <CollectionShortcuts />
      <div className="section-heading">
        <div>
          <h2>{t("عبايات أولّا", "The Aulla collection")}</h2>
          <p>{t("اختاري اللون، واستكشفي التفاصيل، ثم حددي مقاسكِ.", "Find your colour. Explore the details. Choose your fit.")}</p>
        </div>
        <Link className="text-link" href="/collection/">
          {t("المجموعة كاملة", "View the collection")}
          <Icon name="arrow" />
        </Link>
      </div>
      <CollectionTools query={query} size={size} sort={sort} sizes={[...new Set(sourceProducts.flatMap(p=>p.optionGroups.filter(g=>g.name==='Size').flatMap(g=>g.values)).filter(v=>/^\d+$/.test(v)))]} count={products.length} shown={query||size?products.length:Math.min(6,products.length)} onQuery={setQuery} onSize={setSize} onSort={setSort} onReset={()=>{setQuery('');setSize('');setSort('source')}}/>
      <div className="collection-status">
        <small>
          {t(
            "الصور الأصلية داخل كل قطعة · تجربة شراء اختبارية",
            "Original photos inside each piece · Test checkout",
          )}
        </small>
      </div>
      {products.length ? (
        <div className="source-grid">
          {(query||size?products:products.slice(0,6)).map((p) => (
            <SourceCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>{t("لا توجد نتائج", "No matching pieces")}</h3>
          <button
            className="button"
            onClick={() => {
              setQuery("");
              setSize("");
            }}
          >
            {t("مسح البحث والفلاتر", "Clear search and filters")}
          </button>
        </div>
      )}
      {!query&&!size&&products.length>6&&<Link className="text-link collection-view-all" href="/collection/">{t('استكشفي كل العبايات','Explore all abayas')} <span>({products.length})</span><Icon name="arrow"/></Link>}
    </section>
  );
}
