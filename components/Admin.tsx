"use client";
import {FinancialReport} from "./FinancialReport";
import {Invoice} from "./Invoice";
import {catalogueImage} from "../lib/catalogue-imagery";
import {lineKey} from "../lib/commerce";
import { Money } from "./Money";
import { useRef, useState } from "react";
import { nameOf, money, tx, type Product } from "../lib/catalog";
import { PageTitle, useShop, type Order } from "./Shop";
import { Dialog } from "./Dialog";
import { Icon } from "./Icons";
export function Admin() {
  const { locale, products, setProducts, orders, setOrders, notice, cart } =
    useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const [query,setQuery]=useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formError, setFormError] = useState("");
  const [failSave, setFailSave] = useState(false);
  const order = orders.find((o) => o.id === selected);
  const shown = orders.filter((o) => (filter === "all" || o.stage === filter) && o.id.toLowerCase().includes(query.trim().toLowerCase()));
  const stage = (o: Order) =>
    o.stage === "new"
      ? t("جديد", "New")
      : o.stage === "preparing"
        ? t("قيد التجهيز", "Preparing")
        : t("تم الشحن", "Shipped");
  const stats = [
    { label: t("طلبات تجريبية", "Demo orders"), value: orders.length },
    {
      label: t("بانتظار التجهيز", "Awaiting preparation"),
      value: orders.filter((o) => o.stage === "new").length,
    },
    {
      label: t("مخزون النماذج", "Demo stock"),
      value: products.reduce((s, p) => s + p.stock, 0),
    },
  ];
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    if (failSave) {
      setFormError(
        t(
          "تعذّر الحفظ — فشل محاكى. أوقفي خيار الاختبار ثم أعيدي الحفظ.",
          "Save failed · simulated error. Turn off the test option and save again.",
        ),
      );
      return;
    }
    if (
      !editing.name[0].trim() ||
      !editing.name[1].trim() ||
      !Number.isFinite(editing.price) ||
      editing.price <= 0 ||
      editing.price > 100000 ||
      !Number.isSafeInteger(editing.stock) ||
      editing.stock < 0 ||
      editing.stock > 999
    ) {
      setFormError(
        t(
          "تحققي من الاسمين والسعر والمخزون.",
          "Check both names, price and stock.",
        ),
      );
      return;
    }
    setProducts(products.map((p) => (p.id === editing.id ? editing : p)));
    setEditing(null);
    notice(
      t(
        "حُفظ النموذج محليًا في هذا المتصفح",
        "Study saved locally in this browser",
      ),
    );
  }
  return (
    <section className="admin-page container">
      <div className="admin-demo notice">
        {t(
          "لوحة هاتف تجريبية مفتوحة · ليست نظام إدارة محميًا · لا توجد بيانات عميلات أو إشعارات حقيقية",
          "Open mobile dashboard demo · Not authenticated administration · No real customers or notifications",
        )}
      </div>
      <PageTitle
        title={t("مساحة أولّا", "Aulla workspace")}
        description={t(
          "نظرة واضحة على الطلبات والقطع. بيانات تجريبية محفوظة على هذا المتصفح فقط.",
          "A clear view of orders and pieces. Demo data saved on this browser only.",
        )}
      />
      <div className="admin-stats">
        {stats.map((s) => (
          <div key={s.label}>
            <span>{s.label}</span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>
      <div
        className="admin-tabs"
        aria-label={t("أقسام لوحة الإدارة", "Dashboard sections")}
      >
        {[
          ["orders", "الطلبات", "Orders"],
          ["finance", "التحليل المالي", "Financial overview"],
          ["products", "المنتجات", "Products"],
          ["bag", "اختيارات السلة", "Bag selections"],
          ["connections", "الربط", "Connections"],
          ["settings", "الإعدادات", "Settings"],
        ].map(([id, ar, en]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {t(ar, en)}
          </button>
        ))}
      </div>
      {tab === "orders" && (
        <>
          <div className="section-heading">
            <h2>{t("الطلبات التجريبية", "Demo orders")}</h2>
            <label>
              {t("الحالة", "Status")}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t("الكل", "All")}</option>
                <option value="new">{t("جديد", "New")}</option>
                <option value="preparing">
                  {t("قيد التجهيز", "Preparing")}
                </option>
                <option value="shipped">{t("تم الشحن", "Shipped")}</option>
              </select>
            </label>
          </div>
          <div className="admin-search"><label htmlFor="order-search">{t("البحث برقم الطلب", "Search by order number")}</label><div><input id="order-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="DEMO-1042"/><span role="status">{shown.length} {t("طلبات","orders")}</span></div></div>
          <div className="admin-orders" key={filter}>
            {shown.map((o) => (
              <button
                className="admin-order"
                key={o.id}
                onClick={() => setSelected(o.id)}
              >
                <div>
                  <bdi>{o.id}</bdi>
                  <span>
                    {o.count}{" "}
                    {t("قطع · بيانات وهمية", "pieces · Fictional data")}
                  </span>
                </div>
                <div>
                  <span
                    className={"status-chip " + (o.paid ? "paid" : "pending")}
                  >
                    {o.paid
                      ? t("دفع محاكى: مكتمل", "Simulated payment: complete")
                      : t("دفع محاكى: معلّق", "Simulated payment: pending")}
                  </span>
                  <span>{stage(o)}</span>
                </div>
                <div>
                  <Money value={o.total} locale={locale} />
                  <Icon name="chevron" />
                </div>
              </button>
            ))}
          </div>
          {!shown.length && (
            <p className="empty">
              {t("لا توجد طلبات تطابق البحث والحالة.", "No orders match this search and status.")}
            </p>
          )}
          <p className="caption">
            {t(
              "حالة الدفع مستقلة عن حالة التجهيز. لا يتم تحصيل أو رد أي مبلغ.",
              "Payment and fulfilment states are separate. No amount is collected or refunded.",
            )}
          </p>
        </>
      )}
      {tab === "finance" && <FinancialReport/>}
      {tab === "products" && (
        <>
          <div className="section-heading">
            <h2>{t("قطع المعاينة", "Preview pieces")}</h2>
            <span>
              {products.length} {t("نماذج", "studies")}
            </span>
          </div>
          <div className="admin-products">
            {products.map((p) => (
              <article key={p.id}>
                <img
                  src={p.source?catalogueImage(p.id):`/placeholders/${p.tone}-front.svg`}
                  width="800"
                  height="1000"
                  alt={nameOf(p,locale)}
                />
                <div>
                  <h3>{nameOf(p, locale)}</h3>
                  <p>
                    <Money value={p.price} locale={locale} /> · {p.stock}{" "}
                    {t("بالمخزون التجريبي", "in demo stock")}
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setEditing({ ...p, name: [...p.name] });
                    setFormError("");
                    setFailSave(false);
                  }}
                >
                  {t("تعديل", "Edit")}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "bag" && <section className="admin-selection-panel"><h2>{t("اختيارات هذه المعاينة", "Selections in this preview")}</h2><p className="caption">{t("هذه سلة المتصفح الحالي، وليست طلبات عميلات أو سلالًا مباشرة.", "This browser’s bag, not customer orders or live shopping activity.")}</p>{cart.length===0?<p className="notice">{t("لم تُضف قطع إلى السلة بعد.", "No pieces in the bag yet.")}</p>:cart.map(line=>{const item=products.find(p=>p.id===line.id);return item&&<article className="admin-selection-row" key={lineKey(line)}><div><h3>{nameOf(item,locale)}</h3><p>{t("المقاس", "Size")}: <bdi>{line.size}</bdi> · {Object.values(line.options??{}).join(" · ")}</p><small>{t("الكمية", "Quantity")}: {line.quantity}</small></div><Money value={item.price*line.quantity} locale={locale}/></article>})}</section>}
      {tab === "connections" && <section className="admin-connections"><h2>{t("قنوات المتجر", "Store connections")}</h2><p className="caption">{t("حالة الإعداد الفعلية؛ لا إرسال أو دفع من المعاينة.", "Actual setup status; no messages or payments from this preview.")}</p><div className="connection-grid">{[
        ["WhatsApp Business",t("بانتظار رقم الأعمال", "Awaiting business number"),t("يُضاف رابط التواصل بعد توفير الرقم. التنبيهات الآلية تحتاج ربطًا منفصلًا.", "A contact link can be added once a number is available. Automated notifications require a separate integration.")],
        ["Instagram",t("الحساب غير مربوط", "Account not connected"),t("عرض المنشورات تلقائيًا ينتظر تفويض حساب المتجر.", "Automatic media display awaits store account authorization.")],
        ["Ziina",t("الدفع غير مفعّل", "Payments inactive"),t("بانتظار التحقق من أهلية الحساب وإعداد الربط في الخادم.", "Awaiting account eligibility verification and server integration.")]
      ].map(([name,status,description])=><article className="connection-card" key={name}><h3 dir="ltr">{name}</h3><span className="connection-status">{status}</span><p>{description}</p></article>)}</div></section>}
      {tab === "settings" && (
        <div className="settings-panel">
          <h2>{t("إعدادات المعاينة", "Preview settings")}</h2>
          <dl>
            <div>
              <dt>{t("الدفع", "Payment")}</dt>
              <dd>{t("محاكاة محلية فقط", "Local simulation only")}</dd>
            </div>
            <div>
              <dt>{t("التنبيهات والبريد", "Push & email")}</dt>
              <dd>{t("غير مفعّلين · لا إرسال", "Inactive · No sending")}</dd>
            </div>
            <div>
              <dt>{t("الصور والشعار", "Photos & logo")}</dt>
              <dd>
                {t(
                  "صور مرجعية بإذن · بدائل التجربة معلّمة",
                  "Permissioned references · Labelled demo artwork",
                )}
              </dd>
            </div>
            <div>
              <dt>{t("البيانات", "Data")}</dt>
              <dd>
                {t(
                  "طلبات ومخزون تجريبي في تخزين المتصفح",
                  "Demo orders and stock in browser storage",
                )}
              </dd>
            </div>
          </dl>
          <p>
            {t(
              "الربط الفعلي يحتاج صلاحيات وخادمًا وسياسات وصورًا معتمدة. لا يتم طلب إذن إشعارات من الجهاز في هذه المعاينة.",
              "Real integration requires authorization, a server, and approved policies and imagery. This preview does not request device notification permission.",
            )}
          </p>
        </div>
      )}
      {order && (
        <Dialog
          title={order.id + " · " + t("طلب تجريبي", "Demo order")}
          closeLabel={t("إغلاق الطلب", "Close order")}
          onClose={() => setSelected(null)}
        >
          <div className="order-detail">
            <p className="notice">
              {t(
                "لا توجد هوية عميلة أو عنوان حقيقي. هذا السجل لتجربة الإدارة فقط.",
                "No real customer identity or address. This record is only for trying the dashboard.",
              )}
            </p>
            <dl>
              <div>
                <dt>{t("الإجمالي", "Total")}</dt>
                <dd>
                  <Money value={order.total} locale={locale} />
                </dd>
              </div>
              <div>
                <dt>{t("حالة الدفع المحاكى", "Simulated payment")}</dt>
                <dd>
                  {order.paid ? t("مكتمل", "Complete") : t("معلّق", "Pending")}
                </dd>
              </div>
            </dl>
            <Invoice order={order}/>
            <div className="form-pair admin-costs">
              <label>{t("التكلفة الكاملة التجريبية (درهم)", "Full demo cost (AED)")}<input key={order.id+"cost"} type="number" min="0" max="10000000" step="0.01" defaultValue={order.cost??""} onBlur={e=>{const value=e.currentTarget.value,amount=Number(value);if(value===""||(Number.isFinite(amount)&&amount>=0&&amount<=10000000))setOrders(list=>list.map(x=>x.id===order.id?{...x,cost:value===""?undefined:amount}:x));else notice(t("أدخلي تكلفة صحيحة.","Enter a valid cost."));}}/></label>
              <label>{t("استرداد تجريبي (درهم)", "Demo refund (AED)")}<input key={order.id+"refund"} type="number" min="0" max={order.total} step="0.01" disabled={!order.paid} defaultValue={order.refunded??0} onBlur={e=>{const amount=Number(e.currentTarget.value);if(Number.isFinite(amount)&&amount>=0&&amount<=order.total)setOrders(list=>list.map(x=>x.id===order.id?{...x,refunded:amount}:x));else notice(t("الاسترداد لا يتجاوز إجمالي الطلب.","Refund cannot exceed the order total."));}}/></label>
            </div>
            <label>
              {t("حالة التجهيز التجريبية", "Demo fulfilment status")}
              <select
                value={order.stage}
                onChange={(e) =>
                  setOrders((o) =>
                    o.map((x) =>
                      x.id === order.id
                        ? { ...x, stage: e.target.value as Order["stage"] }
                        : x,
                    ),
                  )
                }
              >
                <option value="new">{t("جديد", "New")}</option>
                <option value="preparing">
                  {t("قيد التجهيز", "Preparing")}
                </option>
                <option value="shipped">{t("تم الشحن", "Shipped")}</option>
              </select>
            </label>
            <p>
              {t(
                "تغيير الحالة محلي ولا يرسل تنبيهًا.",
                "Changing status is local and sends no notification.",
              )}
            </p>
          </div>
        </Dialog>
      )}
      {editing && (
        <Dialog
          title={t("تعديل نموذج تجريبي", "Edit demo study")}
          closeLabel={t("إغلاق التعديل", "Close editor")}
          onClose={() => setEditing(null)}
        >
          <form className="admin-form" onSubmit={save}>
            <p>
              {t(
                "التعديلات محفوظة محليًا لهذا المتصفح، وليست مخزونًا مباشرًا.",
                "Changes are saved locally in this browser, not in live inventory.",
              )}
            </p>
            <label>
              {t("الاسم العربي", "Arabic name")}
              <input
                lang="ar"
                dir="rtl"
                required
                maxLength={70}
                value={editing.name[0]}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: [e.target.value, editing.name[1]],
                  })
                }
              />
            </label>
            <label>
              {t("الاسم الإنجليزي", "English name")}
              <input
                lang="en"
                dir="ltr"
                required
                maxLength={70}
                value={editing.name[1]}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: [editing.name[0], e.target.value],
                  })
                }
              />
            </label>
            <div className="form-pair">
              <label>
                {t("السعر التجريبي بالدرهم", "Demo price in UAE dirhams")}
                <input
                  type="number"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  required
                  value={editing.price}
                  onChange={(e) =>
                    setEditing({ ...editing, price: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {t("المخزون التجريبي", "Demo stock")}
                <input
                  type="number"
                  min="0"
                  max="999"
                  step="1"
                  required
                  value={editing.stock}
                  onChange={(e) =>
                    setEditing({ ...editing, stock: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <p className="caption">
              {t(
                "الصور والخامة غير قابلة للاستبدال هنا؛ صور التجربة والخامة بانتظار الربط بمنتجات معتمدة.",
                "Demo photos and material fields await mapping to approved products.",
              )}
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={failSave}
                onChange={(e) => setFailSave(e.target.checked)}
              />
              {t("اختبار فشل الحفظ", "Test save failure")}
            </label>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <button type="submit" className="button full">
              {t("حفظ في المعاينة", "Save in preview")}
            </button>
          </form>
        </Dialog>
      )}
    </section>
  );
}
