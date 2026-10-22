"use client";
import Link from "next/link";
import { PageTitle, useShop } from "./Shop";
import { tx } from "../lib/catalog";
import {FitGuide} from './FitGuide';
export function Information({
  kind,
}: {
  kind: "about" | "policies" | "guide";
}) {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const content = {
    about: {
      title: t("مساحة جديدة لأولّا", "A new space for Aulla"),
      lead: t(
        "عبايات أولّا، بألوانها وتفاصيلها، في تجربة تجمع العربية والإنجليزية.",
        "Aulla abayas, their colours and their details, in an Arabic and English shopping experience.",
      ),
      body: t(
        "تصفحي القطع، قارني الألوان، وراجعي الصور الأصلية داخل صفحة كل عباية. النسخة الحالية للاختبار المحلي فقط.",
        "Browse the pieces, compare colours and open each abaya’s original photographs. This version is for testing only.",
      ),
    },
    policies: {
      title: t("قبل الطلب", "Before you order"),
      lead: t(
        "لا طلبات حقيقية في هذه المعاينة.",
        "There are no real orders in this preview.",
      ),
      body: t(
        "التجهيز والشحن والاستبدال وسياسة الخصوصية التشغيلية بانتظار اعتماد المالكة. استخدمي بيانات اختبار فقط: السلة والمفضلة واللغة تحفظ في المتصفح، وإرسال نموذج الدفع ينشئ طلب اختبار في قاعدة البيانات المحلية. لا دفع حي ولا رسائل حقيقية.",
        "Lead times, shipping, exchanges and the operational privacy policy await owner approval. Use test details only: your bag, favourites and language are saved in your browser. Submitting checkout creates a test order in the test database. No live payment or real messages are enabled.",
      ),
    },
    guide: {
      title: t("دليل القياس", "Measurement guide"),
      lead: t(
        "القياس الصحيح يبدأ بجدول معتمد.",
        "The right fit starts with an approved chart.",
      ),
      body: t(
        "جدولا المقاسات المرفقان مختلفان في عرض الصدر ولم يُعتمدا بعد. يمكنك قياس عباية مناسبة على سطح مستوٍ وتسجيل الطول وعرض الصدر وطول الكم، ثم المقارنة بجدول المتجر بعد اعتماده. الخيارات 50 إلى 60 في المعاينة للتجربة فقط، وليست توصية مقاس. لا يوجد نموذج تفصيل يجمع قياسات شخصية هنا.",
        "The supplied size charts disagree on chest widths and are not approved yet. Measure a well-fitting abaya flat, noting length, chest width and sleeve length, then compare with the store’s chart once approved. Preview options 50–60 are illustrative, not a sizing recommendation. This preview does not collect personal measurements.",
      ),
    },
  }[kind];
  if(kind==='guide')return <FitGuide/>;
  return (
    <section className="container information-page">
      <PageTitle title={content.title} />
      <p className="information-lead">{content.lead}</p>
      {kind === "policies" && <p>{t("تُرسل القطع معًا عند جاهزية آخر قطعة. رسوم الشحن والمواعيد النهائية بانتظار الاعتماد؛ قيمة الشحن في الاختبار صفر.", "Pieces ship together when the last piece is ready. Shipping fees and final lead times await approval; test shipping is zero.")}</p>}
      <p>{content.body}</p>
      <Link href="/collection/" className="button">
        {t("اكتشفي المعاينة", "Explore the preview")}
      </Link>
    </section>
  );
}
