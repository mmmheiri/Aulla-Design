import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCart, totals, demoReceipt,linePrice } from "../lib/commerce.ts";
test('catalogue option charges stay consistent in displayed unit price and subtotal',()=>{const p={id:'choice',stock:4,price:100,sizes:['54'],choicePrices:{fabric:{velvet:20}},choices:[{id:'fabric',required:true,values:['velvet']}]};const line={id:'choice',size:'54',quantity:2,options:{fabric:'velvet'}};assert.equal(linePrice(line,p),120);assert.equal(totals([line],[p]).subtotal,240);});
const products = [
  { id: "a", stock: 4, price: 330 },
  { id: "b", stock: 2, price: 260 },
  { id: "sold", stock: 0, price: 10 },
];
test("restored cart rejects malformed, unknown and sold-out lines", () => {
  assert.deepEqual(
    normalizeCart(
      [
        { id: "a", size: "54", quantity: -1 },
        { id: "missing", size: "50", quantity: 1 },
        { id: "a", size: "wat", quantity: 1 },
        { id: "a", size: "54", quantity: NaN },
        { id: "a", size: "54", quantity: 2.5 },
        { id: "sold", size: "50", quantity: 1 },
        null,
      ],
      products,
    ),
    [],
  );
});
test("duplicates merge and product stock is shared across sizes", () => {
  assert.deepEqual(
    normalizeCart(
      [
        { id: "a", size: "54", quantity: 2 },
        { id: "a", size: "54", quantity: 1 },
        { id: "a", size: "56", quantity: 9 },
      ],
      products,
    ),
    [
      { id: "a", size: "54", quantity: 3 },
      { id: "a", size: "56", quantity: 1 },
    ],
  );
});
test("untrusted non-array storage yields an empty bag", () => {
  assert.deepEqual(normalizeCart({ id: "a" }, products), []);
  assert.deepEqual(normalizeCart(null, products), []);
});
test("demo delivery threshold and empty-cart total", () => {
  assert.deepEqual(totals([], products), {
    subtotal: 0,
    delivery: 0,
    total: 0,
    count: 0,
  });
  assert.equal(
    totals([{ id: "a", size: "54", quantity: 1 }], products).total,
    355,
  );
  assert.equal(
    totals([{ id: "a", size: "54", quantity: 2 }], products).delivery,
    0,
  );
});
test("same payment attempt produces one demo reference", () => {
  const completed = new Map();
  const first = demoReceipt("attempt-a", completed);
  assert.equal(demoReceipt("attempt-a", completed), first);
  assert.equal(completed.size, 1);
  assert.notEqual(demoReceipt("attempt-b", completed), first);
});
test('source options are validated and variants stay distinct',()=>{
 const source=[{id:'real',stock:10,price:280,sizes:['—'],choices:[{id:'fabric',required:true,values:['velvet','nida']}]}];
 assert.deepEqual(normalizeCart([{id:'real',size:'—',quantity:1}],source),[]);
 assert.deepEqual(normalizeCart([{id:'real',size:'—',quantity:1,options:{fabric:'fake'}}],source),[]);
 const cart=normalizeCart([{id:'real',size:'—',quantity:1,options:{fabric:'velvet'}},{id:'real',size:'—',quantity:2,options:{fabric:'nida'}}],source);
 assert.equal(cart.length,2);assert.equal(totals(cart,source).subtotal,840);
 assert.equal(normalizeCart([{id:'real',size:'54',quantity:1,options:{fabric:'velvet'}}],source).length,0);
});

test("separate checkout sessions produce distinct references",()=>{assert.notEqual(demoReceipt("a",new Map()),demoReceipt("a",new Map()));});
