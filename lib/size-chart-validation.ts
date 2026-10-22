import {chartIsReady,type ApprovedSizeChart} from './size-assistant.ts';

type SizingProduct={id:string;optionGroups:{name:string;values:string[]}[]};
/** Validate the whole batch before activating any chart. No range inference. */
export function validateSizeCharts(input:unknown,products:SizingProduct[]):{ok:boolean;errors:string[];charts:Record<string,ApprovedSizeChart>} {
  const errors:string[]=[],charts:Record<string,ApprovedSizeChart>={};
  if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,errors:['Expected an object keyed by Aulla product ID.'],charts};
  for(const [id,value] of Object.entries(input)){
    const product=products.find(p=>p.id===id);
    if(!product){errors.push(`${id}: unknown Aulla product.`);continue;}
    if(!chartIsReady(value)){errors.push(`${id}: chart needs explicit approval, reviewer, version, cm/inch unit and four valid flat-garment ranges per size.`);continue;}
    const available=product.optionGroups.find(g=>g.name==='Size')?.values||[];
    const unsupported=value.rows.filter(row=>!available.includes(row.size)).map(row=>row.size);
    if(unsupported.length){errors.push(`${id}: sizes not offered by this piece: ${unsupported.join(', ')}.`);continue;}
    charts[id]=value;
  }
  return {ok:errors.length===0,errors,charts:errors.length?{}:charts};
}
