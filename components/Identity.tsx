"use client";
import { useShop, PageTitle } from "./Shop";
import { tx } from "../lib/catalog";
import { Brand } from "./Brand";
import { PersonaStudy } from "./PersonaStudy";
const variants = [
  [
    "aulla-horizontal-olive.png",
    "الشعار الكتابي الأفقي",
    "Horizontal script lockup",
  ],
  ["aulla-ad-navy.png", "الرمز مع الاسم · كحلي", "AD lockup · navy"],
  [
    "aulla-ad-ink-paper.png",
    "نسخة أحادية على خلفية فاتحة",
    "Monochrome light lockup",
  ],
  ["aulla-ad-reverse-navy.png", "نسخة معكوسة بيضاء", "White reverse lockup"],
  [
    "aulla-ad-symbol-paper.png",
    "الرمز المستقل · الأيقونة",
    "Standalone AD symbol",
  ],
];
export function MotionStudy({ storefront = false }: { storefront?: boolean }) {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  return (
    <section className="motion-study">
      <div>
        <h2>{t("فيديو تفاصيل عباية طيف", "Taif abaya detail video")}</h2>
        <p>
          {t(
            "مقطع صامت مدته ٨ ثوانٍ من صور طيف الأصلية. اضغطي التشغيل لمشاهدة القطعة وتفاصيل الدانتيل. المقطع يحرك صورًا ثابتة، وليس تصويرًا للعباية أثناء الحركة.",
            "An 8-second silent sequence of Taif’s original photographs. Play to see the piece and its lace details. This animates still photographs; it is not footage of the moving garment.",
          )}
        </p>
      </div>
      <video
        className="vertical-video"
        controls
        playsInline
        preload="none"
        poster="/motion/taif-poster.png"
        width="1080"
        height="1920"
        aria-label={t(
          "موشن أولّا · ٨ ثوانٍ دون صوت",
          "Aulla motion study · 8 seconds, silent",
        )}
      >
        <source src="/motion/aulla-taif-vertical.mp4" type="video/mp4" />
        {t("متصفحك لا يدعم الفيديو.", "Your browser does not support video.")}
      </video>
      <div className="motion-downloads">
        <a className="text-link" href="/collection/knwEQbiwWA9RLQ6QirLB/">{t("صور طيف والمقاسات المتاحة", "Taif photos & available sizes")}</a>
        {!storefront && <>
        <a
          className="text-link"
          href="/motion/aulla-taif-vertical.mp4"
          download
        >
          {t("تنزيل الموشن العمودي", "Download vertical motion")}
        </a>
        <a
          className="text-link"
          href="/motion/aulla-reference-motion.mp4"
          download
        >
          {t(
            "تنزيل الدراسة الأفقية المرجعية",
            "Download horizontal reference study",
          )}
        </a>
        </>}
      </div>
    </section>
  );
}
export function Identity() {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  return (
    <section className="container identity-page">
      <PageTitle title={t("هوية أولّا", "Aulla identity")} />
      <PersonaStudy />
      <div className="identity-current">
        <div><Brand /><p>{t("حروف AD المرسلة · تتبّع متجهي لحدود الرسم الأصلي، دون إعادة تصميم الحروف. دقة الحدود محدودة بالصورة المرفقة؛ ليست ملف الشعار المتجهي الأصلي.", "Your supplied AD lettering · vector contours traced from the original raster, without redesigning the letters. Contour precision is limited by that image; this is not the original vector master.")}</p></div>
        <div className="identity-inverse"><Brand footer /></div>
        <a className="text-link" href="/brand/aulla-ad-original-v3-symbol.svg" download>{t("تنزيل حروف AD المرسلة · SVG", "Download supplied AD lettering · SVG")}</a>
        <a className="text-link" href="/brand/aulla-ad-original-v3-lockup.svg" download>{t("تنزيل الحروف مع الاسم الأصلي · SVG", "Download lettering with original name · SVG")}</a>
      </div>
      <p className="source-intro">
        {t(
          "نسخ PNG مُعاد توليدها من الشعارين المرفقين. الأصول الأصلية محفوظة؛ هذه إعادة رسم بالصور وليست ملفات شعار متجهية أصلية. الخط العربي في الواجهة: ثمانية المثبت محليًا.",
          "PNG reconstructions of the two supplied logos. Originals are preserved; these are image reconstructions, not original vector masters. The interface uses locally installed Thmanyah Arabic type.",
        )}
      </p>
      <div className="brand-grid">
        {variants.map(([file, ar, en]) => (
          <figure key={file}>
            <div className={file.includes("olive") ? "brand-paper" : ""}>
              <img
                src={`/brand/${file}`}
                alt={t(ar, en)}
                width="1254"
                height="1254"
              />
            </div>
            <figcaption>
              <h2>{t(ar, en)}</h2>
              <a className="text-link" href={`/brand/${file}`} download>
                {t("تنزيل PNG", "Download PNG")}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      <MotionStudy />
    </section>
  );
}
