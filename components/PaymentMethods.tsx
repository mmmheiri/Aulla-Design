import {tx, type Locale} from '../lib/catalog';

/** Visual preview only. Available checkout methods still come from server config. */
export function PaymentMethods({locale}:{locale:Locale}) {
  const t=(ar:string,en:string)=>tx(locale,ar,en);
  return <div className="payment-methods">
    <ul aria-label={t('وسائل الدفع المخططة','Planned payment methods')}>
      {[['apple_pay','Apple Pay'],['google_pay','Google Pay'],['visa','Visa'],['master','Mastercard']].map(([file,name])=><li key={file}><img src={`/payments/${file}.svg`} width="48" height="30" alt={name}/></li>)}
      <li className="payment-bank"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 9 9-5 9 5H3Zm2 3v6m7-6v6m7-6v6M3 21h18M3 18h18"/></svg><span>{t('تحويل بنكي','Bank transfer')}</span></li>
    </ul>
    <p>{t('معاينة الوسائل · بانتظار التفعيل','Payment preview · Activation pending')}</p>
  </div>;
}
