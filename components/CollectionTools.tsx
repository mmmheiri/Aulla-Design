"use client";
import {useId,useRef,useState} from 'react';
import {useShop} from './Shop';
import {tx} from '../lib/catalog';
import {Icon} from './Icons';

type Props={query:string;size:string;sort:string;sizes:string[];count:number;shown?:number;onlySaved?:boolean;groupActive?:boolean;onQuery:(value:string)=>void;onSize:(value:string)=>void;onSort:(value:string)=>void;onSaved?:()=>void;onReset:()=>void};
/** One compact finder for the landing page and full collection. */
export function CollectionTools(p:Props){
 const {locale}=useShop(),t=(a:string,e:string)=>tx(locale,a,e),[open,setOpen]=useState(false);
 const panelId=useId();
 const trigger=useRef<HTMLButtonElement>(null),search=useRef<HTMLInputElement>(null);
 const close=()=>{setOpen(false);trigger.current?.focus({preventScroll:true});};
 const active=Number(!!p.size)+Number(p.sort!=='source')+Number(!!p.onlySaved)+Number(!!p.groupActive);
 return <div className="collection-tools" onKeyDown={event=>{if(open&&event.key==='Escape'){event.preventDefault();close();}}}>
  <div className="collection-tools-row">
   <label className="collection-search"><Icon name="search"/><span className="sr-only">{t('ابحثي في المجموعة','Search the collection')}</span><input ref={search} type="search" value={p.query} onChange={e=>p.onQuery(e.target.value)} placeholder={t('ابحثي باسم العباية','Search abayas')} autoComplete="off"/></label>
   <button ref={trigger} type="button" className="collection-refine" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(!open)}><Icon name="sliders"/><span>{t('فلترة وترتيب','Filter & sort')}{active>0&&<bdi className="collection-filter-count">{active}</bdi>}</span><Icon name="chevron"/></button>
  </div>
    <div className="collection-refine-panel" id={panelId} hidden={!open}>
     <label>{t('المقاس','Size')}<select aria-label={t('المقاس','Size')} value={p.size} onChange={e=>p.onSize(e.target.value)}><option value="">{t('كل المقاسات','All sizes')}</option>{p.sizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label>
     <label>{t('الترتيب','Sort')}<select aria-label={t('الترتيب','Sort')} value={p.sort} onChange={e=>p.onSort(e.target.value)}><option value="source">{t('ترتيب المجموعة','Collection order')}</option><option value="low">{t('السعر: الأقل أولًا','Price: low first')}</option><option value="high">{t('السعر: الأعلى أولًا','Price: high first')}</option></select></label>
     {p.onSaved&&<button type="button" className="collection-saved" aria-pressed={!!p.onlySaved} onClick={p.onSaved}><Icon name="heart"/>{t('المفضلة فقط','Saved pieces only')}</button>}
     <button type="button" className="text-link collection-refine-done" onClick={close}>{t('عرض النتائج','Show results')}<Icon name="check"/></button>
    </div>
  <div className="collection-results"><p role="status" aria-live="polite" aria-atomic="true">{p.shown!==undefined&&p.shown<p.count?`${p.shown} ${t('من','of')} `:''}<bdi>{p.count}</bdi> {t('قطعة',p.count===1?'piece':'pieces')}</p>{(p.query||active>0)&&<button type="button" className="text-link" onClick={()=>{p.onReset();search.current?.focus({preventScroll:true});}}>{t('مسح الفلاتر','Clear filters')}<Icon name="close"/></button>}</div>
 </div>;
}
