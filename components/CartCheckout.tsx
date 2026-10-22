"use client";
import {BagItems} from "./BagItems";
import {PaymentMethods} from "./PaymentMethods";
import { Money } from "./Money";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { nameOf, money, tx } from "../lib/catalog";
import { totals, demoReceipt } from "../lib/commerce";
import { Empty, PageTitle, useShop } from "./Shop";
import { Icon } from "./Icons";
import {Invoice} from "./Invoice";
import {Dialog} from "./Dialog";
import { BagMotion } from "./BagMotion";
export function OrderSummary({serverQuote=false}:{serverQuote?:boolean}) {
  const { locale, cart, products } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const bill = totals(cart, products);
  return (
    <div className="order-summary">
      <h2>{t("ملخّص السلة", "Bag summary")}</h2>
      <dl>
        <div>
          <dt>{t("القطع", "Pieces")}</dt>
          <dd>{bill.count}</dd>
        </div>
        <div>
          <dt>{t("المجموع الفرعي", "Subtotal")}</dt>
          <dd>
            <Money value={bill.subtotal} locale={locale} />
          </dd>
        </div>
        <div>
          <dt>{t("التوصيل", "Delivery")}</dt>
          <dd>
            {serverQuote?t('بانتظار الاعتماد','Pending approval'):<Money value={bill.delivery} locale={locale} />}
          </dd>
        </div>
        <div className="grand-total">
          <dt>{t("الإجمالي التجريبي", "Demo total")}</dt>
          <dd>
            <Money value={serverQuote?bill.subtotal:bill.total} locale={locale} />
          </dd>
        </div>
      </dl>
      {serverQuote?<p>{t('قيمة القطع فقط. المبلغ النهائي التجريبي يتحقق في صفحة الدفع، ورسوم الشحن بانتظار الاعتماد.','Pieces only. The test total is verified at checkout; shipping fees await approval.')}</p>:<p>
        {t("رسوم توضيحية: ", "Illustrative delivery: ")}<Money value={25} locale={locale} />
        {t("، مجانًا من ", ", free from ")}<Money value={600} locale={locale} />
        {t(". لا تُحصّل أي مبالغ.", ". No amount is collected.")}
      </p>}
    </div>
  );
}
export function Bag() {
  const { locale, cart, setCart, products } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  if (!cart.length)
    return (
      <div className="container">
        <PageTitle title={t("سلتك", "Your bag")} />
        <Empty
          illustration={<BagMotion />}
          title={t("مساحة لاختيارك الأول", "Room for your first choice")}
          body={t(
            "اختاري قطعة من المجموعة لتجربة السلة. لا يتم إرسال أي طلب.",
            "Choose a piece to try the bag. No order will be sent.",
          )}
          action={t("اكتشفي العبايات", "Explore the abayas")}
        />
      </div>
    );
  return (
    <div className="container bag-page">
      <PageTitle
        title={t("اختياراتك", "Your chosen pieces")}
        description={t(
          "راجعي القطع والمقاسات. كل ما هنا تجريبي.",
          "Review your pieces and sizes. Everything here is demonstration data.",
        )}
      />
      <div className="bag-layout">
        <div className="bag-lines">
          <BagItems />
          <Link href="/collection/" className="text-link">
            {t("تابعي التصفّح", "Continue browsing")}
            <Icon name="arrow" />
          </Link>
        </div>
        <aside>
          <OrderSummary serverQuote />
          <Link href="/checkout/" className="button full">
            {t("متابعة إلى التجربة", "Continue to demo checkout")}
            <Icon name="arrow" />
          </Link>
          <p className="caption">
            {t(
              "دفع محاكى فقط · لا بيانات بطاقة",
              "Simulation only · No card information",
            )}
          </p>
          <PaymentMethods locale={locale}/>
        </aside>
      </div>
    </div>
  );
}
export function Checkout() {
  const { locale, cart, setCart, products, setOrders, orders } = useShop();
  const [invoiceOpen,setInvoiceOpen]=useState(false);
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [step, setStep] = useState(1);
  const [failure, setFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; total: number } | null>(
    null,
  );
  const [delivery, setDelivery] = useState({
    name: "",
    phone: "",
    address: "",
    consent: false,
  });
  const [invalid, setInvalid] = useState(false);
  const attempt = useRef("");
  const completed = useRef(new Map<string, string>());
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (step > 1 || receipt) heading.current?.focus();
  }, [step, receipt]);
  function review(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInvalid(false);
    setError("");
    setStep(2);
    if (!attempt.current) attempt.current = crypto.randomUUID();
  }
  function pay() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const bill = totals(cart, products);
    timer.current = setTimeout(() => {
      lock.current = false;
      setBusy(false);
      if (failure) {
        setError(
          t(
            "فشلت المحاكاة كما طلبتِ. أوقفي خيار الفشل وأعيدي المحاولة؛ لن يتكرر الطلب التجريبي.",
            "Simulation failed as requested. Turn off the failure option and retry; the demo order will not be duplicated.",
          ),
        );
        return;
      }
      const id = demoReceipt(attempt.current, completed.current);
      setOrders((o) =>
        o.some((x) => x.id === id)
          ? o
          : [
              {
                id,
                total: bill.total,
                createdAt: new Date().toISOString(),
                delivery: bill.delivery,
                method: "demo",
                lines: cart.map(line=>{const item=products.find(p=>p.id===line.id)!;return {productId:item.id,name:[...item.name] as [string,string],size:line.size,quantity:line.quantity,unitPrice:item.price,options:line.options??{}};}),
                count: bill.count,
                paid: true,
                stage: "new",
              },
              ...o,
            ],
      );
      setReceipt({ id, total: bill.total });
      setCart([]);
      setDelivery({ name: "", phone: "", address: "", consent: false });
    }, 650);
  }
  if (receipt)
    return (
      <section className="container confirmation">
        <div className="confirmation-check">
          <Icon name="check" />
        </div>
        <h1 ref={heading} tabIndex={-1}>
          {t("اكتملت التجربة", "Your preview is complete")}
        </h1>
        <p>
          {t(
            "هذا تأكيد محلي فقط. لم يُحصّل مبلغ ولم يُرسل طلب أو إشعار.",
            "This is a local confirmation. No charge, order or notification was sent.",
          )}
        </p>
        <div className="receipt">
          <span>{t("رقم تجريبي", "Demo reference")}</span>
          <bdi>{receipt.id}</bdi>
          <span>{t("إجمالي محاكى", "Simulated total")}</span>
          <Money value={receipt.total} locale={locale} />
        </div>
        <button className="button" onClick={()=>setInvoiceOpen(true)}>{t("عرض الفاتورة وحفظها","View and save invoice")}</button>
        {invoiceOpen&&orders.find(o=>o.id===receipt.id)&&<Dialog wide title={t("فاتورتكِ","Your invoice")} closeLabel={t("إغلاق الفاتورة","Close invoice")} onClose={()=>setInvoiceOpen(false)}><Invoice order={orders.find(o=>o.id===receipt.id)!}/></Dialog>}
        <Link className="button" href="/catalogue/">
          {t("العودة للمجموعة", "Return to collection")}
          <Icon name="arrow" />
        </Link>
        <Link href="/admin/" className="text-link">
          {t(
            "عرض الطلب التجريبي في اللوحة",
            "View the demo order in the dashboard",
          )}
        </Link>
      </section>
    );
  if (!cart.length)
    return (
      <Empty
        title={t("السلة فارغة", "Your bag is empty")}
        body={t(
          "أضيفي قطعة لبدء تجربة الطلب.",
          "Add a piece to start the order demo.",
        )}
        action={t("عرض العبايات", "View abayas")}
      />
    );
  return (
    <section className="container checkout-page">
      <PageTitle
        title={t("جرّبي رحلة الطلب", "Try the order journey")}
        description={t(
          "استخدمي بيانات وهمية فقط. الحقول مؤقتة ولا تُحفظ بعد مغادرة الصفحة أو إرسال المحاكاة.",
          "Use fictional details only. Fields are temporary and are cleared when you leave or finish the simulation.",
        )}
      />
      <ol className="checkout-steps">
        <li aria-current={step === 1 ? "step" : undefined}>
          <b>1</b>
          {t("التوصيل التجريبي", "Demo delivery")}
        </li>
        <li aria-current={step === 2 ? "step" : undefined}>
          <b>2</b>
          {t("المراجعة والمحاكاة", "Review & simulate")}
        </li>
        <li>
          <b>3</b>
          {t("تأكيد محلي", "Local confirmation")}
        </li>
      </ol>
      <div className="bag-layout">
        <div>
          {step === 1 ? (
            <form
              className="delivery-form"
              onSubmit={review}
              onInvalid={() => setInvalid(true)}
            >
              <h2>{t("بيانات توضيحية", "Illustrative details")}</h2>
              <label>
                {t("اسم تجريبي", "Demo name")}
                <input
                  name="demo-name"
                  autoComplete="off"
                  required
                  maxLength={80}
                  value={delivery.name}
                  onChange={(e) =>
                    setDelivery({ ...delivery, name: e.target.value })
                  }
                />
              </label>
              <label>
                {t("هاتف تجريبي", "Demo phone")}
                <input
                  name="demo-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="0500000000"
                  dir="ltr"
                  required
                  pattern="[+]?[0-9]{7,15}"
                  title={t(
                    "أدخلي 7 إلى 15 رقمًا، مع + اختياري",
                    "Use 7–15 digits with an optional leading +",
                  )}
                  value={delivery.phone}
                  onChange={(e) =>
                    setDelivery({ ...delivery, phone: e.target.value })
                  }
                />
              </label>
              <label>
                {t("عنوان وهمي", "Fictional address")}
                <textarea
                  name="demo-address"
                  autoComplete="off"
                  required
                  minLength={5}
                  maxLength={300}
                  value={delivery.address}
                  onChange={(e) =>
                    setDelivery({ ...delivery, address: e.target.value })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  required
                  checked={delivery.consent}
                  onChange={(e) =>
                    setDelivery({ ...delivery, consent: e.target.checked })
                  }
                />
                {t(
                  "أفهم أنها معاينة وأستخدم بيانات وهمية.",
                  "I understand this is a preview and am using fictional details.",
                )}
              </label>
              {invalid && (
                <p role="alert" className="error">
                  {t(
                    "أكملي الحقول المطلوبة وتحققي من تنسيق الهاتف. لا تحتاج التجربة إلى بيانات حقيقية.",
                    "Complete the required fields and check the phone format. Real personal details are not needed.",
                  )}
                </p>
              )}
              <button className="button full" type="submit">
                {t("مراجعة التجربة", "Review demo order")}
                <Icon name="arrow" />
              </button>
            </form>
          ) : (
            <div className="review-panel">
              <h2 ref={heading} tabIndex={-1}>
                {t("كل شيء أمامك", "Everything in view")}
              </h2>
              <p>
                {t(
                  "تُعرض البيانات مؤقتًا في هذه الصفحة فقط. لن تُرسل.",
                  "Details are shown temporarily on this page only. They will not be sent.",
                )}
              </p>
              <dl className="delivery-review">
                <div>
                  <dt>{t("الاسم التجريبي", "Demo name")}</dt>
                  <dd>{delivery.name}</dd>
                </div>
                <div>
                  <dt>{t("الهاتف التجريبي", "Demo phone")}</dt>
                  <dd>
                    <bdi>{delivery.phone}</bdi>
                  </dd>
                </div>
                <div>
                  <dt>{t("العنوان الوهمي", "Fictional address")}</dt>
                  <dd>{delivery.address}</dd>
                </div>
              </dl>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setStep(1)}
              >
                {t("تعديل البيانات", "Edit details")}
              </button>
              <div className="payment-demo">
                <h3>{t("محاكاة الدفع", "Payment simulation")}</h3>
                <p>
                  {t(
                    "لا بوابة دفع ولا حقول بطاقة. زر التجربة ينشئ سجلًا وهميًا في ذاكرة المعاينة.",
                    "No payment gateway or card fields. The simulation creates a fictional record in preview memory.",
                  )}
                </p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={failure}
                    disabled={busy}
                    onChange={(e) => setFailure(e.target.checked)}
                  />
                  {t(
                    "اختبار حالة فشل الدفع المحاكى",
                    "Test a simulated payment failure",
                  )}
                </label>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="button full" disabled={busy} onClick={pay}>
                  {busy
                    ? t("جارٍ تشغيل المحاكاة…", "Running simulation…")
                    : error
                      ? t("إعادة المحاولة محليًا", "Retry locally")
                      : t(
                          "تأكيد الطلب التجريبي — بدون دفع",
                          "Confirm demo order · no payment",
                        )}
                </button>
              </div>
            </div>
          )}
        </div>
        <aside>
          <OrderSummary />
          <Link className="text-link" href="/cart/">
            {t("العودة للسلة", "Back to bag")}
          </Link>
        </aside>
      </div>
    </section>
  );
}
