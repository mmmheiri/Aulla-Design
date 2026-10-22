import {randomUUID} from 'node:crypto';
import {one,run,transaction} from './db.mjs';
import {fail,hash,token,testOnly} from './security.mjs';
import {isTailoredSize} from '../tailoring.mjs';
import {validateDelivery} from '../delivery.mjs';
import adjustments from '../catalogue-adjustments.json' with {type:'json'};
export const DAY=86400000;
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
export async function audit(tx,id,event,details={},actor='system'){await run(tx,'INSERT INTO audit_log VALUES(?,?,?,?,?,?)',[randomUUID(),id,actor,event,JSON.stringify(details),Date.now()]);}
export async function enqueue(tx,order,event,ownerOnly=false){
 const recipients=ownerOnly?['owner']:['owner','customer'];
 await run(tx,'INSERT OR IGNORE INTO notifications_outbox(id,order_id,event,payload,next_attempt) VALUES(?,?,?,?,?)',[randomUUID(),order.id,event,JSON.stringify({recipients,customer:order.customer_email,order:order.id,event,test:true}),Date.now()]);
}
export function validateMeasurements(input){if(!input||!['cm','inch'].includes(input.unit))fail('Choose one measurement unit');const allowed=['length','bust','sleeve','forearm'];if(!input.values||Object.keys(input.values).some(k=>!allowed.includes(k)))fail('Unsupported measurement field');for(const k of allowed){const v=input.values[k];if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>(input.unit==='cm'?300:120))fail('Invalid measurement: '+k);}return {unit:input.unit,values:input.values};}
export async function orderByToken(db,value){if(!/^[a-f0-9]{64}$/.test(value||''))fail('Order not found',404);const o=await one(db,'SELECT * FROM orders WHERE tracking_hash=?',[hash(value)]);if(!o)fail('Order not found',404);return o;}
export async function quote(tx,lines){
 if(!Array.isArray(lines)||!lines.length||lines.length>30)fail('Invalid bag');let total=0,maxLead=0;const items=[];
 for(const l of lines){if(!l||typeof l.id!=='string'||typeof l.size!=='string'||!integer(l.quantity,1,20))fail('Invalid item');const kind=l.kind||'ready',mode=l.sizeMode||'standard';if(!['ready','made_to_order'].includes(kind)||!['standard','custom'].includes(mode)||(kind==='ready'&&mode==='custom')||(isTailoredSize(l.size)&&(kind!=='made_to_order'||mode!=='custom')))fail('Invalid size mode');
 const entry=await one(tx,'SELECT payload,published FROM catalogue_entries WHERE product_id=?',[l.id]);if(entry&&(!Number(entry.published)||(!isTailoredSize(l.size)&&!JSON.parse(entry.payload).sizes.includes(l.size))))fail('Piece or size is no longer available',409);
 if(entry?JSON.parse(entry.payload).soldOut:adjustments[l.id]?.soldOut)fail('This piece is out of stock',409);
 const v=await one(tx,'SELECT v.*,p.name,p.choices FROM variants v JOIN products p ON p.id=v.product_id WHERE v.product_id=? AND v.size=? AND v.kind=?',[l.id,l.size,kind]);if(!v)fail('Variant unavailable');const groups=JSON.parse(String(v.choices)),options=l.options||{};if(typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!groups.some(g=>g.id===k)))fail('Invalid options');let extra=0;
 for(const g of groups){const value=options[g.id];if(g.required&&!value)fail('Required option missing');if(value!==undefined){const opt=g.options.find(x=>x.value===value);if(!opt)fail('Option unavailable');extra+=opt.price_fils;}}
 const price=Number(v.price_fils)+extra;if(!integer(price,200,10000000))fail('Invalid price');total+=price*l.quantity;maxLead=Math.max(maxLead,Number(v.lead_days));items.push({variant:v.id,name:v.name,quantity:l.quantity,price,kind,sizeMode:mode,size:l.size,options});
 }
 const readyDemand=new Map();for(const item of items.filter(i=>i.kind==='ready'))readyDemand.set(item.variant,(readyDemand.get(item.variant)||0)+item.quantity);
 for(const [variant,quantity] of readyDemand){const stock=await one(tx,'SELECT quantity-(SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE variant_id=? AND expires_at>?) AS available FROM stock WHERE variant_id=?',[variant,Date.now(),variant]);if(!stock||Number(stock.available)<quantity)fail('Stock unavailable. Choose made to order or reduce the quantity',409);}
 if(!integer(total,200,100000000))fail('Invalid total');return {items,total,shipAt:Date.now()+maxLead*DAY};
}
export async function createOrder(db,input){testOnly();
 if(!input||! /^[a-f0-9-]{36}$/.test(input.requestKey||'')||! /^[a-f0-9]{64}$/.test(input.trackingToken||''))fail('Invalid checkout key');
 if(typeof input.email!=='string'||input.email.length>160||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))fail('Invalid email');
 let address=input.address;if(input.delivery!==undefined){try{address=JSON.stringify(validateDelivery(input.delivery));}catch(e){fail(e.message);}}
 if(typeof address!=='string'||address.trim().length<5||address.length>2500)fail('Invalid test address');if(!['bank','ziina'].includes(input.method))fail('Invalid payment method');
 if(input.method==='bank'&&!bankDetails())fail('Bank details awaiting owner approval',503);
 const digest=hash(JSON.stringify(input));return transaction(db,async tx=>{
 const existing=await one(tx,'SELECT * FROM orders WHERE request_key=?',[input.requestKey]);if(existing){if(existing.request_hash!==digest)fail('Checkout key already used for different details',409);return publicOrder(existing);}
 // Lock products in a deterministic order before reading available stock.
 // SQLite's write transaction already supplies this exclusion locally.
 if(tx.dialect==='postgres'&&Array.isArray(input.lines))for(const id of [...new Set(input.lines.map(l=>l?.id).filter(id=>typeof id==='string'))].sort())await run(tx,'SELECT id FROM products WHERE id=? FOR UPDATE',[id]);
 const q=await quote(tx,input.lines),now=Date.now(),id=randomUUID(),expires=now+15*60000;const custom=q.items.some(i=>i.sizeMode==='custom');const measure=custom?validateMeasurements(input.measurements):null;
 await run(tx,'DELETE FROM reservations WHERE expires_at<=?',[now]);
 const demand=new Map();for(const i of q.items.filter(i=>i.kind==='ready'))demand.set(i.variant,(demand.get(i.variant)||0)+i.quantity);
 for(const [variant,qty] of demand){const s=await one(tx,'SELECT quantity-(SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE variant_id=?) AS available FROM stock WHERE variant_id=?',[variant,variant]);if(!s||Number(s.available)<qty)fail('Stock unavailable',409);}
 const o={id,customer_email:input.email,total_fils:q.total,payment_status:input.method==='bank'?'awaiting_transfer':'pending',fulfilment_status:'new',ship_at:q.shipAt};
 await run(tx,'INSERT INTO orders(id,request_key,request_hash,tracking_hash,customer_email,address,payment_method,payment_status,fulfilment_status,total_fils,created_at,ship_at,reservation_expires) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,input.requestKey,digest,hash(input.trackingToken),input.email,address,input.method,o.payment_status,'new',q.total,now,q.shipAt,expires]);
 for(const i of q.items)await run(tx,'INSERT INTO order_items VALUES(?,?,?,?,?,?,?,?,?,?)',[randomUUID(),id,i.variant,i.name,i.quantity,i.price,i.kind,i.sizeMode,i.size,JSON.stringify(i.options)]);
 for(const [variant,qty] of demand)await run(tx,'INSERT INTO reservations VALUES(?,?,?,?)',[id,variant,qty,expires]);
 if(measure){await run(tx,'INSERT INTO measurements(order_id,unit,snapshot) VALUES(?,?,?)',[id,measure.unit,JSON.stringify(measure.values)]);await enqueue(tx,o,'measurements_review',true);}
 if(input.method==='bank')await enqueue(tx,o,'bank_review',true);
 await enqueue(tx,o,'order_created');await audit(tx,id,'order_created',{method:input.method,total:q.total});return publicOrder(o);
 });
}
export function publicOrder(o){return {id:o.id,paymentStatus:o.payment_status,fulfilmentStatus:o.fulfilment_status,totalFils:Number(o.total_fils),currency:'AED',shipAt:Number(o.ship_at),singleShipment:true,test:true};}
export function bankDetails(){return process.env.BANK_DETAILS_APPROVED==='true'&&process.env.BANK_IBAN&&process.env.BANK_NAME&&process.env.BANK_BENEFICIARY?{iban:process.env.BANK_IBAN,name:process.env.BANK_NAME,beneficiary:process.env.BANK_BENEFICIARY}:null;}
// Runs inside the same write transaction as payment and outbox updates.
export async function settle(tx,o,actor='ziina'){
 if(o.payment_status==='paid')return;
 const demand=(await tx.execute({sql:"SELECT variant_id,SUM(quantity) AS qty FROM order_items WHERE order_id=? AND kind='ready' GROUP BY variant_id",args:[o.id]})).rows;
 const now=Date.now();let available=true;
 for(const i of demand){const s=await one(tx,'SELECT quantity-(SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE variant_id=? AND order_id<>? AND expires_at>?) AS available FROM stock WHERE variant_id=?',[i.variant_id,o.id,now,i.variant_id]);if(!s||Number(s.available)<Number(i.qty))available=false;}
 if(available)for(const i of demand)await run(tx,'UPDATE stock SET quantity=quantity-? WHERE variant_id=?',[Number(i.qty),i.variant_id]);
 await run(tx,"UPDATE orders SET payment_status='paid',received_fils=total_fils,stock_committed=?,fulfilment_status=? WHERE id=?",[available?1:0,available?o.fulfilment_status:'needs_action',o.id]);await run(tx,'DELETE FROM reservations WHERE order_id=?',[o.id]);
 await enqueue(tx,o,'paid');if(!available)await enqueue(tx,o,'paid_needs_action',true);await audit(tx,o.id,'paid',{stockCommitted:available},actor);
}
export async function confirmTransfer(db,id,amount,reference){if(!integer(amount,1,100000000)||! /^[a-zA-Z0-9_-]{6,100}$/.test(reference||''))fail('Invalid transfer amount or reference');return transaction(db,async tx=>{const o=await one(tx,'SELECT * FROM orders WHERE id=?',[id]);if(!o||o.payment_method!=='bank')fail('Bank order not found',404);const prior=await one(tx,'SELECT * FROM bank_transfers WHERE reference=?',[reference]);if(prior){if(prior.order_id!==id||Number(prior.amount_fils)!==amount)fail('Reference already used',409);return;}if(o.payment_status==='paid'||Number(o.received_fils)+amount>Number(o.total_fils))fail('Amount exceeds remaining balance',409);await run(tx,'INSERT INTO bank_transfers VALUES(?,?,?,?)',[reference,id,amount,Date.now()]);const received=Number(o.received_fils)+amount;
 if(received===Number(o.total_fils))await settle(tx,o,'owner');else {await run(tx,"UPDATE orders SET received_fils=?,payment_status='partially_paid' WHERE id=?",[received,id]);await enqueue(tx,o,'transfer_partial_'+received);}
 await audit(tx,id,'transfer_confirmed',{amount,reference},'owner');});}
const stages={new:['preparing'],preparing:['production','ready'],production:['ready'],ready:['shipped'],shipped:['delivered'],delivered:[],needs_action:[]};
export async function fulfil(db,id,next){return transaction(db,async tx=>{const o=await one(tx,'SELECT * FROM orders WHERE id=?',[id]);if(!o)fail('Order not found',404);if(o.fulfilment_status===next)return;if(o.payment_status!=='paid'||!stages[o.fulfilment_status]?.includes(next))fail('Invalid fulfilment transition',409);await run(tx,'UPDATE orders SET fulfilment_status=? WHERE id=?',[next,id]);if(['production','ready','shipped','delivered'].includes(next))await run(tx,'UPDATE measurements SET locked=1 WHERE order_id=?',[id]);await enqueue(tx,o,'fulfilment_'+next);await audit(tx,id,'fulfilment_changed',{from:o.fulfilment_status,to:next},'owner');});}
export async function updateMeasurements(db,id,input){const m=validateMeasurements(input);return transaction(db,async tx=>{const o=await one(tx,'SELECT * FROM orders WHERE id=?',[id]),old=await one(tx,'SELECT * FROM measurements WHERE order_id=?',[id]);if(!o||!old)fail('Measurements not found',404);if(old.locked||['production','ready','shipped','delivered'].includes(o.fulfilment_status))fail('Measurements are locked',409);if(old.unit!==m.unit)fail('Measurement unit cannot change',409);await run(tx,'UPDATE measurements SET snapshot=? WHERE order_id=?',[JSON.stringify(m.values),id]);await audit(tx,id,'measurements_updated',{},'owner');});}
export async function housekeeping(db){return transaction(db,async tx=>{await run(tx,'DELETE FROM reservations WHERE expires_at<=?',[Date.now()]);const overdue=(await tx.execute({sql:"SELECT * FROM orders WHERE payment_status='paid' AND fulfilment_status NOT IN ('shipped','delivered') AND ship_at<?",args:[Date.now()]})).rows;for(const o of overdue)await enqueue(tx,o,'overdue',true);});}
