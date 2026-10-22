export type AdminOrder={id:string;created_at:number|string;ship_at:number|string;total_fils:number|string;received_fils:number|string;payment_status:string;fulfilment_status:string;payment_method:string;customer_email?:string;address?:string};
export const paymentLabels:Record<string,[string,string]>={paid:['مدفوع','Paid'],pending:['بانتظار الدفع','Pending payment'],awaiting_transfer:['بانتظار التحويل','Awaiting transfer'],partially_paid:['دفع جزئي','Partially paid'],failed:['فشل الدفع','Failed'],cancelled:['ملغى','Cancelled'],expired:['منتهي','Expired']};
export const fulfilmentLabels:Record<string,[string,string]>={new:['جديد','New'],preparing:['قيد التجهيز','Preparing'],production:['قيد التفصيل','In production'],ready:['جاهز','Ready'],shipped:['تم الشحن','Shipped'],delivered:['تم التسليم','Delivered'],needs_action:['يحتاج مراجعة','Needs attention']};
export const nextStages:Record<string,string[]>={new:['preparing'],preparing:['production','ready'],production:['ready'],ready:['shipped'],shipped:['delivered'],delivered:[],needs_action:[]};
const DAY=86400000;
export const dubaiDay=(time:number)=>new Date(time+4*3600000).toISOString().slice(0,10);
export function analyseOrders(orders:AdminOrder[],days:number,now:number){
 const endDay=Date.parse(dubaiDay(now)+'T00:00:00+04:00'),start=days?endDay-(days-1)*DAY:0;
 const rows=orders.filter(o=>Number(o.created_at)>=start&&Number(o.created_at)<=now),paid=rows.filter(o=>o.payment_status==='paid');
 const paidValue=paid.reduce((n,o)=>n+Number(o.total_fils),0);
 const partialReceived=rows.filter(o=>o.payment_status==='partially_paid').reduce((n,o)=>n+Number(o.received_fils),0);
 const outstanding=rows.filter(o=>['pending','awaiting_transfer','partially_paid'].includes(o.payment_status)).reduce((n,o)=>n+Math.max(0,Number(o.total_fils)-Number(o.received_fils)),0);
 const overdue=orders.filter(o=>o.payment_status==='paid'&&!['shipped','delivered'].includes(o.fulfilment_status)&&Number(o.ship_at)<now);
 const transfers=orders.filter(o=>o.payment_method==='bank'&&['awaiting_transfer','partially_paid'].includes(o.payment_status));
 const attention=orders.filter(o=>o.fulfilment_status==='needs_action');
 const length=days||Math.min(90,Math.max(7,Math.ceil((endDay-Math.min(...rows.map(o=>Number(o.created_at)),endDay))/DAY)+1));
 const buckets=Array.from({length},(_,i)=>({date:dubaiDay(endDay-(length-i-1)*DAY),paidFils:0,count:0}));
 const map=new Map(buckets.map(b=>[b.date,b]));for(const o of rows){const b=map.get(dubaiDay(Number(o.created_at)));if(b){b.count++;if(o.payment_status==='paid')b.paidFils+=Number(o.total_fils);}}
 return {rows,paidValue,partialReceived,outstanding,paidCount:paid.length,averagePaid:paid.length?Math.round(paidValue/paid.length):0,overdue,transfers,attention,buckets};
}
