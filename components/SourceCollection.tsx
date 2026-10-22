"use client";
import {ColourModel} from "./ColourModel";
import {translatedDescription} from "../lib/product-copy";
import {collectionGroups,inGroup,validGroup,relatedPieces,type CollectionGroup} from '../lib/collection-groups';
import colourData from "../docs/source-import/fabric-colours.json";
import {normalizeCart,linePrice} from "../lib/commerce";
import {tailoringSizeGroup} from '../lib/tailoring.mjs';
import {selectionLabel} from '../lib/selection-display';
import { Money } from "./Money";
import { FabricColourPicker } from "./FabricColourPicker";
import { SourceSizeGuide } from "./SourceSizeGuide";
import { catalogueImage, catalogueOriginal, catalogueSrcSet } from "../lib/catalogue-imagery";
import { photoObservations } from "../lib/photo-observations";
import { sizeLabels } from "../lib/size-labels";
import { Icon } from "./Icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useShop, PageTitle } from "./Shop";
import {PageDots} from "./PageDots";
import {ImageLens} from "./ImageLens";
import {RelatedPieces} from "./RelatedPieces";
import {CustomMeasurements} from './CustomMeasurements';
import {measurementsComplete} from '../lib/measurements';
import { SourceCard } from "./HomeShowcase";
import { CollectionTools } from './CollectionTools';
import {
  sourceProducts,
  sourceName,
  sourcePrice,
  sourceSeller,
  type SourceProduct,
} from "../lib/source-catalogue";
import { money, tx } from "../lib/catalog";
export function SourceCollection() {
  const { locale, saved, products: shopItems,sourceCatalog:sourceProducts } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("source");
  const [size, setSize] = useState("");
  const [filtersReady,setFiltersReady]=useState(false);
  const [onlySaved,setOnlySaved]=useState(false);
  const [group,setGroup]=useState<CollectionGroup>('all');
  const chooseGroup=(next:CollectionGroup)=>setGroup(next);
  useEffect(() => {
    const restore=()=>{const params=new URLSearchParams(location.search);setQuery(params.get('q')||'');setOnlySaved(params.get('saved')==='1');setGroup(validGroup(params.get('group')));setSize(params.get('size')||'');setSort(['low','high'].includes(params.get('sort')||'')?params.get('sort')!:'source');setFiltersReady(true);};
    restore();addEventListener('popstate',restore);return()=>removeEventListener('popstate',restore);
  }, []);
  useEffect(()=>{if(!filtersReady)return;const url=new URL(location.href);for(const [key,value] of Object.entries({q:query,size,sort:sort==='source'?'':sort,saved:onlySaved?'1':'',group:group==='all'?'':group})){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history.replaceState(null,'',url);},[query,size,sort,onlySaved,group,filtersReady]);
  const sizes=[...new Set(sourceProducts.flatMap(p=>p.optionGroups.flatMap(g=>g.values)).filter(v=>/^\d+$/.test(v)))].sort((a,b)=>Number(a)-Number(b));
  const products = sourceProducts.filter((p) =>
    inGroup(p,group) && (!onlySaved || saved.includes(p.id)) && (!size||p.optionGroups.some(g=>g.values.includes(size))) && (sourceName(p,'en') + " " + p.name + " " + p.description).toLowerCase().includes(query.trim().toLowerCase()),
  );
  if (sort !== "source")
    products.sort(
      (a, b) => ((shopItems.find(p=>p.id===a.id)?.price??sourcePrice(a)) - (shopItems.find(p=>p.id===b.id)?.price??sourcePrice(b))) * (sort === "low" ? 1 : -1),
    );
  return (
    <section className="container source-collection">
      <PageTitle title={t("عبايات أولّا", "The Aulla collection")} />
      <p className="source-intro">
        {t(
          "اختاري قطعتك، واكتشفي صورها ومقاساتها وألوانها.",
          "Find your piece, then explore its photographs, sizes and colours.",
        )}
      </p>
      <div className="collection-shortcuts" role="group" aria-label={t('تصفحي حسب التفاصيل','Browse by detail')}>{collectionGroups.map(g=><button key={g.id} aria-pressed={group===g.id} onClick={()=>chooseGroup(g.id)}>{g[locale]}</button>)}</div>
      <CollectionTools query={query} size={size} sort={sort} sizes={sizes} count={products.length} onlySaved={onlySaved} groupActive={group!=='all'} onQuery={setQuery} onSize={setSize} onSort={setSort} onSaved={()=>setOnlySaved(!onlySaved)} onReset={()=>{setQuery('');setSize('');setSort('source');setOnlySaved(false);setGroup('all')}}/>
      {products.length === 0 ? (
        <div className="empty">
          <h2>{t("لا توجد نتائج", "No matching pieces")}</h2>
          <p>
            {t(
              "جرّبي اسمًا آخر أو امسحي البحث.",
              "Try another name or clear the search.",
            )}
          </p>
          <button className="button" onClick={() => {setQuery("");setSize('');setSort('source');setOnlySaved(false);chooseGroup('all')}}>
            {t("مسح الفلاتر", "Clear filters")}
          </button>
        </div>
      ) : (
        <div className="source-grid">
          {products.map((p) => (
            <SourceCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
export function SourceDetail({ id,initialProduct }: { id: string;initialProduct?:SourceProduct }) {
  const { locale, products, cart, setCart, notice, openBag,sourceCatalog,measurements } = useShop();
  const original = sourceCatalog.find((p) => p.id === id)||initialProduct||sourceProducts.find(p=>p.id===id)!;
  const sizeOption=tailoringSizeGroup(original);
  const p = { ...original, optionGroups:original.optionGroups.some(g=>g.name==='Size')?original.optionGroups.map(g=>g.name==='Size'?sizeOption:g):[...original.optionGroups,sizeOption], images: original.managed?original.images:[{url: catalogueImage(id), local: catalogueImage(id)}, ...original.images] };
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const mayasaGroup='h5lv7eefmutwa2g4';
  const burgundy=id==='lnPglpYAhuumNm2wHhtA'&&selection[mayasaGroup]==='برغندي';
  const modelSrc=burgundy?'/catalogue-transparent/lnPglpYAhuumNm2wHhtA-v2-burgundy.png':original.managed?p.images[0].local!:catalogueImage(id);
  const [sizeGuide, setSizeGuide] = useState(false);
  const [colour, setColour] = useState<number|null>(null);
  const priced=products.find(item=>item.id===id);
  const selectedPrice=priced?linePrice({options:selection},priced):sourcePrice(p);
  const [coloursOpen,setColoursOpen]=useState(false);
  useEffect(()=>{
    const named=new URLSearchParams(location.search).get('colourName');
    if(id==='lnPglpYAhuumNm2wHhtA'&&(named==='burgundy'||named==='navy'))setSelection(s=>({...s,h5lv7eefmutwa2g4:named==='burgundy'?'برغندي':'كحلي'}));
    const code=Number(new URLSearchParams(location.search).get("colour"));
    if(original.addonGroups.some(g=>g.id==="sgsgty6umuqzu2p8")&&colourData.samples.some(s=>s.code===code))setColour(code);
  },[id,original]);
  const [added,setAdded]=useState(false);
  const [selectionError,setSelectionError]=useState('');
  const detailsRef=useRef<HTMLDivElement>(null);
  const addToBag=()=>{
    const product=products.find(item=>item.id===id);
    if(!product){notice(t('القطعة غير متاحة. حدّثي الصفحة.','This piece is unavailable. Refresh the page.'));return;}
    const sizeGroup=p.optionGroups.find(g=>g.name==='Size');
    const size=sizeGroup?selection[sizeGroup.id]:'—';
    const options: Record<string,string>={...selection,...(colour!==null?{sgsgty6umuqzu2p8:String(colour)}:{})};
    if(!size || product.choices?.some(g=>g.required&&!options[g.id])){
      const message=t('اختاري المقاس والخيارات المطلوبة أولًا','Choose your size and required options first');setSelectionError(message);notice(message);const missing=product.choices?.find(g=>g.required&&!options[g.id]);const target=missing?detailsRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(missing.id)}"]`):detailsRef.current?.querySelector<HTMLElement>('.source-options select');if(missing?.id==='sgsgty6umuqzu2p8')setColoursOpen(true);(target||detailsRef.current?.querySelector<HTMLElement>('.fabric-disclosure summary'))?.focus();return;
    }
    if(/تفصيل/.test(size)&&!measurementsComplete(measurements)){const message=t('أكملي قياسات التفصيل أولًا.','Complete your made-to-measure details first.');setSelectionError(message);notice(message);detailsRef.current?.querySelector<HTMLInputElement>('.custom-measurements input')?.focus();return;}
    if(cart.filter(l=>l.id===id).reduce((n,l)=>n+l.quantity,0)>=product.stock){notice(t('وصلتِ حد الكمية في المعاينة','Preview quantity limit reached'));return;}
    setCart(c=>normalizeCart([...c,{id,size,options,quantity:1}],products));
    setSelectionError('');setAdded(true);openBag();notice(t('أُضيفت إلى سلة المعاينة','Added to your preview bag'));
  };
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [index, retry]);
  const move = (delta: number) => {
    setIndex((v) => (v + delta + p.images.length) % p.images.length);
    setFailed(false);setZoom(false);
  };
  return (
    <section className="container source-detail">
      <Link className="text-link" href="/collection/">
        {t("كل العبايات", "All pieces")}
      </Link>
      <div className="product-layout">
        <div className="source-gallery">
          <div
            className="source-stage"
            onTouchStart={(e) => {
              if(zoom)return;
              start.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
              dragged.current = false;
            }}
            onTouchEnd={(e) => {
              if (!start.current) return;
              const dx = e.changedTouches[0].clientX - start.current.x,
                dy = e.changedTouches[0].clientY - start.current.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                dragged.current = true;
                move((dx < 0 ? 1 : -1) * (locale === "ar" ? -1 : 1));
              }
              start.current = null;
            }}
          >
            {failed ? (
              <div className="media-fallback" role="status">
                <p>{t("تعذّر تحميل الصورة", "The image could not load")}</p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setFailed(false);
                    setRetry((v) => v + 1);
                  }}
                >
                  {t("إعادة المحاولة", "Try again")}
                </button>
              </div>
            ) : (
<ImageLens key={index} active={zoom} onChange={active=>{if(!dragged.current)setZoom(active);dragged.current=false;}} label={t("تكبير بالعدسة","Magnify image")} closeLabel={t("إغلاق العدسة","Close magnifier")} detail={index===0&&colour!==null?<ColourModel id={id} code={colour} alt=""/>:<img src={index===0?(burgundy||original.managed?modelSrc:catalogueOriginal(id)):p.images[index].local!} alt=""/>}>
                {index===0&&colour!==null?<ColourModel id={id} code={colour} alt={sourceName(p,locale)+" · "+colour}/>:<img
                  ref={imageRef}
                  key={index + "-" + retry}
                  src={index===0?modelSrc:p.images[index].local!}
                srcSet={index===0&&!burgundy&&!original.managed?catalogueSrcSet(id):undefined} sizes="(max-width: 760px) 94vw, 48vw"
                  alt={`${sourceName(p, locale)} · ${t('صورة','Image')} ${index + 1}`}
                  width="704"
                  height="704"
                  onError={() => setFailed(true)}
                />}
              </ImageLens>
            )}
          </div>
          <PageDots count={p.images.length} index={index} label={t("صور القطعة","Piece images")} onChange={i=>{setIndex(i);setZoom(false);setFailed(false);}}/>
          <div className="thumbnails">
            {p.images.map((image, i) => (
              <button
                key={image.url}
                className={index === i ? "active" : ""}
                aria-pressed={index === i}
                aria-label={`${t("الصورة", "Image")} ${i + 1}`}
                onClick={() => {
                  setIndex(i);
                  setFailed(false);
                }}
              >
                <img src={i===0?modelSrc:image.local!} alt="" width="80" height="80" />
              </button>
            ))}
          </div>
          <p className="caption">
            {t(
              index===0?"اضغطي للعدسة أو اسحبي لبقية الصور.":"صورة أصلية · اضغطي للتكبير أو اسحبي لباقي الصور.",
              index===0?"Tap for the magnifier; swipe for more photos.":"Original photograph · Tap for the magnifier or swipe for more.",
            )}
          </p>
        </div>
        <div className="source-info" ref={detailsRef}>
          <h1>{sourceName(p, locale)}</h1>

          <p className="pdp-price">
            <Money value={selectedPrice} locale={locale} />
          </p>
          {p.warnings.length > 0 && (
            <p className="notice" role="note">
              {t("سعر «فاطمة» يحتاج مراجعة: بيانات الأساس ", "Fatma needs a price review: base data says ")}
              <Money value={330} locale={locale} />{t("، والسعر الظاهر والمقاسات ", ", while the displayed offer and sizes say ")}
              <Money value={350} locale={locale} />.
            </p>
          )}
          {!p.optionGroups.some(group => group.name === "Size") && <button className="text-link source-size-guide-link" onClick={() => setSizeGuide(true)}><Icon name="ruler" />{t("دليل المقاسات والقياس", "Sizes & measuring guide")}</button>}
          {p.optionGroups.length === 0 ? (

          <p className="notice">
              {t(
                "لم يظهر خيار مقاس منظّم في بيانات هذه القطعة.",
                "No structured size option appeared in this product’s captured data.",
              )}
            </p>
          ) : (
            p.optionGroups.map((g) => (
              <fieldset className={`source-options${g.name === "Size" ? " source-size-picker" : ""}`} key={g.id}>
                <legend>
                  <span>{g.name === "Size"
                    ? t("اختاري المقاس", "Choose your size")
                    : g.name}</span>
                  {g.name === "Size" && <button className="text-link source-size-guide-link" type="button" aria-haspopup="dialog" onClick={() => setSizeGuide(true)}><Icon name="ruler" />{t("اعرفي مقاسك", "Find my size")}</button>}
                </legend>
                <label className="piece-select"><span className="sr-only">{g.name==='Size'?t('المقاس','Size'):g.name}</span><select aria-label={g.name==='Size'?t('المقاس','Size'):g.name} name={g.id} value={selection[g.id]||''} aria-invalid={!!selectionError&&!selection[g.id]} onChange={e=>{setSelection({...selection,[g.id]:e.target.value});setSelectionError('');}}><option value="">{t('اختاري خيارًا','Choose an option')}</option>{g.values.map(value=><option key={value} value={value}>{sizeLabels[value]?`${sizeLabels[value]} · ${value}`:/تفصيل/.test(value)?t('تفصيل حسب المقاس','Made to measure'):value}</option>)}</select></label>
              </fieldset>
            ))
          )}
          {/تفصيل/.test(selection[sizeOption.id]||'')&&<CustomMeasurements/>}
          {p.addonGroups.map((g) => g.id === "sgsgty6umuqzu2p8" ? <details className="fabric-disclosure" key={g.id} open={coloursOpen} onToggle={e=>setColoursOpen(e.currentTarget.open)}><summary>{t('لون القماش','Fabric colour')}<span>{colour!==null?`№ ${colour}`:t('اختاري لونًا','Choose a colour')}</span></summary><FabricColourPicker value={colour} onSelect={code=>{setColour(code);setIndex(0);setFailed(false);setSelectionError('')}} /></details> : g.id===mayasaGroup ? <form key={g.id} className="named-colour-form" onSubmit={e=>e.preventDefault()}><fieldset className="named-colour-picker"><legend>{t('اختاري اللون','Choose colour')}</legend><div>{g.options.map(o=><label key={o.id} className="named-colour-card"><input type="radio" name={g.id} checked={selection[g.id]===o.name} onChange={()=>{setSelection({...selection,[g.id]:o.name});setIndex(0);setFailed(false);}}/><span className="named-colour-swatch" style={{background:o.name==='برغندي'?'#481526':'#11182e'}}/><span>{locale==='ar'?o.name:o.name==='برغندي'?'Burgundy':'Navy'}</span></label>)}</div></fieldset></form> : (
            <label className="piece-select piece-fabric-select" key={g.id}><span>{g.id==='de6panl7mutwshh8'?t('قماش الجزء الأسود','Black fabric choice'):g.name}{g.required?' *':''}</span><select name={g.id} value={selection[g.id]||''} aria-invalid={!!selectionError&&g.required&&!selection[g.id]} onChange={e=>{setSelection({...selection,[g.id]:e.target.value});setSelectionError('');}}><option value="">{t('اختاري خيارًا','Choose an option')}</option>{g.options.map(o=><option key={o.id} value={o.name}>{locale==='en'?({'مخمل':'Velvet','كوري ندى':'Korean nida'} as Record<string,string>)[o.name]||o.name:o.name}{o.price?` (+${o.price} AED)`:''}</option>)}</select></label>
          ))}
          {(Object.keys(selection).length>0 || colour!==null) && <div className="piece-selection-summary" role="status"><span>{t("اختياراتك", "Your selection")}</span><p>{Object.values(selection).map(v=>selectionLabel(v,locale)).join(" · ")}{colour!==null ? t(` · اللون رقم ${colour}`, ` · Colour ${colour}`) : ""}</p></div>}
          {selectionError&&<p role="alert" className="atelier-error">{selectionError}</p>}
<div className="source-purchase"><button type="button" className="button" disabled={!!p.soldOut} onClick={addToBag}>{p.soldOut?t('نفدت الكمية','Out of stock'):t("إضافة للسلة", "Add to bag")}</button>{added&&<button type="button" onClick={openBag} className="text-link">{t("عرض السلة", "View bag")}</button>}</div>
          <div className="pdp-details-stack">
          <details className="pdp-disclosure"><summary>{t("عن القطعة", "About the piece")}</summary><div>
          <p className="source-description" lang={locale} dir={locale==="ar"?"rtl":"ltr"}>
            {original.managed?p.description:translatedDescription(p.id,p.description,locale)}
          </p>
          </div></details>
<details className="pdp-disclosure"><summary>{t("المقاسات والقياس", "Sizing & fit")}</summary><div><p>{t("راجعي دليل القياس قبل اختيار المقاس. قياسات الكم والساعد غير المتوفرة لا نقدّرها من الصور.", "Check the measuring guide before choosing a size. Missing sleeve and forearm measurements are not estimated from photographs.")}</p><button className="text-link" onClick={()=>setSizeGuide(true)}>{t("فتح دليل المقاسات", "Open size guide")}</button></div></details>
<details className="pdp-disclosure"><summary>{t("التجهيز والتوصيل", "Preparation & delivery")}</summary><div><p>{t("موعد التجهيز يظهر عند الدفع. شروط التوصيل والاستبدال بانتظار اعتماد المتجر.","Preparation dates appear at checkout. Delivery and exchange terms await store approval.")}</p><Link className="text-link" href="/policies/">{t("السياسات", "Policies")}</Link></div></details>
</div>

        </div>
      </div>
      <section className="related-pieces" aria-labelledby="related-title"><div className="section-heading"><h2 id="related-title">{t('اكتشفي أيضًا','Explore more')}</h2><Link className="text-link" href="/collection/">{t('كل العبايات','All abayas')}</Link></div><p className="caption">{t('اختيارات أخرى من مجموعة أولّا.','More pieces from the Aulla collection.')}</p><RelatedPieces pieces={relatedPieces(original,sourceCatalog)}/></section>
      {sizeGuide && <SourceSizeGuide product={p} value={selection[sizeOption.id]} onSelect={size=>{setSelection(s=>({...s,[sizeOption.id]:size}));setSelectionError('');setSizeGuide(false);}} onClose={() => setSizeGuide(false)} />}
    </section>
  );
}
