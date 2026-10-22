"use client";
import {useEffect,useRef,useState} from 'react';
import {useShop,PageTitle} from './Shop';
import {OrderDocument} from './OrderDocument';
import {fulfilmentLabels} from '../lib/admin-analytics';
export async function commerce(path:string,data?:unknown){const r=await fetch('/api/commerce/'+path+'/',{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)}),cache:'no-store'});const value=await r.json();if(!r.ok)throw new Error(value.error||'Request failed');return value;}
export function OrderTracking(){
 const {locale}=useShop(),ar=locale==='ar';
 const [order,setOrder]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const active=useRef(true),pending=useRef(false);
 async function refresh(){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{const value=await commerce('track',{token:location.hash.slice(1)});if(active.current){setOrder(value);setRevision(n=>n+1);}}catch(e){if(active.current)setError((e as Error).message);}finally{pending.current=false;if(active.current)setBusy(false);}}
 useEffect(()=>{active.current=true;void refresh();return()=>{active.current=false;};},[]);
 return <section className="container checkout-page"><PageTitle title={ar?'متابعة الطلب التجريبي':'Track test order'}/>
 {order&&<><p>{ar?'التجهيز':'Fulfilment'}: {fulfilmentLabels[order.fulfilmentStatus]?.[ar?0:1]||order.fulfilmentStatus}</p><OrderDocument key={revision} token={location.hash.slice(1)}/></>}
 <p>{ar?'لا يعرض هذا الرابط العنوان أو القياسات.':'This link does not expose the address or measurements.'}</p>
 {error&&<p role="alert">{error}</p>}
 <button className="button" disabled={busy} onClick={refresh}>{busy?(ar?'جارٍ التحديث…':'Refreshing…'):(ar?'تحديث الحالة':'Refresh status')}</button>
 </section>;
}
