"use client";
import {translatedDescription} from "../lib/product-copy";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import Link from "next/link";
import {useShop} from "./Shop";
import {tx} from "../lib/catalog";
import {sourceProducts,sourceName,sourcePrice} from "../lib/source-catalogue";
import {catalogueHero} from "../lib/catalogue-imagery";
import {Money} from "./Money";
import {Icon} from "./Icons";
const first=sourceProducts.find(p=>p.id==="knwEQbiwWA9RLQ6QirLB")!;
const pieces=[first,...sourceProducts.filter(p=>p!==first)];
const colours=["#4e5663","#a8cbe1","#57999f","#747680","#b0a490","#3e6293","#88746c","#a8c6cb","#527d91","#24344f","#b5a079"];
export function ArcHero(){
 const {locale}=useShop();const t=(ar:string,en:string)=>tx(locale,ar,en);
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false),[tabVisible,setTabVisible]=useState(true),[details,setDetails]=useState(false),[failed,setFailed]=useState<string[]>([]),[retry,setRetry]=useState(0);
 const root=useRef<HTMLElement>(null),panel=useRef<HTMLDivElement>(null),selected=useRef<HTMLButtonElement>(null),pointer=useRef<{x:number;y:number}|null>(null),dragged=useRef(false);
 const p=pieces[index],rtl=locale==="ar",playing=!paused&&!reduced&&visible&&tabVisible&&!details;
 const stop=()=>setPaused(true);
 const choose=(next:number)=>{stop();setDetails(false);setIndex((next+pieces.length)%pieces.length);};
 useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");const update=()=>{setReduced(media.matches);if(media.matches)setPaused(true);};update();media.addEventListener("change",update);const v=()=>setTabVisible(!document.hidden);v();document.addEventListener("visibilitychange",v);const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.25});if(root.current)observer.observe(root.current);return()=>{media.removeEventListener("change",update);document.removeEventListener("visibilitychange",v);observer.disconnect();};},[]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setIndex(n=>(n+1)%pieces.length),3500);return()=>clearInterval(timer);},[playing]);
 useEffect(()=>{if(details)panel.current?.focus();},[details]);
 const close=()=>{setDetails(false);selected.current?.focus();};
 return <section ref={root} className={`arc-hero ${playing?"is-playing":"is-paused"}`} aria-labelledby="arc-title" data-playing={playing} style={{"--arc-colour":colours[index]} as CSSProperties} onKeyDown={e=>{if(e.key==="Escape"&&details){e.preventDefault();close();}}}>
  <header className="arc-copy"><h1 id="arc-title">{t("مساحة لكِ.","Made for your pace.")}<br/>{t("ولكلّ تفاصيلك.","Room for every detail.")}</h1><p>{t("اختاري على مهل. كل قطعة، وتفاصيلها، أقرب إليكِ.","Take your time. Discover each piece, and the details that make it yours.")}</p></header>
  <div className="arc-stage" role="group" aria-roledescription={t("معرض دائري","carousel")} aria-label={t("اكتشفي العبايات","Explore the abayas")} tabIndex={0}
   onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();choose(index+(e.key==="ArrowRight"?1:-1)*(rtl?-1:1));}}}
   onPointerDown={e=>{stop();pointer.current={x:e.clientX,y:e.clientY};dragged.current=false;}}
   onPointerUp={e=>{if(pointer.current){const dx=e.clientX-pointer.current.x,dy=e.clientY-pointer.current.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){dragged.current=true;choose(index+(dx<0?1:-1)*(rtl?-1:1));}}pointer.current=null;}}
   onPointerCancel={()=>{pointer.current=null;}}
   onFocusCapture={stop}>
    <div className="arc-blob" aria-hidden="true"/>
    <svg className="arc-orbit" direction="ltr" viewBox="0 0 400 400" aria-hidden="true"><defs><path id="aulla-orbit-path" d="M200,200 m-175,0 a175,175 0 1,1 350,0 a175,175 0 1,1 -350,0"/></defs><text><textPath href="#aulla-orbit-path" textLength="1095">AULLA DESIGN · TAILORED WITH LOVE · AULLA DESIGN · TAILORED WITH LOVE · </textPath></text></svg>
    {["one","two"].map(n=><svg key={n} className={`arc-star star-${n}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2Q14 10 22 12Q14 14 12 22Q10 14 2 12Q10 10 12 2Z"/></svg>)}
    {[2,6].map((n,i)=><img key={n} className={`arc-float float-${i}`} src={catalogueHero(pieces[n].id)} alt="" aria-hidden="true" draggable={false}/>)}
    {pieces.map((piece,i)=>{let offset=(i-index+pieces.length)%pieces.length;if(offset>pieces.length/2)offset-=pieces.length;const distance=Math.abs(offset),hidden=distance>2;return <button key={piece.id} ref={i===index?selected:undefined} className={`arc-piece ${i===index?"is-selected":""}`} style={{"--offset":offset*(rtl?-1:1),"--drop":offset*offset,"--scale":1-distance*.16,zIndex:10-distance,opacity:hidden?0:1} as CSSProperties} tabIndex={hidden?-1:0} aria-hidden={hidden} aria-pressed={i===index} aria-label={`${sourceName(piece,locale)} · ${i===index?t("عرض التفاصيل","Show details"):t("اختيار القطعة","Select piece")}`} onClick={()=>{if(dragged.current){dragged.current=false;return;}stop();if(i!==index)choose(i);else setDetails(true);}}>
      {failed.includes(piece.id)?<span className="arc-image-error">{t("الصورة غير متاحة","Image unavailable")}</span>:<img key={retry} ref={node=>{if(node?.complete && node.naturalWidth===0)setFailed(v=>v.includes(piece.id)?v:[...v,piece.id]);}} src={catalogueHero(piece.id)} alt="" draggable={false} width="220" height="300" onError={()=>setFailed(v=>[...new Set([...v,piece.id])])}/>}</button>;})}
  </div>
  <div className="arc-product" aria-live={playing?"off":"polite"} aria-atomic="true"><span className="arc-counter"><bdi>{String(index+1).padStart(2,"0")} / {pieces.length}</bdi></span><h2>{sourceName(p,locale)}</h2><p>{t("المقاسات: ","Sizes: ")}{p.optionGroups.flatMap(g=>g.values).filter(v=>/^\d+$/.test(v)).join(" · ")||t("شاهدي خيارات القطعة","View piece options")}</p><Money value={sourcePrice(p)} locale={locale}/></div>
  <div className="arc-controls">
    <button className="arc-arrow" aria-label={t("القطعة السابقة","Previous piece")} onClick={()=>choose(index-1)}><Icon name="chevron" style={{transform:rtl?undefined:"rotate(180deg)"}}/></button>
    <button className="button" aria-expanded={details} aria-controls="arc-details" onClick={()=>{stop();setDetails(v=>!v);}}>{t("تفاصيل القطعة","Piece details")}</button>
    <button className="arc-arrow" aria-label={t("القطعة التالية","Next piece")} onClick={()=>choose(index+1)}><Icon name="chevron" style={{transform:rtl?"rotate(180deg)":undefined}}/></button>
  </div>
  {failed.includes(p.id)&&<button className="text-link" onClick={()=>{stop();setFailed(v=>v.filter(id=>id!==p.id));setRetry(v=>v+1);}}>{t("إعادة تحميل الصورة","Retry image")}</button>}
  {details&&<div id="arc-details" className="arc-details" ref={panel} tabIndex={-1}><button className="icon-button arc-close" onClick={close} aria-label={t("إغلاق التفاصيل","Close details")}><Icon name="close"/></button><h3>{sourceName(p,locale)}</h3><p dir={rtl?"rtl":"ltr"} lang={locale}>{translatedDescription(p.id,p.description,locale)}</p><Link className="text-link" href={`/collection/${p.id}/`}>{t("الصور والمقاسات والألوان","Photos, sizes & colours")}</Link></div>}
 </section>;
}




