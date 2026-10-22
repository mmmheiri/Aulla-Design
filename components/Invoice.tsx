"use client";
import {ColourModel} from './ColourModel';
import {QRCodeSVG} from 'qrcode.react';
import {Money} from './Money';
import {useShop,type Order} from './Shop';
import {tx} from '../lib/catalog';
import {catalogueHero} from '../lib/catalogue-imagery';
export function Invoice({order}:{order:Order}){
 const {locale,products}=useShop(),t=(ar:string,en:string)=>tx(locale,ar,en);
 const qr=`AULLA DESIGN | DEMO INVOICE | ${order.id} | AED ${order.total.toFixed(2)}`;
 return <section className="invoice-document invoice-sheet" aria-label={t('فاتورة معاينة','Preview invoice')}>
 <header><div className="invoice-brand"><img src="/brand/aulla-ad-original-v3-symbol.svg" alt="" width="48" height="38"/><strong>AULLA DESIGN</strong></div><div><h2>{t('بطاقة القطعة','PRODUCT SHEET')}</h2><span>{t('فاتورة تجريبية · ليست فاتورة ضريبية','Demo invoice · Not a tax invoice')}</span></div></header>
 <dl className="invoice-meta"><div><dt>{t('مرجع الفاتورة','Invoice reference')}</dt><dd><bdi>{order.id}</bdi></dd></div><div><dt>{t('التاريخ','Date')}</dt><dd>{order.createdAt?new Intl.DateTimeFormat(locale==='ar'?'ar-AE':'en-GB',{dateStyle:'medium',timeZone:'Asia/Dubai'}).format(new Date(order.createdAt)):t('غير مسجّل','Not recorded')}</dd></div></dl>
 {order.lines?.length?<div className="invoice-lines">{order.lines.map((l,i)=>{
 const p=products.find(p=>l.productId?p.id===l.productId:p.name[0]===l.name[0]&&p.name[1]===l.name[1]);
 return <article className="invoice-piece" key={i}><div className="invoice-piece-info"><span className="invoice-piece-number"><bdi>{String(i+1).padStart(2,'0')}</bdi> · {t('القطعة','PIECE')}</span><h3>{l.name[locale==='ar'?0:1]}</h3><dl><div><dt>{t('المقاس','Size')}</dt><dd><bdi>{l.size}</bdi></dd></div>{Object.values(l.options).length>0&&<div><dt>{t('الخيارات','Options')}</dt><dd>{Object.values(l.options).join(' · ')}</dd></div>}<div><dt>{t('الكمية','Quantity')}</dt><dd>{l.quantity}</dd></div><div><dt>{t('سعر القطعة','Unit price')}</dt><dd><Money value={l.unitPrice} locale={locale}/></dd></div><div className="invoice-line-total"><dt>{t('المجموع','Line total')}</dt><dd><Money value={l.unitPrice*l.quantity} locale={locale}/></dd></div></dl></div><figure>{p?.source&&l.options.sgsgty6umuqzu2p8?<ColourModel id={p.id} code={Number(l.options.sgsgty6umuqzu2p8)} alt={l.name[locale==='ar'?0:1]}/>:p?.source?<img src={catalogueHero(p.id)} alt={l.name[locale==='ar'?0:1]} width="260" height="340"/>:<img className="invoice-image-fallback" src="/brand/aulla-ad-original-v3-symbol.svg" alt={t('أولّا — صورة القطعة غير مسجلة','Aulla — item image not recorded')} width="80" height="64"/>}<figcaption>{p?.source?t('تصوّر توضيحي للقطعة','Illustrative garment preview'):t('صورة القطعة غير مسجّلة','Item image not recorded')}</figcaption></figure></article>;
 })}</div>:<p>{t('هذا سجل تجريبي قديم؛ تفاصيل القطع غير مسجّلة.','This older demo record has no saved item details.')}</p>}
 <div className="invoice-closing"><div className="invoice-qr"><QRCodeSVG value={qr} size={132} marginSize={4} level="M" title={t('رمز مرجع الفاتورة التجريبية','Demo invoice reference QR')}/><span>{t('امسحي لقراءة مرجع الفاتورة','Scan to read the invoice reference')}</span><small>{t('مرجع نصّي، وليس رابط دفع أو تحقق','Text reference, not payment or verification')}</small></div><div className="invoice-totals">{order.delivery!==undefined&&<p>{t('التوصيل التجريبي','Demo delivery')} <Money value={order.delivery} locale={locale}/></p>}<p className="invoice-total">{t('الإجمالي','Total')} <Money value={order.total} locale={locale}/></p><p>{t('الدفع المحاكى','Simulated payment')} <span>{order.paid?t('مكتمل','Complete'):t('معلّق','Pending')}</span></p></div></div>
 <footer><p>{t('شكرًا لاختياركِ أولّا.','Thank you for choosing Aulla.')}</p><small>{t('معاينة محلية فقط · لا تحصيل أو إرسال','Local preview only · No collection or sending')}</small></footer>
 <button className="button invoice-print" onClick={()=>window.print()}>{t('طباعة / حفظ PDF','Print / Save PDF')}</button>
 </section>;
}
