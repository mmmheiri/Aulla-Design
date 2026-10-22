import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreOrders,restoreProducts,financialSummary} from '../lib/preview-admin.ts';
import {transferTransition,paymentReadiness,paymentSetup} from '../lib/payment-readiness.ts';
test('admin restore strips unknown fields and rejects malformed money and stages',()=>{
 const input=[{id:'DEMO-safe',total:100,count:1,paid:true,stage:'new',email:'private',cost:40,refunded:10},{id:'DEMO-bad',total:-1,count:1,paid:true,stage:'new'},{id:'DEMO-safe',total:999,count:1,paid:true,stage:'shipped'}];
 const clean=restoreOrders(input);assert.equal(clean.length,1);assert.equal(clean[0].email,undefined);assert.equal(financialSummary(clean).profit,50);
 assert.equal(financialSummary([{id:'DEMO-a',total:50,count:1,paid:true,stage:'new'}]).profit,null);
 assert.equal(restoreOrders([{id:'DEMO-unpaid',total:100,count:1,paid:false,stage:'new',refunded:80}])[0].refunded,undefined);
});
test('product restore cannot inject IDs, options or invalid prices',()=>{
 const base=[{id:'x',name:['س','X'],price:100,stock:4,tone:'ink',group:'daily'}];
 assert.equal(restoreProducts([{id:'x',price:-10,stock:2,name:['س','X']}],base)[0].price,100);
 assert.equal(restoreProducts([{id:'x',price:120,stock:2,name:['س','X'],choices:['injected']}],base)[0].choices,undefined);
});
test('transfer receipt never confirms payment without settlement',()=>{
 assert.equal(transferTransition('awaiting_transfer','receipt_received'),'receipt_received');
 assert.throws(()=>transferTransition('receipt_received','confirmed',true));
 assert.throws(()=>transferTransition('under_review','confirmed'));
 assert.equal(transferTransition('under_review','confirmed',true),'confirmed');
 assert.deepEqual(paymentReadiness(paymentSetup),{ziina:false,bank:false});
});
