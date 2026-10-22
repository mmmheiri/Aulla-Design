import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch();
try{for(const locale of ['en','ar']){
const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await p.addInitScript(l=>!localStorage.getItem('aulla-preview-v1')&&localStorage.setItem('aulla-preview-v1',JSON.stringify({locale:l,cart:[],saved:[]})),locale);
await p.goto('http://127.0.0.1:8826/collection/');await p.locator('.source-card').first().waitFor();
const n=await p.locator('.source-card').count();const search=p.locator('.collection-search input');await search.fill('zz_no_matching_piece');assert.equal(await p.locator('.source-card').count(),0);
await p.locator('.collection-results button').click();assert.equal(await p.locator('.source-card').count(),n);
await p.locator('.source-card .source-save').first().click();await p.locator('.collection-refine').click();await p.locator('.collection-saved').click();assert.equal(await p.locator('.source-card').count(),1);await p.reload();await p.locator('.source-card').first().waitFor();
await p.goto('http://127.0.0.1:8826/collection/AgSCVfoKPto5gvZLaIXS/');await p.locator('.source-options select').first().selectOption('54');await p.locator('.source-purchase button').filter({hasText:locale==='ar'?'إضافة':'Add to bag'}).click();
await p.locator('.cart-drawer').waitFor();const qty=p.locator('.cart-drawer .quantity-control');await qty.locator('button').last().click();assert.equal((await qty.locator('output').innerText()).trim(),'2');
await p.locator('.cart-checkout-link').click();await p.locator('.delivery-fields').waitFor();await p.goto('http://127.0.0.1:8826/cart/');await p.locator('.bag-item').waitFor();assert.equal(await p.locator('.bag-item').count(),1);
await p.locator('.bag-item-end button').filter({hasText:locale==='ar'?'إزالة':'Remove'}).click();assert.equal(await p.locator('.bag-item').count(),0);console.log(locale+': search empty/reset, favourites, size/add, quantity, checkout, persisted cart, remove passed');await p.close();
}}finally{await b.close();}

