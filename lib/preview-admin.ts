import type {Product} from "./catalog.ts";
export type InvoiceLine={productId?:string;name:[string,string];size:string;quantity:number;unitPrice:number;options:Record<string,string>};
export type PreviewOrder={id:string;total:number;count:number;paid:boolean;stage:"new"|"preparing"|"shipped";createdAt?:string;lines?:InvoiceLine[];delivery?:number;cost?:number;refunded?:number;method?:"demo"|"bank";transferState?:"awaiting"|"review"|"confirmed"};
const amount=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=10000000;
export function restoreOrders(value:unknown):PreviewOrder[]{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>();
 return value.slice(0,500).flatMap(raw=>{
  if(!raw||typeof raw!=="object")return [];
  const o=raw as PreviewOrder;
  if(typeof o.id!=="string"||!/^DEMO-[a-zA-Z0-9-]{1,70}$/.test(o.id)||seen.has(o.id)||!amount(o.total)||!Number.isSafeInteger(o.count)||o.count<1||o.count>1000||typeof o.paid!=="boolean"||!["new","preparing","shipped"].includes(o.stage))return [];
  seen.add(o.id);
  const lines=Array.isArray(o.lines)?o.lines.slice(0,100).filter(l=>l&&Array.isArray(l.name)&&l.name.length===2&&l.name.every(n=>typeof n==="string"&&n.length<=150)&&typeof l.size==="string"&&l.size.length<80&&Number.isSafeInteger(l.quantity)&&l.quantity>0&&l.quantity<=1000&&amount(l.unitPrice)).map(l=>({...((typeof l.productId==="string"&&/^[a-zA-Z0-9-]{1,80}$/.test(l.productId))?{productId:l.productId}:{}),name:l.name,size:l.size,quantity:l.quantity,unitPrice:l.unitPrice,options:Object.fromEntries(Object.entries(l.options&&typeof l.options==="object"?l.options:{}).filter(([k,v])=>k.length<100&&typeof v==="string"&&v.length<150).slice(0,20))})):undefined;
  return [{id:o.id,total:o.total,count:o.count,paid:o.paid,stage:o.stage,
   ...(typeof o.createdAt==="string"&&Number.isFinite(Date.parse(o.createdAt))?{createdAt:new Date(o.createdAt).toISOString()}:{}),
   ...(lines?{lines}:{}),...(amount(o.delivery)?{delivery:o.delivery}:{}),...(amount(o.cost)?{cost:o.cost}:{}),
   ...(o.paid&&amount(o.refunded)&&o.refunded!<=o.total?{refunded:o.refunded}:{}),
   method:o.method==="bank"?"bank":"demo",
   ...(o.method==="bank"&&["awaiting","review","confirmed"].includes(o.transferState??"")?{transferState:o.transferState}:{})
  } as PreviewOrder];
 });
}
export function restoreProducts(value:unknown,base:Product[]):Product[]{
 if(!Array.isArray(value))return base;
 return base.map(p=>{const v=value.find(x=>x&&x.id===p.id);if(!v||!Array.isArray(v.name)||v.name.length!==2||!v.name.every((n:unknown)=>typeof n==="string"&&n.trim().length>0&&n.length<=70)||!amount(v.price)||v.price<=0||v.price>100000||!Number.isSafeInteger(v.stock)||v.stock<0||v.stock>999)return p;return {...p,name:v.name,price:v.price,stock:v.stock};});
}
export function financialSummary(orders:PreviewOrder[]){
 const total=orders.reduce((s,o)=>s+o.total,0), paid=orders.filter(o=>o.paid).reduce((s,o)=>s+o.total,0), refunds=orders.reduce((s,o)=>s+(o.refunded??0),0);
 const known=orders.filter(o=>o.paid).every(o=>o.cost!==undefined);
 return {total,paid,pending:total-paid,refunds,net:paid-refunds,average:orders.length?total/orders.length:0,profit:known?paid-refunds-orders.filter(o=>o.paid).reduce((s,o)=>s+o.cost!,0):null};
}
