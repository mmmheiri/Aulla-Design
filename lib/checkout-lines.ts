import type {CartLine} from './commerce';
export function checkoutLines(cart:CartLine[],kinds:Record<number,string>,custom:boolean){
  return cart.map((line,index)=>{
    const tailored=/تفصيل/.test(line.size);
    const kind=tailored?'made_to_order':kinds[index]||'ready';
    return {...line,kind,sizeMode:kind==='made_to_order'&&(tailored||custom)?'custom':'standard'};
  });
}
