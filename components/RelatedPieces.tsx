"use client";
import {useEffect,useRef,useState} from 'react';
import {SourceCard} from './HomeShowcase';
import {PageDots} from './PageDots';
import {useSwipe} from './useSwipe';
import {useShop} from './Shop';
import type {SourceProduct} from '../lib/source-catalogue';
/** Snap pages use the container width so RTL and resized layouts remain balanced. */
export function RelatedPieces({pieces}:{pieces:SourceProduct[]}){
 const track=useRef<HTMLDivElement>(null),[index,setIndex]=useState(0);
 const [perPage,setPerPage]=useState(2);
 useEffect(()=>{const media=matchMedia('(min-width:761px)'),update=()=>{setPerPage(media.matches?4:2);setIndex(0);if(track.current)track.current.scrollLeft=0;};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 const pages=Array.from({length:Math.ceil(pieces.length/perPage)},(_,i)=>pieces.slice(i*perPage,(i+1)*perPage));
 const {locale}=useShop();
 const mouseSwipe=useSwipe(step=>{const el=track.current;if(el){const next=Math.max(0,Math.min(pages.length-1,index+step));el.scrollTo({left:next*el.clientWidth*(locale==='ar'?-1:1),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}},locale==='ar');
 return <><div className="related-track" ref={track} {...mouseSwipe} onPointerDown={e=>{if(e.pointerType==="mouse")mouseSwipe.onPointerDown(e)}} onScroll={()=>{const el=track.current;if(el)setIndex(Math.max(0,Math.min(pages.length-1,Math.round(Math.abs(el.scrollLeft)/el.clientWidth))));}}>{pages.map((page,i)=><div className="related-page" key={i} style={{gridTemplateColumns:`repeat(${perPage},minmax(0,1fr))`}}>{page.map(piece=><SourceCard key={piece.id} product={piece}/>)}</div>)}</div>{pages.length>1&&<PageDots count={pages.length} index={index} label="Related pieces" onChange={i=>{const el=track.current;if(el){const rtl=getComputedStyle(el).direction==='rtl';el.scrollTo({left:i*el.clientWidth*(rtl?-1:1),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}}/>}</>;
}

