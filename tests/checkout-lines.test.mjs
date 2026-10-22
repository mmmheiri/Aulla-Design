import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkoutLines} from '../lib/checkout-lines.ts';
test('a made-to-measure selection stays made-to-order and requires measurements',()=>{
 const lines=checkoutLines([{id:'one',size:'تفصيل(تم إرسال المقاسات فالخاص)',quantity:1}],{0:'ready'},false);
 assert.equal(lines[0].kind,'made_to_order');assert.equal(lines[0].sizeMode,'custom');
});
test('a mixed bag keeps standard ready pieces separate from custom preparation',()=>{
 const lines=checkoutLines([{id:'one',size:'54',quantity:1},{id:'two',size:'56',quantity:1}],{1:'made_to_order'},true);
 assert.equal(lines[0].sizeMode,'standard');assert.equal(lines[1].sizeMode,'custom');assert.equal(lines[0].kind,'ready');
});
