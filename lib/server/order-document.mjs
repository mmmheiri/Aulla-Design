import {run} from './db.mjs';
import {publicOrder} from './commerce.mjs';

/** Snapshot values only: never recalculate an issued order from the live catalogue. */
export async function orderDocument(db,order){
 const items=(await run(db,'SELECT id,name,size,quantity,price_fils,options FROM order_items WHERE order_id=? ORDER BY id',[order.id])).rows;
 return {...publicOrder(order),createdAt:Number(order.created_at),items:items.map(i=>({id:i.id,name:i.name,size:i.size,quantity:Number(i.quantity),unitFils:Number(i.price_fils),options:JSON.parse(i.options)}))};
}
