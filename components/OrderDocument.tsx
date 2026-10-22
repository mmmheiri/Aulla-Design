"use client";
import {useEffect,useState} from 'react';
import {useShop} from './Shop';
import {Money} from './Money';
import {paymentLabels} from '../lib/admin-analytics';
import {commerce} from './ServerCommerce';
type DocumentData={id:string;createdAt:number;paymentStatus:string;totalFils:number;items:{id:string;name:string;size:string;quantity:number;unitFils:number;options:Record<string,string>}[]};

export function OrderDocument({token,orderId}:{token?:string;orderId?:string}){
 const {locale}=useShop(),ar=locale==='ar';
 const [value,setValue]=useState<DocumentData|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setValue(null);setError('');commerce(orderId?'admin/document':'document',orderId?{id:orderId}:{token}).then(v=>{if(active)setValue(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false};},[token,orderId,retry]);
 if(error)return <div role="alert"><p>{error}</p><button type="button" className="text-link" onClick={()=>setRetry(n=>n+1)}>{ar?'إعادة المحاولة':'Retry'}</button></div>;
 if(!value)return <p role="status">{ar?'جارٍ تحميل ملخص الطلب…':'Loading order document…'}</p>;
 return <section className="invoice-document server-order-document" aria-label={ar?'ملخص الطلب':'Order document'}>
  <header><div className="invoice-brand"><img src="/brand/aulla-ad-original-v3-symbol.svg" width="48" height="38" alt=""/><strong>AULLA DESIGN</strong></div><div><h2>{ar?'ملخص الطلب':'Order summary'}</h2><span>{ar?'مستند تجريبي · ليس فاتورة ضريبية':'Test document · Not a tax invoice'}</span></div></header>
  <p><bdi>{value.id}</bdi></p><p>{new Intl.DateTimeFormat(ar?'ar-AE':'en-GB',{dateStyle:'medium',timeZone:'Asia/Dubai'}).format(value.createdAt)}</p>
  <p>{ar?'حالة الدفع: ':'Payment: '}{paymentLabels[value.paymentStatus]?.[ar?0:1]||value.paymentStatus}</p>
  <div className="order-document-items">{value.items.map(item=><article key={item.id}><div><strong>{item.name}</strong><p>{item.size} · {ar?'الكمية':'Qty'} {item.quantity}</p><small>{Object.values(item.options).join(' · ')}</small><p>{ar?'سعر القطعة':'Unit price'} <Money fixed value={item.unitFils/100} locale={locale}/></p></div><Money fixed value={item.unitFils*item.quantity/100} locale={locale}/></article>)}</div>
  <p className="invoice-total"><strong>{ar?'الإجمالي':'Total'}</strong><Money fixed value={value.totalFils/100} locale={locale}/></p>
  <p className="caption">{ar?'الشحن التجريبي صفر. هذا المستند لا يؤكد استلام الدفع.':'Test shipping is zero. This document does not confirm receipt of payment.'}</p>
  <button type="button" className="button invoice-print" onClick={()=>window.print()}>{ar?'طباعة / حفظ PDF':'Print / Save PDF'}</button>
 </section>;
}
