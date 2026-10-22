"use client";
import {RequiredMark} from './RequiredMark';
import Link from 'next/link';
import {useShop} from './Shop';
import {Icon} from './Icons';
export function CustomMeasurements(){
 const {locale,measurements,setMeasurements}=useShop(),ar=locale==='ar',t=(a:string,e:string)=>ar?a:e;
 return <div className="custom-measurements"><label><span>{t('وحدة القياس','Measurement unit')}<RequiredMark/></span><select required name="measurementUnit" value={measurements.unit} onChange={e=>setMeasurements({unit:e.target.value as 'cm'|'inch',values:{}})}><option value="cm">{t('سنتيمتر (cm)','Centimetres (cm)')}</option><option value="inch">{t('بوصة (inch)','Inches (inch)')}</option></select></label>
 <p className="caption">{t('تُستخدم هذه القياسات لقطع التفصيل في الطلب. التعريفات بانتظار اعتماد الخياط. تغيير الوحدة يمسح القيم.','These measurements apply to made-to-measure pieces in this order. Definitions await tailor approval. Changing units clears the values.')}</p>
 <div className="measurement-fields">{[['length','طول العباية','Abaya length'],['bust','عرض الصدر','Chest width'],['sleeve','طول الكم','Sleeve length'],['forearm','عرض الساعد','Forearm width']].map(([key,a,e])=><label key={key}><span>{t(a,e)} ({measurements.unit})<RequiredMark/></span><input required name={key} type="number" inputMode="decimal" min="0.1" max={measurements.unit==='cm'?300:120} step="0.1" value={measurements.values[key]||''} onChange={e=>setMeasurements({...measurements,values:{...measurements.values,[key]:e.target.value}})}/></label>)}</div>
 <Link className="text-link" href="/guide/" target="_blank" rel="noopener">{t('دليل القياس','Measuring guide')}<Icon name="ruler"/></Link></div>;
}
