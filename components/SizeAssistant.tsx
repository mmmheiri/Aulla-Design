"use client";
import {useId,useState} from 'react';
import {useShop} from './Shop';
import {tx} from '../lib/catalog';
import {sizeLabels} from '../lib/size-labels';
import {tailoringSizeGroup,isTailoredSize} from '../lib/tailoring.mjs';
import type {SourceProduct} from '../lib/source-catalogue';
import {productSizeCharts} from '../lib/size-assistant-config';
import {chartIsReady,checkKnownSize,compareGarmentSize,measureKeys,type MeasureUnit,type GarmentMeasurements,type SizeComparison} from '../lib/size-assistant';

export function SizeAssistant({product,value,onSelect}:{product:SourceProduct;value?:string;onSelect?:(size:string)=>void}) {
  const {locale}=useShop(),t=(a:string,e:string)=>tx(locale,a,e);
  const group=tailoringSizeGroup(product),available=group.values.filter(v=>/^\d+$/.test(v));
  const custom=group.values.find(isTailoredSize);
  const [mode,setMode]=useState<'known'|'measure'>('known');
  const [known,setKnown]=useState(value&&/^\d+$/.test(value)?value:'');
  const [unit,setUnit]=useState<MeasureUnit>('cm');
  const [measure,setMeasure]=useState<Record<string,string>>({});
  const [result,setResult]=useState<SizeComparison|null>(null);
  const chart=productSizeCharts[product.id],ready=chartIsReady(chart),knownStatus=checkKnownSize(available,known);
  const noteId=useId();
  const labels={length:t('طول العباية','Abaya length'),chest:t('عرض الصدر وهي مفرودة','Flat chest width'),sleeve:t('طول الكم','Sleeve length'),forearm:t('عرض الساعد وهو مفرود','Flat forearm width')};
  const knownSizes=[...new Set([...Object.keys(sizeLabels),...available])].sort((a,b)=>Number(a)-Number(b));
  const select=(size:string)=>onSelect?.(size);
  return <section className="fit-assistant" aria-label={t('مساعد المقاس','Size assistant')}>
    <p className="fit-assistant-intro">{t('اختاري مقاسًا تعرفينه، أو قارني قياسات عباية تناسبكِ.','Choose a size you know, or compare an abaya that already fits.')}</p>
    <div className="fit-assistant-modes" role="group" aria-label={t('طريقة اختيار المقاس','Sizing method')}>
      <button type="button" aria-pressed={mode==='known'} onClick={()=>setMode('known')}>{t('أعرف مقاسي','I know my size')}</button>
      <button type="button" aria-pressed={mode==='measure'} onClick={()=>setMode('measure')}>{t('قارني القياسات','Compare measurements')}</button>
    </div>
    {mode==='known'?<div className="fit-assistant-body">
      {available.length?<><label>{t('مقاس عباية يناسبكِ عادةً','Your usual abaya size')}<select value={known} onChange={e=>setKnown(e.target.value)}><option value="">{t('اختاري المقاس','Choose a size')}</option>{knownSizes.map(size=><option key={size} value={size}>{sizeLabels[size]?`${sizeLabels[size]} · ${size}`:size}</option>)}</select></label>
        <div className="fit-assistant-result" role="status">
          {knownStatus==='empty'?<p>{t('سنبيّن لكِ إن كان مقاسكِ ضمن خيارات هذه القطعة.','We will check whether this piece offers your usual size.')}</p>:knownStatus==='available'?<><span className="fit-assistant-kicker">{t('ضمن خيارات هذه القطعة','Offered for this piece')}</span><bdi className="fit-assistant-size">{known}</bdi><p>{t('تأكيد توفر الخيار فقط؛ قد تختلف القصّة بين القطع.','This confirms the size option; fit can vary between pieces.')}</p>{onSelect&&<button type="button" className="button full" onClick={()=>select(known)}>{t(`استخدمي المقاس ${known}`,`Use size ${known}`)}</button>}</>:<><p>{t('هذا المقاس غير منشور لهذه القطعة. تقدرين تختارين التفصيل حسب المقاس.','This size is not listed for this piece. Made-to-measure is available instead.')}</p>{custom&&onSelect&&<button type="button" className="button full" onClick={()=>select(custom)}>{t('اختاري التفصيل حسب المقاس','Choose made to measure')}</button>}</>}
        </div></>:<div className="fit-assistant-result"><p>{t('هذه القطعة متاحة للتفصيل حسب المقاس. أدخلي القياسات المطلوبة عند إتمام الطلب.','This piece offers made-to-measure. Enter the required measurements at checkout.')}</p>{custom&&onSelect&&<button type="button" className="button full" onClick={()=>select(custom)}>{t('اختاري التفصيل حسب المقاس','Choose made to measure')}</button>}</div>}
    </div>:<div className="fit-assistant-body">
      {ready?<form onSubmit={e=>{e.preventDefault();setResult(compareGarmentSize(chart,available,Object.fromEntries(measureKeys.map(key=>[key,Number(measure[key])])) as GarmentMeasurements,unit));}}>
        <p id={noteId}>{t('قيسي عباية تناسبكِ وهي مفرودة، دون شدّ القماش. هذه قياسات القطعة وليست محيط الجسم.','Measure a well-fitting abaya laid flat without stretching. These are garment measurements, not body circumferences.')}</p>
        <label>{t('وحدة القياس','Measurement unit')}<select value={unit} onChange={e=>{setUnit(e.target.value as MeasureUnit);setMeasure({});setResult(null);}}><option value="cm">{t('سنتيمتر','Centimetres')} (cm)</option><option value="inch">{t('بوصة','Inches')} (inch)</option></select></label>
        <div className="fit-assistant-measures">{measureKeys.map(key=><label key={key}>{labels[key]} ({unit})<input name={key} type="number" inputMode="decimal" required min="0.1" step="any" aria-describedby={noteId} value={measure[key]||''} onChange={e=>{setMeasure({...measure,[key]:e.target.value});setResult(null);}}/></label>)}</div>
        <button type="submit" className="button full">{t('قارني مقاسي','Compare my size')}</button>
        {result&&<div className="fit-assistant-result" role="status">{result.status==='matches'?<><p>{t('المقاسات المتوافقة مع القياسات المدخلة في الجدول المعتمد:','Sizes matching your measurements in the approved chart:')}</p><div className="fit-assistant-matches">{result.sizes.map(size=><button key={size} type="button" className="button secondary" onClick={()=>select(size)}>{t(`اختاري ${size}`,`Choose ${size}`)}</button>)}</div></>:<p>{result.status==='no-match'?t('لا توجد مطابقة ضمن المقاسات المنشورة. اختاري التفصيل حسب المقاس.','No match in the listed sizes. Choose made to measure.'):t('راجعي القياسات قبل المتابعة.','Review your measurements before continuing.')}</p>}</div>}
      </form>:<div className="fit-assistant-pending" role="status"><p>{t('حساب المقاس بالقياسات يتفعّل بعد اعتماد جدول أولّا لهذه القطعة. حاليًا تقدرين تتأكدين من مقاس تعرفينه أو تختارين التفصيل.','Measurement matching awaits an approved Aulla chart for this piece. You can check a size you know or choose made-to-measure.')}</p><button type="button" className="text-link" onClick={()=>setMode('known')}>{t('تحققي من مقاس تعرفينه','Check a size you know')}</button></div>}
    </div>}
    <p className="fit-assistant-privacy">{t('ما نطلب صورة أو وزنًا. القياسات التي تدخلينها هنا لا تُحفظ أو تُرسل.','No photo or weight needed. Measurements entered here are not stored or sent.')}</p>
  </section>;
}
