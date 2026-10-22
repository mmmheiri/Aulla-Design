"use client";
import {useRef,useState} from "react";
import colourData from "../docs/source-import/fabric-colours.json";
import {useShop} from "./Shop";
import {tx} from "../lib/catalog";
import {Dialog} from "./Dialog";

export function FabricColourPicker({onSelect,value}: {onSelect?: (code:number|null)=>void; value?:number|null}) {
  const {locale}=useShop();
  const t=(ar:string,en:string)=>tx(locale,ar,en);
  const [chart,setChart]=useState(1);
  const [query,setQuery]=useState("");
  const grid=useRef<HTMLDivElement>(null);
  const [internal,updateSelected]=useState<number|null>(null);
  const selected=value===undefined?internal:value;
  const setSelected=(code:number|null)=>{updateSelected(code);onSelect?.(code);};
  const [reference,setReference]=useState<number|null>(null);
  const [failed,setFailed]=useState(false);
  const normalized=query.trim().replace(/[٠-٩]/g,n=>String("٠١٢٣٤٥٦٧٨٩".indexOf(n)));
  const samples=colourData.samples.filter(s=>normalized?String(s.code).includes(normalized):s.chart===chart);
  const chosen=colourData.samples.find(s=>s.code===selected);
  const referenceChart=normalized?((samples.find(s=>s.code===selected)||samples[0])?.chart??chart):chart;
  const changeChart=(page:number)=>{setChart(page);setQuery("");grid.current?.scrollTo({top:0});};
  return <section className="fabric-picker" aria-label={t("ألوان القماش المرقّمة","Numbered fabric colours")}>
    <div className="fabric-picker-heading"><h3>{t("اختاري اللون برقمه","Choose a colour by number")}</h3><span>{colourData.samples.length} {t("عينة مصوّرة","photographed samples")}</span></div>
    <p className="fabric-colour-note">{t("الألوان تقريبية وتختلف حسب الشاشة. اختاري رقمًا لمعاينته على العارضة.","Screen colours are approximate. Choose a number to preview it on the model.")}</p>
    <div className="fabric-tools"><label>{t("ابحثي برقم اللون","Find a colour number")}<input type="search" inputMode="numeric" value={query} onChange={e=>{setQuery(e.target.value);grid.current?.scrollTo({top:0});}} placeholder={t("مثال: ٦٢","e.g. 62")} /></label><button type="button" className="text-link" onClick={()=>{setReference(referenceChart);setFailed(false)}}>{t("اللوحة الأصلية","Original chart")}</button></div>
    <div className="fabric-pages" role="group" aria-label={t("صفحات الألوان","Colour pages")}>
      {[1,2,3].map(n=><button className="fabric-page-dot" type="button" key={n} aria-label={t(`صفحة الألوان ${n}`,`Colour page ${n}`)} aria-pressed={chart===n&&!normalized} onClick={()=>changeChart(n)}><span aria-hidden="true"/></button>)}
    </div>
    {samples.length?<div ref={grid} className="fabric-colour-grid">{samples.map(s=><button type="button" key={s.code} className="fabric-swatch" aria-pressed={selected===s.code} aria-label={t(`اختيار اللون رقم ${s.code}`,`Choose colour number ${s.code}`)} onClick={()=>setSelected(s.code)}><span className="fabric-swatch-colour" style={{backgroundColor:s.approxHex}} aria-hidden="true"/><span className="fabric-swatch-label"><bdi>№ {s.code}</bdi></span></button>)}</div>:<div className="fabric-colour-empty"><p>{t("لم نجد هذا الرقم في اللوحات المتاحة.","This number is not on the available charts.")}</p><button type="button" className="text-link" onClick={()=>setQuery("")}>{t("مسح البحث","Clear search")}</button></div>}
    <div className="fabric-selection" role="status"><span className="fabric-selection-chip" style={{backgroundColor:chosen?.approxHex||"transparent"}} aria-hidden="true"/><span>{selected===null?t("نفس اللون في صورة المنتج","As photographed on the product"):t(`اختيار المعاينة: اللون رقم ${selected}`,`Preview choice: colour number ${selected}`)}</span>{selected!==null&&<button type="button" className="text-link" onClick={()=>setSelected(null)}>{t("إلغاء الاختيار","Reset")}</button>}</div>
    {reference!==null&&<Dialog title={t(`لوحة الألوان الأصلية ${reference}`,`Original colour chart ${reference}`)} closeLabel={t("إغلاق","Close")} onClose={()=>setReference(null)} wide>
      {failed?<div role="alert"><p>{t("تعذّر تحميل اللوحة.","The chart could not load.")}</p><button type="button" className="button secondary" onClick={()=>setFailed(false)}>{t("إعادة المحاولة","Try again")}</button></div>:<img className="fabric-original-chart" src={colourData.charts[reference-1]} alt={t("أرقام المورد المكتوبة بجانب عينات القماش، للتحقق من الدرجة","Supplier's handwritten codes beside the fabric samples, for colour reference")} onError={()=>setFailed(true)} />}
      <a className="text-link" href={colourData.charts[reference-1]} target="_blank" rel="noreferrer">{t("فتح اللوحة بالحجم الأصلي","Open original-size chart")}</a>
    </Dialog>}
  </section>;
}
