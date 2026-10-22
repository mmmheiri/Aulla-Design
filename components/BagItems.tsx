"use client";
import Link from 'next/link';
import {useShop} from './Shop';
import {ColourModel} from './ColourModel';
import {Icon} from './Icons';
import {Money} from './Money';
import {catalogueImage} from '../lib/catalogue-imagery';
import {nameOf,tx} from '../lib/catalog';
import {lineKey,normalizeCart,linePrice} from '../lib/commerce';
import {selectionLabel,selectionQuery} from '../lib/selection-display';

/** Shared by the full bag page and compact drawer so variants and limits agree. */
export function BagItems({compact=false}:{compact?:boolean}){
  const {locale,cart,setCart,products,closeBag}=useShop();
  const t=(ar:string,en:string)=>tx(locale,ar,en);
  return <div className="bag-items">
          {cart.map((line) => {
            const p = products.find((p) => p.id === line.id)!;
            const used = cart
              .filter((l) => l.id === line.id)
              .reduce((s, l) => s + l.quantity, 0);
            const remove=<button type="button" className={compact?'bag-remove icon-button':'text-button'}
              aria-label={t(`إزالة ${nameOf(p,locale)} ${selectionLabel(line.size,locale)}`,`Remove ${nameOf(p,locale)} ${selectionLabel(line.size,locale)}`)}
              onClick={event=>{
                const row=event.currentTarget.closest('article');
                const focusTarget=(row?.nextElementSibling?.querySelector('a')||row?.previousElementSibling?.querySelector('a')||row?.closest('dialog')?.querySelector('.dialog-head button')) as HTMLElement|null;
                setCart(c=>c.filter(l=>lineKey(l)!==lineKey(line)));
                requestAnimationFrame(()=>focusTarget?.isConnected&&focusTarget.focus({preventScroll:true}));
              }}>{compact?<Icon name="trash"/>:t('إزالة','Remove')}</button>;
            return (
              <article className="bag-item" key={lineKey(line)}>
                <Link
                  onClick={closeBag} href={(p.source?"/collection/":"/product/") + line.id + "/"+selectionQuery(line)}
                  className={"bag-image tone-" + p.tone}
                >
                  {p.source&&line.options?.sgsgty6umuqzu2p8?<ColourModel id={p.id} code={Number(line.options.sgsgty6umuqzu2p8)} alt={nameOf(p,locale)}/>:<img
                    src={p.source?(line.options?.h5lv7eefmutwa2g4==='برغندي'?'/catalogue-transparent/lnPglpYAhuumNm2wHhtA-v2-burgundy.png':p.image||catalogueImage(p.id)):`/placeholders/${p.tone}-front.svg`}
                    alt={nameOf(p,locale)}
                    loading="lazy"
                    width="800"
                    height="1000"
                  />}
                </Link>
                <div className="bag-item-info">
                  <div className="bag-item-heading">
                  <Link onClick={closeBag} href={(p.source?"/collection/":"/product/") + line.id + "/"+selectionQuery(line)}>
                    <h2>{nameOf(p, locale)}</h2>
                  </Link>
                  {compact&&<Money value={linePrice(line,p)*line.quantity} locale={locale}/>}
                  </div>
                  <p>
                    {t("المقاس", "Size")}: <bdi>{selectionLabel(line.size,locale)}</bdi>
                  </p>
                  {line.options&&<p>{Object.values(line.options).filter(v=>v!==line.size).map(v=>selectionLabel(v,locale)).join(" · ")}</p>}
                  <small>
                    {p.source?t("اختيار للمعاينة المحلية", "Local preview selection"):t("رسم وبيانات تجريبية", "Illustration & demo data")}
                  </small>
                  <div className="bag-item-controls"><div className="quantity-control">
                    <button
                      className="icon-button"
                      disabled={line.quantity <= 1}
                      aria-label={t(
                        `تقليل كمية ${nameOf(p, locale)}`,
                        `Decrease ${nameOf(p, locale)} quantity`,
                      )}
                      onClick={() =>
                        setCart((c) =>
                          c.map((l) =>
                            lineKey(l) === lineKey(line)
                              ? { ...l, quantity: l.quantity - 1 }
                              : l,
                          ),
                        )
                      }
                    >
                      <Icon name="minus" />
                    </button>
                    <output aria-label={t('الكمية','Quantity')}>{line.quantity}</output>
                    <button
                      className="icon-button"
                      disabled={used >= p.stock}
                      aria-label={t(
                        `زيادة كمية ${nameOf(p, locale)}`,
                        `Increase ${nameOf(p, locale)} quantity`,
                      )}
                      onClick={() =>
                        setCart((c) =>
                          normalizeCart(
                            c.map((l) =>
                              lineKey(l) === lineKey(line)
                                ? { ...l, quantity: l.quantity + 1 }
                                : l,
                            ),
                            products,
                          ),
                        )
                      }
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                  {compact&&remove}</div>
                </div>
                {!compact&&<div className="bag-item-end">
                  <Money value={linePrice(line,p) * line.quantity} locale={locale} />
                  {remove}
                </div>}
              </article>
            );
          })}
  </div>;
}
