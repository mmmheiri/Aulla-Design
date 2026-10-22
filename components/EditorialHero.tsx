"use client";

import {useEffect,useRef,useId, useState, type CSSProperties, type KeyboardEvent} from "react";
import Link from "next/link";
import {useShop} from "./Shop";
import {sourceName} from "../lib/source-catalogue";
import {catalogueHero} from "../lib/catalogue-imagery";
import {Icon} from "./Icons";
import {PageDots} from "./PageDots";
import {ClothImage} from './ClothImage';

function distance(position: number, selected: number,count:number) {
  return ((position - selected + count + Math.floor(count / 2)) % count) - Math.floor(count / 2);
}

/** Open, garment-first composition. The catalogue owns images and prices. */
export function EditorialHero() {
  const {locale,sourceCatalog:sourceProducts} = useShop();
  const orbitId=useId();
  const count=sourceProducts.length;
  const ar = locale === "ar";
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const root=useRef<HTMLElement>(null);
  const [paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true),[inView,setInView]=useState(false);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(media.matches);update();media.addEventListener('change',update);const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.15});if(root.current)observer.observe(root.current);return()=>{media.removeEventListener('change',update);observer.disconnect();};},[]);
  useEffect(()=>{if(reduced||paused||hovered||focused||!inView||count<2)return;const timer=setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%count);},6000);return()=>clearInterval(timer);},[reduced,paused,hovered,focused,inView,count,index]);
  const gesture = useRef<{x: number; y: number} | null>(null);
  const swiped = useRef(false);
  const selected=count?index%count:0;
  const p = sourceProducts[selected];
  if(!p)return <section className="aulla-hero"><div className="aulla-hero-copy"><h1>{ar?'مجموعة أولّا':'The Aulla collection'}</h1><p>{ar?'القطع قيد التجهيز. عودي قريبًا.':'The collection is being prepared. Check back soon.'}</p></div></section>;
  const move = (step: number) => setIndex(i => (i + step + count) % count);
  const focusSelected=()=>requestAnimationFrame(()=>root.current?.querySelector<HTMLButtonElement>('.aulla-hero-controls button[aria-current="true"]')?.focus({preventScroll:true}));
  function onKeyDown(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      move((e.key === "ArrowRight" ? 1 : -1) * (ar ? -1 : 1));
      focusSelected();
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setIndex(e.key === "Home" ? 0 : count - 1);
      focusSelected();
    }
  }
  return <section ref={root} className="aulla-hero" data-paused={paused||hovered||focused||!inView} aria-labelledby="aulla-hero-title" onPointerEnter={e=>{if(e.pointerType==='mouse')setHovered(true)}} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
    <div className="aulla-hero-copy">
      <h1 id="aulla-hero-title">{ar ? <>عبايات<br/>تشبهكِ.</> : <>Abayas,<br/>your own way.</>}</h1>
      <p>{ar ? "قطعتكِ، لونكِ، والتفاصيل التي تختارينها." : "Your piece, your colour, your kind of detail."}</p>
      <Link className="aulla-hero-collection" href="/collection/">{ar ? "تسوّقي المجموعة" : "Explore the collection"}<Icon name="chevron"/></Link>
    </div>

    <div className="aulla-hero-gallery" role="region" aria-roledescription={ar ? "معرض قطع" : "carousel"} aria-label={ar ? "قطع أولّا" : "Aulla pieces"} onKeyDown={onKeyDown}>
      <div className="aulla-hero-stage"
        onPointerDown={e => {if (!e.isPrimary || e.button !== 0) return; gesture.current = {x:e.clientX, y:e.clientY}; swiped.current = false;}}
        onPointerMove={e => {
          if (!gesture.current) return;
          const dx = e.clientX - gesture.current.x, dy = e.clientY - gesture.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            move((dx < 0 ? 1 : -1) * (ar ? -1 : 1)); gesture.current = null; swiped.current = true;
          }
        }}
        onPointerUp={() => {gesture.current = null;}}
        onPointerCancel={() => {gesture.current = null;}}
        onPointerLeave={() => {gesture.current = null;}}
        onClickCapture={e => {if (swiped.current) {e.preventDefault(); e.stopPropagation(); swiped.current = false;}}}>
        <svg className="aulla-hero-orbit" viewBox="0 0 400 400" aria-hidden="true" direction="ltr"><circle cx="200" cy="200" r="152" fill="#e8e4dc"/><defs><path id={orbitId} d="M200 36a164 164 0 1 1 0 328a164 164 0 1 1 0-328"/></defs><g className="aulla-orbit-type"><text direction="ltr" unicodeBidi="bidi-override"><textPath href={'#'+orbitId} textLength="1027">AULLA DESIGN · TAILORED WITH LOVE · </textPath></text></g></svg>
        {sourceProducts.map((piece, position) => {
          const offset = distance(position, selected,count);
          const active = offset === 0;
          const visible = Math.abs(offset) <= 1;
          const title = sourceName(piece, locale);
          return <div key={piece.id} className="aulla-hero-piece" data-active={active} data-visible={visible} aria-hidden={!visible} inert={!visible}
            style={{"--offset": offset * (ar ? -1 : 1), "--drop": `${offset * offset * 22}px`, "--scale": active ? 1 : .72, "--caption-top":active?'calc(100% + 6px)':'calc(93% + 6px)', zIndex: active ? 3 : 2 - Math.abs(offset)} as CSSProperties}>
            {Math.abs(offset) <= 2 && <>
              {failed[piece.id] ? <div className="aulla-hero-error"><p>{ar ? "تعذّر تحميل الصورة" : "Image unavailable"}</p><button type="button" onClick={() => setFailed(f => ({...f, [piece.id]:false}))}>{ar ? "إعادة المحاولة" : "Try again"}</button></div> :
                <ClothImage src={piece.managed?piece.images[0]?.local||catalogueHero(piece.id):catalogueHero(piece.id)} alt={title} active={visible&&inView&&!reduced&&!piece.managed} transitionKey={selected} direction={offset<0?-1:1} priority={position===0} onError={()=>setFailed(f=>({...f,[piece.id]:true}))}/>
              }
              {active ? <Link className="aulla-hero-image-link" href={`/collection/${piece.id}/`} draggable={false} prefetch={false} aria-label={ar ? `عرض ${title}` : `View ${title}`}/> :
                <button className="aulla-hero-select" type="button" onClick={e => {setIndex(position); if (e.detail === 0) focusSelected();}} aria-label={ar ? `اختيار ${title}` : `Select ${title}`} tabIndex={visible ? 0 : -1}/>
              }
            </>}
            {visible&&<span className="aulla-hero-piece-name">{title}</span>}
          </div>;
        })}
      </div>
      <div className="aulla-hero-controls"><PageDots count={count} index={selected} label={ar?"قطع أولّا":"Aulla pieces"} onChange={setIndex}/>{!reduced&&<button className="hero-autoplay" type="button" aria-pressed={paused} aria-label={paused?(ar?'تشغيل العرض الآلي':'Play automatic showcase'):(ar?'إيقاف العرض الآلي':'Pause automatic showcase')} onClick={()=>setPaused(!paused)}><Icon name={paused?'play':'pause'}/></button>}</div>
    </div>

  </section>;
}
