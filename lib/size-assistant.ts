export type MeasureUnit = 'cm' | 'inch';
export const measureKeys = ['length','chest','sleeve','forearm'] as const;
export type MeasureKey = typeof measureKeys[number];
export type GarmentMeasurements = Record<MeasureKey,number>;
export type ChartRow = {size:string; ranges:Record<MeasureKey,{min:number;max:number}>};
export type ApprovedSizeChart = {
  approved:boolean;
  approvedBy:string;
  version:string;
  unit:MeasureUnit|null;
  basis:'flat-garment';
  rows:ChartRow[];
};

export function chartIsReady(value:unknown):value is ApprovedSizeChart&{unit:MeasureUnit} {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const chart=value as ApprovedSizeChart;
  return chart.approved===true&&typeof chart.approvedBy==='string'&&!!chart.approvedBy.trim()&&typeof chart.version==='string'&&!!chart.version.trim()
    &&['cm','inch'].includes(chart.unit||'')&&chart.basis==='flat-garment'&&Array.isArray(chart.rows)&&chart.rows.length>0
    &&chart.rows.every(row=>!!row&&typeof row==='object'&&typeof row.size==='string'&&/^\d+$/.test(row.size)&&!!row.ranges&&typeof row.ranges==='object'&&measureKeys.every(key=>{
      const range=row.ranges[key];return range&&Number.isFinite(range.min)&&Number.isFinite(range.max)&&range.min>0&&range.max>=range.min;
    }))&&new Set(chart.rows.map(r=>r.size)).size===chart.rows.length;
}

export type SizeComparison = {status:'unavailable'|'invalid'|'no-match'|'matches';sizes:string[]};
/** Compare a fitting, flat garment only against an owner-approved product chart. */
export function compareGarmentSize(chart:ApprovedSizeChart|undefined,available:string[],input:GarmentMeasurements,unit:MeasureUnit):SizeComparison {
  if(!chartIsReady(chart))return {status:'unavailable',sizes:[]};
  if(!['cm','inch'].includes(unit)||measureKeys.some(key=>!Number.isFinite(input[key])||input[key]<=0))return {status:'invalid',sizes:[]};
  const factor=unit===chart.unit?1:unit==='inch'?2.54:1/2.54;
  const sizes=chart.rows.filter(row=>available.includes(row.size)&&measureKeys.every(key=>{
    const value=input[key]*factor,{min,max}=row.ranges[key];return value>=min-1e-7&&value<=max+1e-7;
  })).map(row=>row.size);
  return {status:sizes.length?'matches':'no-match',sizes};
}

export function checkKnownSize(available:string[],known:string) {
  if(!/^\d+$/.test(known))return 'empty';
  return available.includes(known)?'available':'unavailable';
}
