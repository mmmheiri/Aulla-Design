"use client";
import {useRef,useState,type ReactNode} from 'react';
import {Icon} from './Icons';
type Props={active:boolean;onChange:(active:boolean)=>void;children:ReactNode;detail:ReactNode;label:string;closeLabel:string};
/** An in-place lens; no route change, lightbox or full-page zoom. */
export function ImageLens({active,onChange,children,detail,label,closeLabel}:Props){
 const area=useRef<HTMLButtonElement>(null);
 const [point,setPoint]=useState({x:.5,y:.3,w:0,h:0});
 const place=(clientX:number,clientY:number)=>{const r=area.current?.getBoundingClientRect();if(r)setPoint({x:Math.max(0,Math.min(1,(clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(clientY-r.top)/r.height)),w:r.width,h:r.height});};
 const radius=72,scale=2.5;
 return <button ref={area} type="button" className={'source-zoom image-lens'+(active?' lens-active':'')} aria-label={active?closeLabel:label} aria-pressed={active}
  onClick={e=>{if(!point.w){const r=e.currentTarget.getBoundingClientRect();setPoint(p=>({...p,w:r.width,h:r.height}));}onChange(!active);}}
  onPointerMove={e=>{if(active)place(e.clientX,e.clientY);}}
  onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onChange(false);}if(active&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setPoint(p=>({...p,x:Math.max(0,Math.min(1,p.x+(e.key==='ArrowRight'?.08:e.key==='ArrowLeft'?-.08:0))),y:Math.max(0,Math.min(1,p.y+(e.key==='ArrowDown'?.08:e.key==='ArrowUp'?-.08:0)))}));}}}
 >{children}<span className="lens-affordance" aria-hidden="true"><Icon name={active?'close':'search'}/></span>
 {active&&point.w>0&&<span className="image-lens-window" aria-hidden="true" style={{left:Math.max(0,Math.min(point.x*point.w-radius,point.w-radius*2)),top:Math.max(0,Math.min(point.y*point.h-radius,point.h-radius*2))}}><span className="image-lens-detail" style={{width:point.w,height:point.h,transform:`translate(${radius-point.x*point.w*scale}px, ${radius-point.y*point.h*scale}px) scale(${scale})`}}>{detail}</span></span>}
 </button>;
}
