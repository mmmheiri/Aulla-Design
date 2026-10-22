import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDelivery,deliveryText} from '../lib/delivery.mjs';
import countries from '../lib/gulf-countries.json' with {type:'json'};
import {validateSubscription,subscribeOwner,drainOwnerPush} from '../lib/server/push.mjs';
import {testDatabase} from './database-fixture.mjs';
import {migrate,run,one} from '../lib/server/db.mjs';
const valid={country:'AE',region:'DU',phoneCountry:'AE',phone:'0501234567',firstName:'Test',lastName:'Guest',type:'house',city:'Dubai',area:'Test district',street:'Test street',building:'12',notes:''};
test('all six Gulf countries validate their own regions and phone lengths',()=>{
 assert.deepEqual(countries.map(c=>c.regions.length),[7,13,6,4,8,11]);
 for(const phone of ['+971 50 123 4567','٠٥٠١٢٣٤٥٦٧','۰۰۹۷۱۵۰۱۲۳۴۵۶۷'])assert.equal(validateDelivery({...valid,phone}).phone,'+971501234567');
 for(const c of countries){const result=validateDelivery({...valid,country:c.code,phoneCountry:c.code,region:c.regions[0][0],phone:c.example});assert.equal(result.phone,'+'+c.dial+c.example);assert.match(deliveryText(JSON.stringify(result)),new RegExp(c.en));}
 assert.throws(()=>validateDelivery({...valid,country:'AE',region:'01'}));assert.throws(()=>validateDelivery({...valid,phone:'123'}));assert.throws(()=>validateDelivery({...valid,location:{lat:Infinity,lng:55}}));assert.throws(()=>validateDelivery({...valid,location:{lat:51,lng:0}}));assert.throws(()=>validateDelivery({...valid,firstName:''}));
});
test('push subscriptions reject private, foreign, credentialed and malformed endpoints',()=>{
 const keys={p256dh:'B'.repeat(87),auth:'A'.repeat(22)};
 for(const endpoint of ['http://fcm.googleapis.com/test','https://127.0.0.1/','https://fcm.googleapis.com.evil.invalid/','https://user@fcm.googleapis.com/test','https://fcm.googleapis.com:8080/test'])assert.throws(()=>validateSubscription({endpoint,keys}));
 assert.equal(validateSubscription({endpoint:'https://web.push.apple.com/test',keys}).endpoint,'https://web.push.apple.com/test');assert.throws(()=>validateSubscription({endpoint:'https://fcm.googleapis.com/test',keys:{}}));
});
test('owner push retries independently, removes expired subscriptions and carries no customer details',async t=>{
 const db=await testDatabase(t);await migrate(db);process.env.VAPID_PUBLIC_KEY='test';process.env.VAPID_PRIVATE_KEY='test';process.env.VAPID_SUBJECT='https://aulla.example';
 const sub={endpoint:'https://fcm.googleapis.com/test',keys:{p256dh:'B'.repeat(87),auth:'A'.repeat(22)}};await subscribeOwner(db,sub);
 await run(db,"INSERT INTO orders(id,request_key,request_hash,tracking_hash,customer_email,address,payment_method,payment_status,fulfilment_status,total_fils,created_at,ship_at,reservation_expires) VALUES('o','r','h','t','private@example.invalid','PRIVATE ADDRESS','ziina','pending','new',20000,?,?,?)",[Date.now()+10,Date.now(),Date.now()]);
 await run(db,"INSERT INTO notifications_outbox(id,order_id,event,payload,next_attempt) VALUES('event','o','order_created','{}',0)");
 assert.equal((await drainOwnerPush(db,async()=>{throw new Error('offline')})).failed,1);assert.equal((await one(db,'SELECT status FROM admin_push_deliveries')).status,'failed');
 await run(db,'UPDATE admin_push_deliveries SET next_attempt=0');let payload;assert.equal((await drainOwnerPush(db,async(_,p)=>{payload=p;})).sent,1);assert.equal(JSON.stringify(payload).includes('PRIVATE'),false);assert.equal(JSON.stringify(payload).includes('private@example'),false);assert.equal((await drainOwnerPush(db,async()=>{throw Error('duplicate')})).sent,0);
 await run(db,"DELETE FROM admin_push_deliveries");assert.equal((await drainOwnerPush(db,async()=>{throw {statusCode:410};})).sent,0);assert.equal(Number((await one(db,'SELECT COUNT(*) AS count FROM admin_push_subscriptions')).count),0);
});
