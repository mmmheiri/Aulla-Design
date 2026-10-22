"use client";
import {useState} from "react";
import {useShop} from "./Shop";
import {tx} from "../lib/catalog";
import {Money} from "./Money";
import {financialSummary} from "../lib/preview-admin";
export function FinancialReport(){
 const {locale,orders}=useShop(), t=(ar:string,en:string)=>tx(locale,ar,en);
 const [period,setPeriod]=useState("all");
 const cutoff=Date.now()-Number(period)*86400000;
 const shown=orders.filter(o=>period==="all"||(o.createdAt&&Date.parse(o.createdAt)>=cutoff));
 const data=financialSummary(shown),undated=orders.filter(o=>!o.createdAt).length;
 return <section className="admin-finance"><div className="section-heading"><h2>{t("التحليل المالي","Financial overview")}</h2><label>{t("الفترة","Period")}<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">{t("كل السجلات","All records")}</option><option value="7">{t("آخر ٧ أيام","Last 7 days")}</option><option value="30">{t("آخر ٣٠ يومًا","Last 30 days")}</option></select></label></div>
 <p className="caption">{t("بيانات محلية تجريبية، وليست إيرادات فعلية. السجلات القديمة بلا تاريخ تظهر في «كل السجلات» فقط.","Local demo data, not actual revenue. Older undated records appear under All records only.")} {undated>0&&t(`سجلات بلا تاريخ: ${undated}`,`Undated records: ${undated}`)}</p>
 <div className="finance-grid">{[[t("إجمالي الطلبات","Order total"),data.total],[t("مدفوع محاكى","Simulated paid"),data.paid],[t("معلّق","Pending"),data.pending],[t("متوسط الطلب","Average order"),data.average],[t("استردادات محاكاة","Simulated refunds"),data.refunds],[t("الصافي بعد الاسترداد","Net after refunds"),data.net]].map(([label,value])=><article key={String(label)}><span>{label}</span><strong><Money value={Number(value)} locale={locale}/></strong></article>)}</div>
 <p className="notice">{data.profit===null?t("الربح غير متاح؛ أدخلي التكلفة الكاملة لكل طلب مدفوع، بما يشمل القطعة والشحن والرسوم.","Profit unavailable: enter the full cost of each paid order, including garment, shipping and fees."):<>{t("ربح تقديري تجريبي بعد التكاليف المدخلة","Estimated demo profit after entered costs")}: <Money value={data.profit} locale={locale}/></>}</p>
 <div className="finance-breakdown">{shown.map(o=><div key={o.id}><bdi title={o.id}>{o.id.length>18?o.id.slice(0,13)+"…":o.id}</bdi><meter min={0} max={Math.max(1,...shown.map(x=>x.total))} value={o.total} aria-label={o.id}/><Money value={o.total} locale={locale}/></div>)}</div>
 {!shown.length&&<p className="empty">{t("لا توجد طلبات في هذه الفترة.","No orders in this period.")}</p>}
 </section>;
}
