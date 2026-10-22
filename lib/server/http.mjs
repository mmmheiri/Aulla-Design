import {orderDocument} from './order-document.mjs';
import {pushConfig,subscribeOwner,unsubscribeOwner,drainOwnerPush} from './push.mjs';
import {database,run} from './db.mjs';
import {body,json,fail,originCheck,requireAdmin,login,hash,equal,rateLimit,testOnly,webhookIP} from './security.mjs';
import {createOrder,quote,orderByToken,publicOrder,bankDetails,confirmTransfer,fulfil,updateMeasurements,housekeeping,audit} from './commerce.mjs';
import {payment,webhook,reconcile} from './payments.mjs';
import {drainOutbox} from './notifications.mjs';
import {catalogueRecords,saveCatalogue} from './catalogue.mjs';
export const response=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...headers}});
export async function guarded(fn){try{testOnly();return await fn();}catch(e){return response({error:e.status?e.message:'Service unavailable; please retry'},e.status||503);}}
export async function handle(req,path){return guarded(async()=>{
 const db=database();if(req.method!=='GET')originCheck(req);
 if(req.method==='GET'&&path==='admin/push'){await requireAdmin(db,req);return response(pushConfig());}
 if(req.method==='GET'&&path==='catalogue')return response({products:await catalogueRecords(db)});
 if(req.method==='GET'&&path==='admin/catalogue'){await requireAdmin(db,req);return response({entries:await catalogueRecords(db,true)});}
 if(req.method==='GET'&&path==='config')return response({test:true,bank:bankDetails(),ziina:!!process.env.ZIINA_ACCESS_TOKEN&&!!process.env.ZIINA_ACCOUNT_ID,measurementsApproved:false});
 if(req.method==='GET'&&path==='admin'){
 await requireAdmin(db,req);
 const [orders,outbox,logs,count]=await Promise.all([
 db.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200'),
 db.execute('SELECT id,order_id,event,status,attempts,last_error FROM notifications_outbox ORDER BY next_attempt DESC LIMIT 200'),
 db.execute('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200'),
 db.execute('SELECT COUNT(*) AS count FROM orders')]);
 return response({orders:orders.rows,outbox:outbox.rows,audit:logs.rows,orderCount:Number(count.rows[0].count),asOf:Date.now()});}
 if(req.method!=='POST')fail('Not found',404);
 const input=json(await body(req));
 if(path==='login'){await rateLimit(db,'login-global',20);const value=await login(db,input.password,input.code);const secure=(process.env.AULLA_PUBLIC_ORIGIN||'').startsWith('https:');return response({ok:true},200,{'Set-Cookie':'aulla_admin='+value+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600'+(secure?'; Secure':'')});}
 if(path==='logout'){await requireAdmin(db,req);const value=req.headers.get('cookie')?.match(/aulla_admin=([a-f0-9]{64})/)?.[1];if(value)await run(db,'DELETE FROM admin_sessions WHERE token_hash=?',[hash(value)]);return response({ok:true},200,{'Set-Cookie':'aulla_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});}
 if(path==='quote'){await rateLimit(db,'quote-global',120);const q=await quote(db,input.lines);return response({totalFils:q.total,shipAt:q.shipAt,singleShipment:true,test:true});}
 if(path==='orders'){await rateLimit(db,'checkout-global',30);return response(await createOrder(db,input),201);}
 if(path==='document'){await rateLimit(db,'tracking-global',120);return response(await orderDocument(db,await orderByToken(db,input.token)));}
 if(path==='track'){await rateLimit(db,'tracking-global',120);return response(publicOrder(await orderByToken(db,input.token)));}
 if(path==='payment'){await rateLimit(db,'payment-global',30);return response(await payment(db,input.token));}
 if(path.startsWith('admin/')){
 await requireAdmin(db,req);
 if(path==='admin/document'){const result=await run(db,'SELECT * FROM orders WHERE id=?',[input.id]);if(!result.rows[0])fail('Order not found',404);return response(await orderDocument(db,result.rows[0]));}
 if(path==='admin/push/subscribe'){await rateLimit(db,'push-admin',30);return response(await subscribeOwner(db,input));}
 if(path==='admin/push/unsubscribe')return response(await unsubscribeOwner(db,input.endpoint));
 if(path==='admin/catalogue'){await rateLimit(db,'catalogue-admin',60);return response(await saveCatalogue(db,input));}
 if(path==='admin/fulfil')await fulfil(db,input.id,input.stage);
 else if(path==='admin/transfer')await confirmTransfer(db,input.id,input.amountFils,input.reference);
 else if(path==='admin/measurements')await updateMeasurements(db,input.id,input.measurements);
 else if(path==='admin/detail')return response({items:(await run(db,'SELECT * FROM order_items WHERE order_id=?',[input.id])).rows,measurements:(await run(db,'SELECT * FROM measurements WHERE order_id=?',[input.id])).rows});
 else if(path==='admin/retry-notification'){await run(db,"UPDATE notifications_outbox SET status='pending',attempts=0,next_attempt=? WHERE id=? AND status='failed'",[Date.now(),input.id]);await audit(db,null,'notification_retry',{id:input.id},'owner');}
 else fail('Not found',404);return response({ok:true});}
 fail('Not found',404);
 });}
export async function receiveWebhook(req){return guarded(async()=>{const ip=webhookIP(req);return response(await webhook(database(),await body(req),req.headers.get('x-hmac-signature'),ip));});}
export async function job(req){return guarded(async()=>{const key=process.env.JOBS_SECRET;if(!key||key.length<32||!equal(req.headers.get('authorization')||'','Bearer '+key))fail('Unauthorized',401);const db=database();await housekeeping(db);return response({checked:await reconcile(db),notifications:await drainOutbox(db),push:await drainOwnerPush(db)});});}
