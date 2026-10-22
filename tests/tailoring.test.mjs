import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CUSTOM_SIZE,tailoringSizeGroup} from '../lib/tailoring.mjs';
import {normalizeCart} from '../lib/commerce.ts';
import {checkoutLines} from '../lib/checkout-lines.ts';
const {products}=JSON.parse(await readFile(new URL('../docs/source-import/products.json',import.meta.url),'utf8'));

test('all eleven abayas offer one custom size without altering published size values',()=>{
  const before=JSON.stringify(products);
  for(const product of products){
    const original=product.optionGroups.find(g=>g.name==='Size');
    const group=tailoringSizeGroup(product);
    assert.equal(group.values.filter(v=>/تفصيل/.test(v)).length,1);
    for(const value of original?.values||[])assert.ok(group.values.includes(value));
    if(original)assert.equal(group.id,original.id);
    else assert.deepEqual(group.values,[CUSTOM_SIZE]);
  }
  assert.equal(JSON.stringify(products),before);
});

test('new custom size survives cart restoration and cannot become ready at checkout',()=>{
  const product=products.find(p=>p.id==='afW0h6iCRpPhAA77FwpR');
  const sizes=tailoringSizeGroup(product).values;
  const cart=normalizeCart([{id:product.id,size:CUSTOM_SIZE,quantity:1}], [{id:product.id,sizes,stock:10,price:330}]);
  assert.equal(cart.length,1);
  const [line]=checkoutLines(cart,{0:'ready'},false);
  assert.equal(line.kind,'made_to_order');assert.equal(line.sizeMode,'custom');
});
