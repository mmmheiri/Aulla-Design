"use client";
import {useShop} from './Shop';
/** Five visible targets keep dots compact without shrinking their touch areas. */
export function PageDots({count,index,onChange,label}:{count:number;index:number;onChange:(index:number)=>void;label:string}){
 const {locale}=useShop(),ar=locale==='ar';
 const start=Math.max(0,Math.min(index-2,count-5));
 return <div className="page-dots" role="group" aria-label={label}>
  {Array.from({length:Math.min(5,count)},(_,i)=>i+start).map(i=><button type="button" key={i} aria-current={i===index?'true':undefined} aria-label={ar?`انتقلي إلى ${i+1} من ${count}`:`Go to ${i+1} of ${count}`} onClick={()=>onChange(i)}><span/></button>)}
  <span className="sr-only" role="status">{ar?`${index+1} من ${count}`:`${index+1} of ${count}`}</span>
 </div>;
}
