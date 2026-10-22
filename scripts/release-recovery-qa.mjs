import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch(),base='http://127.0.0.1:8826',report=[];
try{
const p=await b.newPage({viewport:{width:390,height:844}});await p.addInitScript(()=>localStorage.setItem('aulla-preview-v1',JSON.stringify({locale:'ar',cart:[]})));
let release;const hold=new Promise(r=>release=r);await p.route('**/api/commerce/catalogue/',async r=>{await hold;await r.continue();});
await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.documentElement.lang==='ar',{},{timeout:1200});release();report.push('Arabic restored before delayed catalogue');await p.close();
for(const locale of ['en','ar']){
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await p.addInitScript(l=>localStorage.setItem('aulla-preview-v1',JSON.stringify({locale:l,cart:[{id:'AgSCVfoKPto5gvZLaIXS',size:'54',quantity:1,options:{}}]})),locale);
const attempts=[];const doc={id:'qa-only-mocked-order',totalFils:33000,shipAt:Date.now(),createdAt:Date.now(),test:true,paymentStatus:'pending',fulfilmentStatus:'new',items:[{id:'AgSCVfoKPto5gvZLaIXS',name:'Abaya Shahad',quantity:1,unitFils:33000,size:'54',options:{}}]};
await p.route('**/api/commerce/orders/',async r=>{attempts.push(r.request().postDataJSON());if(attempts.length===1)return r.fulfill({status:503,json:{error:'Connection interrupted — retry'}});return r.fulfill({json:doc});});
await p.route('**/api/commerce/document/',r=>r.fulfill({json:doc}));
await p.goto(base+'/checkout/');await p.locator('.delivery-fields').waitFor();
for(const [name,value]of Object.entries({firstName:'QA',phone:'501234567',email:'qa@example.invalid',city:'Dubai',area:'Test area',street:'Test street',building:'1'}))await p.locator('[name="'+name+'"]').fill(value);
await p.locator('[name=region]').selectOption({index:1});await p.locator('.checkout-paybar button').click();await p.locator('.atelier-error').filter({hasText:'Connection interrupted'}).waitFor();
assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('aulla-preview-v1')).cart.length),1);
await p.locator('.checkout-paybar button').click();await p.locator('.server-order-document').waitFor();assert.equal(attempts.length,2);assert.equal(attempts[0].requestKey,attempts[1].requestKey);
await p.waitForFunction(()=>JSON.parse(localStorage.getItem('aulla-preview-v1')).cart.length===0);assert.equal(await p.locator('h1').evaluate(e=>e===document.activeElement),true);
await p.goto(base+'/cart/');assert.equal(await p.locator('.bag-item').count(),0);report.push(locale+': failed request keeps cart; retry reuses key; success clears ordered lines and focuses confirmation');await p.close();
}console.log(JSON.stringify(report,null,2));}finally{await b.close();}
