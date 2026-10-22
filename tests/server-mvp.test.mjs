import test from 'node:test';
import assert from 'node:assert/strict';
import {testDatabase} from './database-fixture.mjs';
import {randomUUID,createHmac} from 'node:crypto';
import {migrate,one,run} from '../lib/server/db.mjs';
import {createOrder,orderByToken,publicOrder,confirmTransfer,fulfil,updateMeasurements,housekeeping} from '../lib/server/commerce.mjs';
import {payment,webhook,reconcileIntent} from '../lib/server/payments.mjs';
import {drainOutbox,sandboxEmail} from '../lib/server/notifications.mjs';
import {token,passwordHash,totp,login,requireAdmin,verifyWebhook,webhookIP,originCheck,testOnly} from '../lib/server/security.mjs';
import {CUSTOM_SIZE} from '../lib/tailoring.mjs';
import {orderDocument} from '../lib/server/order-document.mjs';

test('order document preserves issued prices and excludes private customer data',async t=>{
 const db=await fixture(t),request=input(),saved=await createOrder(db,request);
 await run(db,'UPDATE variants SET price_fils=99000');
 const document=await orderDocument(db,await orderByToken(db,request.trackingToken));
 assert.equal(document.id,saved.id);assert.equal(document.items[0].unitFils,20000);
 assert.equal(document.items.reduce((sum,i)=>sum+i.unitFils*i.quantity,0),document.totalFils);
 for(const key of ['customer_email','address','tracking_hash','request_hash','measurements'])assert.equal(key in document,false);
 await assert.rejects(orderByToken(db,'0'.repeat(64)),/not found/);
});

process.env.AULLA_MODE='test';process.env.ZIINA_WEBHOOK_SECRET='local-test-signing-secret';
process.env.BANK_DETAILS_APPROVED='true';process.env.BANK_IBAN='TEST-NOT-A-BANK-ACCOUNT';process.env.BANK_NAME='TEST';process.env.BANK_BENEFICIARY='TEST';
const input=(over={})=>({requestKey:randomUUID(),trackingToken:token(),email:'fictional@example.invalid',address:'Fictional test address',method:'ziina',lines:[{id:'p',size:'54',quantity:1,kind:'ready'}],...over});
async function fixture(t){const db=await testDatabase(t);await migrate(db);await run(db,"INSERT INTO products(id,name) VALUES('p','Test abaya')");await run(db,"INSERT INTO variants VALUES('v','p','54','ready',20000,3)");await run(db,"INSERT INTO variants VALUES('m','p','54','made_to_order',20000,21)");await run(db,"INSERT INTO stock VALUES('v',5)");return db;}

test('Gulf delivery is validated and stored privately with the order',async t=>{
 const db=await fixture(t),delivery={country:'AE',region:'DU',phoneCountry:'AE',phone:'501234567',firstName:'Test',lastName:'Guest',type:'apartment',city:'Dubai',area:'Test area',street:'Test street',building:'A1',notes:'Test only'};
 await assert.rejects(createOrder(db,input({delivery:{...delivery,region:'01'}})),/Gulf country/);
 const order=await createOrder(db,input({address:undefined,delivery})),stored=await one(db,'SELECT address FROM orders WHERE id=?',[order.id]);assert.equal(JSON.parse(stored.address).phone,'+971501234567');assert.equal(JSON.stringify(order).includes('501234567'),false);assert.equal(Number((await one(db,'SELECT COUNT(*) AS count FROM orders')).count),1);
});
test('custom-size variants reject ready/standard bypasses and require a measurement snapshot',async t=>{
 const db=await fixture(t);
 await run(db,"INSERT INTO variants VALUES('custom','p',?,'made_to_order',20000,21)",[CUSTOM_SIZE]);
 await run(db,"INSERT INTO variants VALUES('legacy-custom-ready','p',?,'ready',20000,3)",[CUSTOM_SIZE]);
 const lines=[{id:'p',size:CUSTOM_SIZE,quantity:1,kind:'made_to_order',sizeMode:'custom'}];
 await assert.rejects(createOrder(db,input({lines})),/measurement/i);
 await assert.rejects(createOrder(db,input({lines:[{...lines[0],kind:'ready',sizeMode:'standard'}]})),/size mode/);
 await assert.rejects(createOrder(db,input({lines:[{...lines[0],sizeMode:'standard'}]})),/size mode/);
 assert.equal((await one(db,'SELECT COUNT(*) n FROM orders')).n,0);
 const order=await createOrder(db,input({lines,measurements:{unit:'cm',values:{length:140,bust:100,sleeve:60,forearm:30}}}));
 const item=await one(db,'SELECT * FROM order_items WHERE order_id=?',[order.id]);
 assert.equal(item.kind,'made_to_order');assert.equal(item.size_mode,'custom');
 assert.equal((await one(db,'SELECT unit FROM measurements WHERE order_id=?',[order.id])).unit,'cm');
});
async function intent(db,i){const o=await createOrder(db,i);let response;await payment(db,i.trackingToken,async(path,method,data)=>{assert.equal(method,'POST');assert.equal(data.test,true);assert.ok(data.amount>=200);response={...data,id:'pi-'+o.id,status:'pending',redirect_url:'https://pay.ziina.com/test'};return response;});return {o,response,pi:await one(db,'SELECT * FROM payment_intents WHERE order_id=?',[o.id])};}
const signature=raw=>createHmac('sha256',process.env.ZIINA_WEBHOOK_SECRET).update(raw).digest('hex');
async function event(db,response){const raw=JSON.stringify({event:'payment_intent.status.updated',data:{id:response.id,status:'completed'}});return webhook(db,raw,signature(raw),'3.29.184.186',async()=>response);}

test('order and outbox are atomic; request retry is idempotent; conflicting retry rejected',async t=>{const db=await fixture(t),i=input();const a=await createOrder(db,i),b=await createOrder(db,i);assert.equal(a.id,b.id);assert.equal((await one(db,'SELECT COUNT(*) n FROM orders')).n,1);assert.equal((await one(db,'SELECT COUNT(*) n FROM notifications_outbox')).n,1);await assert.rejects(createOrder(db,{...i,email:'changed@example.invalid'}));});
test('price and option tampering cannot change authoritative total',async t=>{const db=await fixture(t);const o=await createOrder(db,input({lines:[{id:'p',size:'54',quantity:1,price:1,total:1}]}));assert.equal(o.totalFils,20000);await assert.rejects(createOrder(db,input({lines:[{id:'p',size:'54',quantity:1,options:{fake:'x'}}]})));});
test('reservations prevent overselling, expiry releases stock',async t=>{const db=await fixture(t);await run(db,"UPDATE stock SET quantity=1");const o=await createOrder(db,input());await assert.rejects(createOrder(db,input()),/Stock unavailable/);await run(db,'UPDATE reservations SET expires_at=0 WHERE order_id=?',[o.id]);await housekeeping(db);await createOrder(db,input());});
test('concurrent checkouts for the final ready piece reserve once',async t=>{const db=await fixture(t);await run(db,'UPDATE stock SET quantity=1');const results=await Promise.allSettled([createOrder(db,input()),createOrder(db,input())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await one(db,'SELECT SUM(quantity) AS n FROM reservations')).n,1);});
test('forged signatures and untrusted source rejected; forwarded headers alone are not trusted',()=>{assert.throws(()=>verifyWebhook('{}','0'.repeat(64),'3.29.184.186'));assert.throws(()=>verifyWebhook('{}',signature('{}'),'127.0.0.1'));assert.throws(()=>webhookIP(new Request('http://localhost',{headers:{'x-forwarded-for':'3.29.184.186'}})));assert.throws(()=>originCheck(new Request('http://localhost',{headers:{origin:'https://attacker.invalid'}})));});
test('duplicate completed and out-of-order pending webhooks settle once',async t=>{const db=await fixture(t),x=await intent(db,input());let calls=0;const done={...x.response,status:'completed'};await event(db,done);await event(db,done);await reconcileIntent(db,x.pi,async()=>{calls++;return {...x.response,status:'pending'};});assert.equal(calls,1);assert.equal((await one(db,'SELECT quantity FROM stock')).quantity,4);assert.equal((await one(db,"SELECT COUNT(*) n FROM notifications_outbox WHERE event='paid'")).n,1);assert.equal((await one(db,'SELECT status FROM payment_intents')).status,'completed');});
test('wrong amount/currency/intent/order/operation are rejected before payment',async t=>{const db=await fixture(t),x=await intent(db,input());for(const change of [{amount:1},{currency_code:'USD'},{id:'wrong'},{message:'other order'},{operation_id:'wrong'}])await assert.rejects(reconcileIntent(db,x.pi,async()=>({...x.response,status:'completed',...change})),/mismatch/);assert.equal((await one(db,'SELECT payment_status FROM orders')).payment_status,'pending');});
test('event claims paid but GET pending leaves order unpaid',async t=>{const db=await fixture(t),x=await intent(db,input());await event(db,x.response);assert.equal((await one(db,'SELECT payment_status FROM orders')).payment_status,'pending');});
test('late successful payment after stockout is paid and needs action',async t=>{const db=await fixture(t),x=await intent(db,input());await run(db,'DELETE FROM reservations');await run(db,'UPDATE stock SET quantity=0');await event(db,{...x.response,status:'completed'});const o=await one(db,'SELECT * FROM orders');assert.equal(o.payment_status,'paid');assert.equal(o.fulfilment_status,'needs_action');assert.equal(o.stock_committed,0);});
test('timeout retry uses same operation and never creates a second active intent',async t=>{const db=await fixture(t),i=input();await createOrder(db,i);let op;await assert.rejects(payment(db,i.trackingToken,async(p,m,d)=>{op=d.operation_id;throw new Error('timeout');}));await payment(db,i.trackingToken,async(p,m,d)=>{assert.equal(d.operation_id,op);return {...d,id:'retry-id',status:'pending',redirect_url:'https://pay.ziina.com/test'};});assert.equal((await one(db,'SELECT COUNT(*) n FROM payment_intents')).n,1);await payment(db,i.trackingToken,async()=>{const o=await orderByToken(db,i.trackingToken);return {id:'retry-id',operation_id:op,amount:o.total_fils,currency_code:'AED',message:'AULLA TEST '+o.id,status:'pending'};});});
test('provider down does not roll back order; retry is visible and deduplicated',async t=>{const db=await fixture(t);await createOrder(db,input());await drainOutbox(db,async()=>{throw new Error('offline');});assert.equal((await one(db,'SELECT COUNT(*) n FROM orders')).n,1);assert.equal((await one(db,'SELECT status FROM notifications_outbox')).status,'failed');await run(db,'UPDATE notifications_outbox SET next_attempt=0');let calls=0;await drainOutbox(db,async()=>{calls++;});await drainOutbox(db,async()=>{calls++;});assert.equal(calls,1);});
test('partial bank payment stays partial; duplicate reference and overpayment cannot pay twice',async t=>{const db=await fixture(t),o=await createOrder(db,input({method:'bank'}));await confirmTransfer(db,o.id,5000,'REF-0001');await confirmTransfer(db,o.id,5000,'REF-0001');assert.equal((await one(db,'SELECT payment_status FROM orders')).payment_status,'partially_paid');await assert.rejects(confirmTransfer(db,o.id,16000,'REF-0002'));await confirmTransfer(db,o.id,15000,'REF-0003');assert.equal((await one(db,'SELECT received_fils FROM orders')).received_fils,20000);assert.equal((await one(db,'SELECT quantity FROM stock')).quantity,4);});
test('tracking token is hashed; public tracking excludes private data',async t=>{const db=await fixture(t),i=input(),o=await createOrder(db,i);const stored=await orderByToken(db,i.trackingToken);assert.notEqual(stored.tracking_hash,i.trackingToken);const safe=JSON.stringify(publicOrder(stored));assert.ok(!safe.includes(i.email)&&!safe.includes(i.address)&&!safe.includes('measurements'));await assert.rejects(orderByToken(db,o.id));await assert.rejects(orderByToken(db,token()));});
test('admin requires password plus unreplayed TOTP and session; invalid stage rejected',async t=>{const db=await fixture(t);process.env.ADMIN_PASSWORD_HASH=passwordHash('local-test-password-long');process.env.ADMIN_TOTP_SECRET='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';await assert.rejects(requireAdmin(db,new Request('http://local')));await assert.rejects(login(db,'wrong',totp(process.env.ADMIN_TOTP_SECRET)));const code=totp(process.env.ADMIN_TOTP_SECRET),session=await login(db,'local-test-password-long',code);await assert.rejects(login(db,'local-test-password-long',code));await requireAdmin(db,new Request('http://local',{headers:{cookie:'aulla_admin='+session}}));const o=await createOrder(db,input());await assert.rejects(fulfil(db,o.id,'shipped'));});
test('mixed order waits for slowest piece; measurements unit and production lock enforced',async t=>{const db=await fixture(t),measurements={unit:'cm',values:{length:140,bust:100,sleeve:60,forearm:30}},i=input({method:'bank',measurements,lines:[{id:'p',size:'54',quantity:1},{id:'p',size:'54',quantity:1,kind:'made_to_order',sizeMode:'custom'}]});const now=Date.now(),o=await createOrder(db,i);assert.ok(o.shipAt>=now+21*86400000);assert.equal(o.singleShipment,true);await assert.rejects(updateMeasurements(db,o.id,{...measurements,unit:'inch'}));await confirmTransfer(db,o.id,40000,'MEASURE-REF');await fulfil(db,o.id,'preparing');await updateMeasurements(db,o.id,measurements);await fulfil(db,o.id,'production');await assert.rejects(updateMeasurements(db,o.id,measurements),/locked/);await assert.rejects(fulfil(db,o.id,'new'));});
test('unsupported measurement data rejected with no order persisted',async t=>{const db=await fixture(t);await assert.rejects(createOrder(db,input({lines:[{id:'p',size:'54',quantity:1,kind:'made_to_order',sizeMode:'custom'}],measurements:{unit:'cm',values:{weight:60}}})));assert.equal((await one(db,'SELECT COUNT(*) n FROM orders')).n,0);});
test('capture mail performs no network; live mode is rejected',async()=>{await sandboxEmail({},'test',async()=>{throw new Error('network must not happen');});process.env.AULLA_MODE='live';assert.throws(testOnly);process.env.AULLA_MODE='test';});
