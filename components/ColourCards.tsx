"use client";
import {useState} from "react";
import data from "../docs/source-import/fabric-colours.json";
import {useShop} from "./Shop";
import {tx} from "../lib/catalog";
import {Dialog} from "./Dialog";
import {FabricColourPicker} from "./FabricColourPicker";

export function ColourCards({productId,onSelect}: {productId:string;onSelect?:(code:number|null)=>void}) {
  const {locale}=useShop();
  const [selected,updateSelected]=useState<number|null>(null);
  const setSelected=(code:number|null)=>{updateSelected(code);onSelect?.(code)};
  const [open,setOpen]=useState(false);
  const t=(ar:string,en:string)=>tx(locale,ar,en);
  const codes=[22,14,62,59];
  if(selected!==null&&!codes.includes(selected)) codes[3]=selected;
  return <div className="card-colour-picker">
    <div className="card-colour-heading"><span>{t("ألوان القماش","Fabric colours")}</span><button type="button" onClick={()=>setOpen(true)}>{t("كل الألوان","All colours")} · {data.samples.length}</button></div>
    <div className="card-colour-row">{codes.map(code=>{const s=data.samples.find(s=>s.code===code)!;return <button type="button" key={code} className="mini-colour-card" aria-label={t(`اختيار اللون رقم ${code}`,`Choose colour number ${code}`)} aria-pressed={selected===code} onClick={()=>setSelected(code)}><span style={{background:s.approxHex}}/><bdi>№ {code}</bdi></button>})}</div>
    {selected!==null&&<div className="card-colour-status" role="status"><span>{t(`اللون المختار: ${selected}`,`Selected colour: ${selected}`)}</span><a href={`/collection/${productId}/?colour=${selected}`}>{t("اختاري المقاس","Choose size")}</a></div>}
    {open&&<Dialog title={t("دليل ألوان القماش","Fabric colour library")} closeLabel={t("إغلاق","Close")} onClose={()=>setOpen(false)}><FabricColourPicker value={selected} onSelect={setSelected}/><button type="button" className="button" onClick={()=>setOpen(false)}>{t("تم الاختيار","Done")}</button></Dialog>}
  </div>;
}
