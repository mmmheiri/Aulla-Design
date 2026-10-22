"use client";
import {useRef,type PointerEvent,type MouseEvent} from 'react';

/** Horizontal gestures leave vertical page scrolling to the browser. */
export function useSwipe(onMove:(step:number)=>void,rtl=false,disabled=false){
 const origin=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 return {
  onPointerDown:(e:PointerEvent<HTMLElement>)=>{swiped.current=false;if(disabled||!e.isPrimary||e.button!==0)return;origin.current={x:e.clientX,y:e.clientY};},
  onPointerMove:(e:PointerEvent<HTMLElement>)=>{const p=origin.current;if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)){origin.current=null;return;}if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.4){origin.current=null;swiped.current=true;onMove((dx<0?1:-1)*(rtl?-1:1));}},
  onPointerUp:()=>{origin.current=null;},
  onPointerCancel:()=>{origin.current=null;},
  onPointerLeave:()=>{origin.current=null;},
  onClickCapture:(e:MouseEvent<HTMLElement>)=>{if(swiped.current){e.preventDefault();e.stopPropagation();swiped.current=false;}},
  onDragStart:(e:MouseEvent<HTMLElement>)=>e.preventDefault(),
 };
}
