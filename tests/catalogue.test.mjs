import test from 'node:test';
import assert from 'node:assert/strict';
import {testDatabase} from './database-fixture.mjs';
import {migrate,one,run} from '../lib/server/db.mjs';
import {saveCatalogue,catalogueRecords,validateCatalogue} from '../lib/server/catalogue.mjs';
import {quote,createOrder,publicOrder,orderByToken} from '../lib/server/commerce.mjs';
import {token} from '../lib/server/security.mjs';
import {randomUUID} from 'node:crypto';
const form=(changes={})=>({revision:0,nameAr:'عباية اختبار',nameEn:'Test abaya',description:'Test description',priceFils:35500,sizes:['52','54'],images:['/source-images/test.jpg'],badges:['new'],published:false,readyLead:3,customLead:21,inventory:[{size:'52',quantity:2},{size:'54',quantity:5}],lowStockThreshold:3,...changes});
async function fixture(t){const db=await testDatabase(t);await migrate(db);return db;}
test('catalogue creates a private draft; publication updates public metadata, stock and audited price',async t=>{
 const db=await fixture(t),created=await saveCatalogue(db,form());
 assert.equal((await catalogueRecords(db)).some(p=>p.id===created.id),false);
 const record=(await catalogueRecords(db,true)).find(e=>e.product.id===created.id);
 assert.equal(record.form.inventory[0].quantity,2);
 await assert.rejects(quote(db,[{id:created.id,size:'52',quantity:1}]),/no longer available/);
 const saved=await saveCatalogue(db,form({id:created.id,revision:1,published:true,priceFils:36000}));
 assert.equal(saved.revision,2);
 const visible=(await catalogueRecords(db)).find(p=>p.id===created.id);
 assert.equal(visible.offers.price,360);assert.deepEqual(visible.catalogueBadges,['new']);
 assert.equal((await quote(db,[{id:created.id,size:'52',quantity:1}])).total,36000);
 assert.equal((await one(db,'SELECT COUNT(*) n FROM audit_log')).n,2);
});
test('stale catalogue edits roll back rather than overwrite a newer price or stock',async t=>{
 const db=await fixture(t),created=await saveCatalogue(db,form());
 await saveCatalogue(db,form({id:created.id,revision:1,priceFils:40000}));
 await assert.rejects(saveCatalogue(db,form({id:created.id,revision:1,priceFils:1000})),/changed/);
 assert.equal((await one(db,'SELECT price_fils FROM variants WHERE product_id=?',[created.id])).price_fils,40000);
 assert.equal((await one(db,'SELECT COUNT(*) n FROM audit_log')).n,2);
});
test('stock cannot undercut reservations; reservations expire; current stock is returned after a sale',async t=>{
 const db=await fixture(t),created=await saveCatalogue(db,form({published:true}));
 const variant=created.id+':52:ready';
 // Seed a reservation against a real test order, with no provider call.
 const order=await createOrder(db,{requestKey:randomUUID(),trackingToken:token(),email:'test@example.invalid',address:'Fictional address',method:'ziina',lines:[{id:created.id,size:'52',quantity:2}]});
 await assert.rejects(saveCatalogue(db,form({id:created.id,revision:1,published:true,inventory:[{size:'52',quantity:1},{size:'54',quantity:5}]})),/reservations/);
 let entry=(await catalogueRecords(db,true)).find(e=>e.product.id===created.id);
 assert.equal(entry.product.inventory[0].available,0);assert.equal(entry.revision,1);
 await run(db,'UPDATE reservations SET expires_at=0 WHERE order_id=?',[order.id]);
 await saveCatalogue(db,form({id:created.id,revision:1,published:true,inventory:[{size:'52',quantity:1},{size:'54',quantity:0}]}));
 entry=(await catalogueRecords(db,true)).find(e=>e.product.id===created.id);
 assert.equal(entry.form.inventory[0].quantity,1);assert.ok(entry.product.catalogueBadges.includes('low-stock'));
 assert.equal((await one(db,'SELECT quantity FROM stock WHERE variant_id=?',[variant])).quantity,1);
});
test('archived or removed sizes reject new orders while existing order snapshots survive',async t=>{
 const db=await fixture(t),created=await saveCatalogue(db,form({published:true})),tracking=token();
 const saved=await createOrder(db,{requestKey:randomUUID(),trackingToken:tracking,email:'test@example.invalid',address:'Fictional address',method:'ziina',lines:[{id:created.id,size:'54',quantity:1}]});
 await saveCatalogue(db,form({id:created.id,revision:1,published:true,sizes:['52'],inventory:[{size:'52',quantity:2}]}));
 await assert.rejects(quote(db,[{id:created.id,size:'54',quantity:1}]),/no longer available/);
 await saveCatalogue(db,form({id:created.id,revision:2,published:false}));
 await assert.rejects(quote(db,[{id:created.id,size:'52',quantity:1}]),/no longer available/);
 assert.equal(publicOrder(await orderByToken(db,tracking)).id,saved.id);
 assert.equal((await one(db,'SELECT price_fils FROM order_items WHERE order_id=?',[saved.id])).price_fils,35500);
});
test('catalogue validation rejects external images, traversal, fake badges, incomplete stock and missing uploads',async t=>{
 const db=await fixture(t);
 for(const changed of [{images:['https://example.com/a.jpg']},{images:['/media/../secret']},{priceFils:1},{badges:['fake-rating']},{sizes:['52','52']},{inventory:[{size:'52',quantity:-1}]},{inventory:[]}])assert.throws(()=>validateCatalogue(form(changed)));
 await assert.rejects(saveCatalogue(db,form({images:['/api/catalogue/images/'+randomUUID()+'/']})),/Image not found/);
 assert.equal((await one(db,'SELECT COUNT(*) n FROM catalogue_entries')).n,0);
});
