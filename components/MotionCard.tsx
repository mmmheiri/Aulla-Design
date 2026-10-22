"use client";
import {useEffect,useRef,type ReactNode} from 'react';
/** Quiet 2D entrance; content remains visible when scripting or motion is unavailable. */
export function MotionCard({children,className}:{children:ReactNode;className:string}){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{const el=ref.current;if(!el||!window.IntersectionObserver||!el.animate)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const cancel=()=>el.getAnimations().forEach(a=>a.cancel());
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){if(!reduced.matches)el.animate([{opacity:.65,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:360,easing:'cubic-bezier(.2,.7,.2,1)'});observer.disconnect();}},{threshold:.1});
  observer.observe(el);reduced.addEventListener('change',cancel);return()=>{observer.disconnect();reduced.removeEventListener('change',cancel);cancel();};
 },[]);
 return <article ref={ref} className={className+' motion-card'}>{children}</article>;
}
