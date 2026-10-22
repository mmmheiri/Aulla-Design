"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {useShop} from './Shop';
import {PageDots} from './PageDots';
import {Icon} from './Icons';
const items=[
 {src:'/packaging/aulla-thank-you-atelier-v2.webp',ar:'رسالة من أولّا',en:'A note from Aulla',altAr:'بطاقة شكر أولّا بدون اسم شخصي',altEn:'Aulla thank-you note without a personal name'},
 {src:'/packaging/aulla-tag-atelier-v2.webp',ar:'التاق المعلّق',en:'The hanging tag',altAr:'تاق أولّا على قماش كحلي',altEn:'Aulla hanging tag on navy fabric'},
 {src:'/packaging/aulla-cover-atelier-v2.webp',ar:'كيس حفظ العباية',en:'The garment bag',altAr:'كيس حفظ عباية أولّا بزواية جانبية',altEn:'Aulla garment bag photographed at an angle'},
 {src:'/packaging/aulla-neck-sewing-v2.webp',ar:'ليبل الرقبة المنسوج',en:'The woven neck label',altAr:'خياطة ليبل أولّا المنسوج',altEn:'The Aulla woven neck label being sewn'},
];
export function PackagingStory(){
 const {locale}=useShop(),ar=locale==='ar',t=(a:string,e:string)=>ar?a:e;
 const [index,setIndex]=useState(0),dragged=useRef(false),reduced=useReducedMotion();const next=()=>setIndex(i=>(i+1)%items.length);
 const deckArea=useRef<HTMLDivElement>(null),[inView,setInView]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.1});if(deckArea.current)observer.observe(deckArea.current);return()=>observer.disconnect();},[]);
 return <section className="packaging-story packaging-shuffle container" aria-labelledby="packaging-title">
  <div className="packaging-copy"><h2 id="packaging-title">{t('تفاصيل تحمل اسم أولّا.','The finishing touches of Aulla.')}</h2><p>{t('من أول غرزة إلى آخر تفصيلة.','From the first stitch to the finishing touch.')}</p><button type="button" className="text-link packaging-shuffle-action" onClick={next}>{t('اكتشفي التفاصيل','Explore the details')}<Icon name="arrow"/></button></div>
  <div className="packaging-deck-area" ref={deckArea} data-in-view={inView}><div className="packaging-deck" onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setIndex(n=>(n+(e.key==='ArrowLeft'?1:-1)*(ar?-1:1)+items.length)%items.length);}}}>
   {items.map((item,i)=>{const depth=(i-index+items.length)%items.length;return <motion.figure key={item.src} className="packaging-layer" data-depth={depth} onClick={()=>{if(depth!==0&&!dragged.current)setIndex(i)}} initial={false} animate={{x:depth===1?-12:depth===2?16:depth===3?-19:0,y:depth*-8,rotate:depth===1?-5:depth===2?6:depth===3?-8:0,scale:1-depth*.025,opacity:1-depth*.12}} transition={reduced?{duration:0}:{type:'spring',stiffness:300,damping:28}} drag={depth===0?'x':false} dragListener={depth===0} dragConstraints={{left:0,right:0}} dragElastic={.16} dragMomentum={false} onDragStart={()=>{dragged.current=true;}} onDragEnd={(_,info)=>{if(Math.abs(info.offset.x)>40||Math.abs(info.velocity.x)>350)setIndex(n=>(n+(info.offset.x<0?1:-1)*(ar?-1:1)+items.length)%items.length);setTimeout(()=>{dragged.current=false},0);}} style={{zIndex:items.length-depth,touchAction:'pan-y'} as CSSProperties}><img src={item.src} alt={depth===0?(ar?item.altAr:item.altEn):''} width={i===3?1200:800} height={i===3?800:1000} loading="lazy" draggable="false"/><figcaption aria-hidden={depth!==0}>{ar?item.ar:item.en}</figcaption>{depth!==0&&<button type="button" className="packaging-back-select" aria-label={t('عرض ','Show ')+(ar?item.ar:item.en)} onClick={()=>{if(!dragged.current)setIndex(i)}}/>}</motion.figure>;})}
  </div><PageDots count={items.length} index={index} onChange={setIndex} label={t('تفاصيل هوية أولّا','Aulla finishing details')}/><p className="caption packaging-concept-note">{t('هوية التغليف','Packaging identity')}</p></div>
 </section>;
}
