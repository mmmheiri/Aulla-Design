import {randomUUID} from 'node:crypto';
import {one,run,transaction} from './db.mjs';
import {fail,hash,json,testOnly,verifyWebhook} from './security.mjs';
import {audit,orderByToken,settle} from './commerce.mjs';
const base='https://api-v2.ziina.com/api';
export async function ziina(path,method='GET',data,fetcher=fetch){testOnly();if(!process.env.ZIINA_ACCESS_TOKEN||!process.env.ZIINA_ACCOUNT_ID)fail('Ziina test credentials not configured',503);
 const res=await fetcher(base+path,{method,headers:{Authorization:'Bearer '+process.env.ZIINA_ACCESS_TOKEN,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!res.ok)fail('Ziina unavailable ('+res.status+')',502);return res.json();
}
function match(intent,order,provider){
 if(!provider||provider.id!==intent.provider_id||provider.operation_id!==intent.operation_id||provider.amount!==Number(order.total_fils)||provider.currency_code!=='AED'||provider.message!=='AULLA TEST '+order.id||(process.env.ZIINA_ACCOUNT_ID&&provider.account_id!==process.env.ZIINA_ACCOUNT_ID)||provider.test===false)fail('Payment verification mismatch',409);
}
export async function payment(db,tracking,api=ziina){testOnly();const o=await orderByToken(db,tracking);if(o.payment_method!=='ziina'||o.payment_status==='paid')fail('Payment not available',409);
 let intent=await transaction(db,async tx=>{let pi=await one(tx,'SELECT * FROM payment_intents WHERE order_id=? AND active=1',[o.id]);if(!pi){if(Number(o.reservation_expires)<Date.now())fail('Reservation expired; start a new order',409);const op=randomUUID();await run(tx,"INSERT INTO payment_intents(operation_id,order_id,status,created_at) VALUES(?,?,'creating',?)",[op,o.id,Date.now()]);pi=await one(tx,'SELECT * FROM payment_intents WHERE operation_id=?',[op]);}return pi;});
 if(intent.provider_id){await reconcileIntent(db,intent,api);const latest=await one(db,'SELECT * FROM payment_intents WHERE operation_id=?',[intent.operation_id]);if(['failed','canceled','completed'].includes(latest.status))fail('Payment is terminal; check order status',409);return {redirectUrl:latest.redirect_url,test:true};}
 // Persisted operation_id survives a timeout/crash. Retry only the SAME operation.
 const origin=process.env.AULLA_PUBLIC_ORIGIN||'http://127.0.0.1:8826';const returnUrl=origin+'/track/#'+tracking;
 const data={operation_id:intent.operation_id,amount:Number(o.total_fils),currency_code:'AED',message:'AULLA TEST '+o.id,success_url:returnUrl,cancel_url:returnUrl,failure_url:returnUrl,test:true,allow_tips:false,expiry:new Date(Number(o.reservation_expires)).toISOString()};
 let response;try{response=await api('/payment_intent','POST',data);}catch(e){await run(db,'UPDATE payment_intents SET last_error=? WHERE operation_id=?',['creation_unknown_retry_same_operation',intent.operation_id]);throw e;}
 const candidate={...intent,provider_id:response.id};match(candidate,o,response);
 const url=new URL(response.redirect_url);if(url.protocol!=='https:'||!(url.hostname==='ziina.com'||url.hostname.endsWith('.ziina.com')))fail('Invalid checkout URL',502);
 await transaction(db,async tx=>{const prior=await one(tx,'SELECT provider_id FROM payment_intents WHERE operation_id=?',[intent.operation_id]);if(prior.provider_id&&prior.provider_id!==response.id)fail('Provider id changed',409);await run(tx,'UPDATE payment_intents SET provider_id=?,redirect_url=?,last_error=NULL WHERE operation_id=?',[response.id,url.toString(),intent.operation_id]);await audit(tx,o.id,'test_intent_created',{intent:response.id});});
 return {redirectUrl:url.toString(),test:true};
}
const rank={creating:0,requires_payment_instrument:1,requires_user_action:2,pending:3,failed:4,canceled:4,completed:5};
export async function reconcileIntent(db,intent,api=ziina,eventHash=null){
 const provider=await api('/payment_intent/'+encodeURIComponent(intent.provider_id));
 return transaction(db,async tx=>{const current=await one(tx,'SELECT * FROM payment_intents WHERE operation_id=?',[intent.operation_id]);const o=await one(tx,'SELECT * FROM orders WHERE id=?',[current.order_id]);match(current,o,provider);if(!(provider.status in rank))fail('Unknown payment status',409);
 if(provider.status==='completed')await settle(tx,o);
 if(provider.status===current.status||rank[provider.status]>(rank[current.status]??0))await run(tx,'UPDATE payment_intents SET status=?,last_checked=?,last_error=NULL WHERE operation_id=?',[provider.status,Date.now(),current.operation_id]);
 if(eventHash)await run(tx,'INSERT OR IGNORE INTO webhook_events VALUES(?,?,?)',[eventHash,current.provider_id,Date.now()]);return {accepted:true};});
}
export async function webhook(db,raw,signature,ip,api=ziina){testOnly();verifyWebhook(raw,signature,ip);const e=json(raw);if(e.event!=='payment_intent.status.updated')return {ignored:true};const id=e.data?.id;if(typeof id!=='string')fail('Invalid webhook');const pi=await one(db,'SELECT * FROM payment_intents WHERE provider_id=?',[id]);if(!pi)fail('Intent not yet registered; retry later',503);
 // A repeat is still confirmed through GET; the transaction makes effects exactly-once.
 return reconcileIntent(db,pi,api,hash(raw));
}
export async function reconcile(db,api=ziina){const rows=(await db.execute("SELECT * FROM payment_intents WHERE provider_id IS NOT NULL AND status<>'completed' ORDER BY last_checked LIMIT 100")).rows;for(const pi of rows){try{await reconcileIntent(db,pi,api);}catch{await run(db,'UPDATE payment_intents SET last_checked=?,last_error=? WHERE operation_id=?',[Date.now(),'verification_failed',pi.operation_id]);}}return rows.length;}
