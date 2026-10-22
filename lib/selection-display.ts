import type {CartLine} from './commerce';
import {CUSTOM_SIZE,isTailoredSize} from './tailoring.mjs';
export function selectionLabel(value:string,locale:'ar'|'en'){
  if(isTailoredSize(value))return locale==='ar'?CUSTOM_SIZE:'Made to measure';
  if(locale==='ar')return value;
  return ({'برغندي':'Burgundy','كحلي':'Navy','مخمل':'Velvet','كوري ندى':'Korean nida'} as Record<string,string>)[value]||value;
}
export function selectionQuery(line:CartLine){
  const options=line.options||{},params=new URLSearchParams();
  if(options.h5lv7eefmutwa2g4)params.set('colourName',options.h5lv7eefmutwa2g4==='برغندي'?'burgundy':'navy');
  if(options.sgsgty6umuqzu2p8)params.set('colour',options.sgsgty6umuqzu2p8);
  return params.size?'?'+params.toString():'';
}
