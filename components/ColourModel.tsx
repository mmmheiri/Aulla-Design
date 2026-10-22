"use client";
import {useEffect,useRef,useState} from 'react';
import data from '../docs/source-import/fabric-colours.json';
import {catalogueDetailed} from '../lib/catalogue-imagery';
/** Local colour simulation for the two blue fabric masters, never a whole-photo hue filter. */
export function ColourModel({id,code,alt}:{id:string;code:number|null;alt:string}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [failed,setFailed]=useState(false);
 const sample=data.samples.find(s=>s.code===code);
 useEffect(()=>{
  const target=canvas.current;if(!target)return;
  let cancelled=false;const image=new Image();setFailed(false);
  image.onerror=()=>{if(!cancelled)setFailed(true)};
  image.onload=()=>{
   if(cancelled)return;
   target.width=image.naturalWidth;target.height=image.naturalHeight;
   const ctx=target.getContext('2d');if(!ctx)return;ctx.drawImage(image,0,0);
   if(!sample)return;
   const pixels=ctx.getImageData(0,0,target.width,target.height),d=pixels.data;
   const rgb=sample.approxHex.match(/[a-f\d]{2}/gi)!.map(n=>parseInt(n,16));
   const base=id==='eB2ukaigB7ZRn4QmJm81'?195:88;
   for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2];
    if(!d[i+3]||b-r<10||g-r<3)continue;
    const weight=Math.min(1,(b-r-10)/18)*Math.min(1,(g-r-3)/12);
    const light=(.2126*r+.7152*g+.0722*b)/base;
    for(let c=0;c<3;c++){
     const shade=Math.min(255,rgb[c]*Math.min(light,1)+(255-rgb[c])*Math.max(0,light-1)*.45);
     d[i+c]=Math.round(d[i+c]*(1-weight)+shade*weight);
    }
   }
   ctx.putImageData(pixels,0,0);target.dataset.colour=String(code);
  };
  image.src=catalogueDetailed(id);
  return()=>{cancelled=true};
 },[id,code,sample]);
 return failed?<img src={catalogueDetailed(id)} alt={alt} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<canvas ref={canvas} className="colour-model" role="img" aria-label={alt} style={{width:'100%',height:'100%',objectFit:'contain'}}/>;
}
