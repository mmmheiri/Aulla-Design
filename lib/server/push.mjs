import webpush from 'web-push';
import {hash,fail,testOnly} from './security.mjs';
import {one,run} from './db.mjs';
export function pushConfig(){return {configured:!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT),publicKey:process.env.VAPID_PUBLIC_KEY||null};}
export function validateSubscription(value){
 let url;try{url=new URL(value.endpoint);}catch{fail('Invalid push subscription');}
 const host=url.hostname,allowed=host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host.endsWith('.push.apple.com')||host==='web.push.apple.com';
 if(!allowed||url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||value.endpoint.length>2048)fail('Unsupported push service');
 if(!/^[A-Za-z0-9_-]{87}$/.test(value.keys?.p256dh||'')||!/^[A-Za-z0-9_-]{22}$/.test(value.keys?.auth||''))fail('Invalid push keys');
 return {endpoint:url.href,keys:{p256dh:value.keys.p256dh,auth:value.keys.auth}};
}
export async function subscribeOwner(db,input){
 if(!pushConfig().configured)fail('Mobile notifications await server setup',503);
 const sub=validateSubscription(input),id=hash(sub.endpoint),existing=await one(db,'SELECT endpoint_hash FROM admin_push_subscriptions WHERE endpoint_hash=?',[id]);
 if(!existing&&Number((await one(db,'SELECT COUNT(*) AS count FROM admin_push_subscriptions')).count)>=10)fail('Remove an old notification device before adding another',409);
 await run(db,'INSERT INTO admin_push_subscriptions(endpoint_hash,subscription,created_at) VALUES(?,?,?) ON CONFLICT(endpoint_hash) DO UPDATE SET subscription=excluded.subscription',[id,JSON.stringify(sub),Date.now()]);return {ok:true};
}
export async function unsubscribeOwner(db,endpoint){if(typeof endpoint!=='string'||endpoint.length>2048)fail('Invalid endpoint');const id=hash(endpoint);await run(db,'DELETE FROM admin_push_deliveries WHERE endpoint_hash=?',[id]);await run(db,'DELETE FROM admin_push_subscriptions WHERE endpoint_hash=?',[id]);return {ok:true};}
export async function sendOwnerPush(sub,payload){
 testOnly();const {configured,publicKey}=pushConfig();if(!configured)fail('Push setup required',503);
 return webpush.sendNotification(sub,JSON.stringify(payload),{vapidDetails:{subject:process.env.VAPID_SUBJECT,publicKey,privateKey:process.env.VAPID_PRIVATE_KEY},TTL:3600,timeout:8000,urgency:'high'});
}
export async function drainOwnerPush(db,send=sendOwnerPush){
 if(!pushConfig().configured&&send===sendOwnerPush)return {sent:0,configured:false};
 const deadline=Date.now()+15000;const subs=(await run(db,'SELECT * FROM admin_push_subscriptions')).rows;let sent=0,failed=0;
 for(const device of subs){
  const events=(await run(db,"SELECT n.id,n.order_id FROM notifications_outbox n JOIN orders o ON o.id=n.order_id WHERE n.event='order_created' AND o.created_at>=? ORDER BY o.created_at DESC LIMIT 20",[device.created_at])).rows;
  for(const event of events){if(Date.now()>deadline)return {sent,failed,configured:true,deferred:true};const key=event.id+':'+device.endpoint_hash,now=Date.now();await run(db,"INSERT OR IGNORE INTO admin_push_deliveries(id,endpoint_hash,next_attempt) VALUES(?,?,?)",[key,device.endpoint_hash,now]);
   const lease=await run(db,"UPDATE admin_push_deliveries SET lease_until=?,attempts=attempts+1 WHERE id=? AND status<>'sent' AND attempts<8 AND next_attempt<=? AND lease_until<=?",[now+30000,key,now,now]);if(!lease.rowsAffected)continue;
   try{await send(validateSubscription(JSON.parse(device.subscription)),{title:'Aulla Design · New test order',body:'A new order is ready to review in your workspace.',tag:'aulla-order-'+event.order_id,url:'/admin/'});await run(db,"UPDATE admin_push_deliveries SET status='sent',lease_until=0 WHERE id=?",[key]);sent++;}
   catch(e){if([404,410].includes(e.statusCode)){await unsubscribeOwner(db,JSON.parse(device.subscription).endpoint);break;}await run(db,"UPDATE admin_push_deliveries SET status='failed',lease_until=0,next_attempt=? WHERE id=?",[now+60000,key]);failed++;}
  }
 }
 return {sent,failed,configured:true};
}
