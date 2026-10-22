"use client";
import { Dialog } from "./Dialog";
import { sizeLabels } from "../lib/size-labels";
import { useShop } from "./Shop";
import { tx } from "../lib/catalog";
import { sourceName, type SourceProduct } from "../lib/source-catalogue";
import {SizeAssistant} from './SizeAssistant';

export function SourceSizeGuide({ product, onClose, value, onSelect }: { product: SourceProduct; onClose: () => void; value?:string; onSelect?:(size:string)=>void }) {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const values = product.optionGroups.filter(group => group.name === "Size").flatMap(group => group.values).filter(value => /^\d+$/.test(value));
  return <Dialog sheet title={t("مساعد اختيار المقاس", "Find your size")} closeLabel={t("إغلاق", "Close")} onClose={onClose}>
    <h3>{sourceName(product, locale)}</h3>
    <SizeAssistant key={product.id} product={product} value={value} onSelect={onSelect}/>
    <details className="fit-guide-details"><summary>{t('دليل المقاسات وطريقة القياس','Size chart & measuring guide')}</summary>
    <p>{t("أرقام المقاسات المنشورة لهذه القطعة", "Published size codes for this piece")}</p>
    {values.length ? <ul className="guide-size-codes" aria-label={t("أرقام المقاسات", "Size codes")}>{values.map(value => <li key={value}><bdi>{value}</bdi></li>)}</ul>
      : <p>{t("لم تُنشر مجموعة مقاسات منظّمة لهذه القطعة.", "No structured sizes were published for this piece.")}</p>}
    <table className="size-measure-table"><caption>{t("جدول المقاسات الجاهزة", "Ready-to-wear size chart")}</caption><thead><tr><th scope="col">{t("المقاس", "Size")}</th><th scope="col">{t("الطول حسب الجدول", "Chart length")}</th></tr></thead><tbody>{Object.entries(sizeLabels).map(([value,label])=><tr key={value}><th scope="row">{label}</th><td><bdi>{value}</bdi></td></tr>)}</tbody></table>
    <p className="caption">{t("اختاري من المقاسات المتاحة لهذه القطعة أعلاه. الجدول المرفق لا يحدد وحدة الطول أو عرض الصدر والكم.", "Choose from this piece’s available sizes above. The supplied chart does not state a length unit, chest width or sleeve measurement.")}</p>
    <h3>{t("كيف تقيسين عباية مناسبة لكِ؟", "How to measure an abaya that fits")}</h3>
    <figure className="size-measuring-figure">
      <svg viewBox="0 0 340 250" role="img" aria-label={t("رسم إرشادي: طول من الكتف للحافة، وعرض الصدر أسفل فتحتَي الكم، وطول على الكم", "Measuring diagram: shoulder to hem, underarm width and sleeve length")}>
        <path d="M140 25 L100 40 L48 116 L76 137 L116 85 L97 225 L243 225 L224 85 L264 137 L292 116 L240 40 L200 25 Q170 55 140 25Z" fill="#dedfdc" stroke="#101b30" strokeWidth="2"/>
        <path d="M170 46 V225" stroke="#a8adaf"/>
        <g stroke="#445a7b" strokeWidth="2"><path d="M315 28V225 M309 28H321 M309 225H321 M116 91H224 M116 85V97 M224 85V97 M98 48L55 111"/></g>
        <g fill="#101b30" fontSize="14" textAnchor="middle"><text x="170" y="80">{t("عرض الصدر", "Chest width")}</text><text x="325" y="135" transform="rotate(90 325 135)">{t("الطول", "Length")}</text><text x="52" y="62">{t("الكم", "Sleeve")}</text></g>
      </svg>
      <figcaption>{t("طريقة القياس · الرسم توضيحي وليس باترونًا للقطعة", "How to measure · illustration, not a garment pattern")}</figcaption>
    </figure>
    <p>{t("ضعي العباية على سطح مستوٍ دون شدّ، وسجّلي القياسات بوحدة واحدة قبل مقارنتها بجدول معتمد.", "Lay the abaya flat without stretching. Record all measurements in one unit before comparing with an approved chart.")}</p>
    <table className="size-measure-table">
      <caption>{t("قياسات القطعة وهي مفرودة، وليست محيط الجسم", "Flat garment measurements, not body circumferences")}</caption>
      <thead><tr><th scope="col">{t("القياس", "Measurement")}</th><th scope="col">{t("طريقة القياس", "How to measure")}</th></tr></thead>
      <tbody>
        <tr><th scope="row">{t("طول العباية", "Abaya length")}</th><td>{t("من أعلى الكتف إلى الحافة السفلية.", "From the top of the shoulder to the bottom hem.")}</td></tr>
        <tr><th scope="row">{t("عرض الصدر", "Chest width")}</th><td>{t("عرض القطعة بين جانبي الصدر أسفل فتحتَي الكم، دون مضاعفة الرقم.", "Across the flat garment from one underarm to the other, without doubling the number.")}</td></tr>
        <tr><th scope="row">{t("طول الكم", "Sleeve length")}</th><td>{t("من درزة الكتف إلى نهاية الكم. موضع الدرزة يختلف بحسب القصّة.", "From the shoulder seam to the sleeve edge. Seam position varies with the cut.")}</td></tr>
        <tr><th scope="row">{t('عرض الساعد','Forearm width')}</th><td>{t('عرض الكم وهو مفرود عند الساعد. موضع القياس والقيمة لكل قطعة بانتظار اعتماد الخياط.','Across the flat sleeve at the forearm. The exact position and piece-specific value await tailor approval.')}</td></tr>
        <tr><th scope="row">{t('فتحة الكم','Cuff opening')}</th><td>{t('عرض فتحة الكم وهي مفرودة، دون مضاعفة الرقم.','Across the flat cuff opening, without doubling the number.')}</td></tr>
      </tbody>
    </table>
    <p className="caption">{t("اختيار المقاس في هذه المعاينة لا يرسل طلبًا أو قياسات. خيار التفصيل المنقول من المصدر لا يثبت أن مقاسات أُرسلت بالفعل.", "Selecting a size in this preview sends no order or measurements. The source’s custom-size wording does not mean measurements were actually sent.")}</p>
    </details>
  </Dialog>;
}
