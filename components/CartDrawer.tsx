"use client";
import Link from 'next/link';
import {useShop} from './Shop';
import {Dialog} from './Dialog';
import {BagItems} from './BagItems';
import {Money} from './Money';
import {Icon} from './Icons';
import {PaymentMethods} from './PaymentMethods';
import {totals} from '../lib/commerce';
import {tx} from '../lib/catalog';
import {catalogueImage} from '../lib/catalogue-imagery';
import {ColourModel} from './ColourModel';

export function CartDrawer() {
  const {locale,cart,products,closeBag}=useShop();
  const t=(ar:string,en:string)=>tx(locale,ar,en);
  const bill=totals(cart,products);
  const first=products.find(p=>p.id===cart[0]?.id);
  return <Dialog drawer title={t(`سلتك (${bill.count})`,`Your bag (${bill.count})`)} leadingIcon={<Icon name="bag"/>} closeLabel={t('إغلاق السلة','Close bag')} onClose={closeBag}>
    {cart.length ? <>
      <div className="cart-drawer-band"><span>{t('قطعتك، لونك، والتفاصيل التي تختارينها.','Your piece, your colour, your kind of detail.')}</span></div>
      <div className="cart-drawer-scroll">
        <p className="sr-only" role="status">{t(`عدد القطع: ${bill.count}`,`${bill.count} ${bill.count===1?'piece':'pieces'} in your bag`)}</p>
        <BagItems compact />
      </div>
      <div className="cart-drawer-checkout">
        <div className="cart-drawer-total" aria-live="polite" aria-atomic="true"><span>{t('المجموع الفرعي','Subtotal')}</span><Money value={bill.subtotal} locale={locale}/></div>
        <p className="cart-drawer-note">{t('الشحن بانتظار الاعتماد. يُراجع المبلغ في الدفع التجريبي.','Shipping awaits approval. Total verified at test checkout.')}</p>
        <Link href="/checkout/" className="button full cart-checkout-link" onClick={closeBag}><span>{t('إتمام الطلب','Checkout')}</span><span className="cart-checkout-amount"><span aria-hidden="true">·</span><Money value={bill.subtotal} locale={locale}/></span></Link>
        <button type="button" className="cart-continue text-link" onClick={closeBag}>{t('متابعة التسوق','Continue shopping')}</button>
        <PaymentMethods locale={locale}/>
      </div>
    </> : <div className="cart-drawer-empty">
      <Icon name="bag"/><h3>{t('سلتك بانتظار اختيارك','Room for your first choice')}</h3>
      <p>{t('اكتشفي المجموعة واختاري قطعتك.','Explore the collection and find your piece.')}</p>
      <Link href="/collection/" className="button full" onClick={closeBag}>{t('اكتشفي العبايات','Explore the abayas')}</Link>
    </div>}
  </Dialog>;
}
