"use client";
import { Money } from "./Money";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { nameOf, money, sizes, tx, type Product } from "../lib/catalog";
import { normalizeCart } from "../lib/commerce";
import { useShop } from "./Shop";
import { ProductCard } from "./Storefront";
import { Icon } from "./Icons";
import { Dialog } from "./Dialog";
function Gallery({ product: p }: { product: Product }) {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const down = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const labels = [
    t("الأمام — رسم بديل", "Front · placeholder"),
    t("الخلف — رسم بديل", "Back · placeholder"),
    t("تفاصيل الخامة — بانتظار الصورة", "Fabric detail · photo pending"),
  ];
  const src = `/placeholders/${p.tone}-${index === 1 ? "back" : "front"}.svg`;
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imageRef.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src, retry]);
  const move = (delta: number) => {
    setIndex((i) => (i + delta + 3) % 3);
    setFailed(false);
  };
  return (
    <div className="gallery">
      <div
        className={"gallery-stage tone-" + p.tone}
        onTouchStart={(e) => {
          down.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          dragged.current = false;
        }}
        onTouchEnd={(e) => {
          if (down.current) {
            const dx = e.changedTouches[0].clientX - down.current.x;
            const dy = e.changedTouches[0].clientY - down.current.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
              dragged.current = true;
              move((dx < 0 ? 1 : -1) * (locale === "ar" ? -1 : 1));
            }
            down.current = null;
          }
        }}
      >
        <span className="gallery-label">
          {t("معاينة توضيحية", "Illustrative preview")}
        </span>
        {index === 2 ? (
          <div className="detail-pending">
            <Icon name="zoom" />
            <h2>
              {t("الخامة تُرى. لا تُخمن.", "Fabric is seen, not guessed.")}
            </h2>
            <p>
              {t(
                "هذه المساحة لصورة مقرّبة للقطعة الفعلية بعد اعتمادها. لا توجد صورة خامة أو تطريز معتمدة حاليًا.",
                "This space is reserved for a close-up of the actual piece once approved. No verified fabric or embroidery photo is available yet.",
              )}
            </p>
          </div>
        ) : failed ? (
          <div className="media-fallback" role="status">
            <p>{t("تعذّر تحميل الصورة", "The image could not load")}</p>
            <button
              className="button secondary"
              onClick={() => {
                setFailed(false);
                setRetry((r) => r + 1);
              }}
            >
              {t("إعادة المحاولة", "Try again")}
            </button>
          </div>
        ) : (
          <button
            className="gallery-image"
            aria-label={t("تكبير الرسم البديل", "Enlarge placeholder")}
            onClick={(event) => {
              if (event.detail === 0 || !dragged.current) {
                setZoom(true);
                setEnlarged(false);
              }
              dragged.current = false;
            }}
          >
            <img
              ref={imageRef}
              key={src + retry}
              src={src}
              alt={
                labels[index] +
                t("؛ ليس صورة المنتج الفعلي", "; not an actual product photo")
              }
              width="800"
              height="1000"
              onError={() => setFailed(true)}
            />
            <span className="zoom-hint">
              <Icon name="zoom" />
              {t("انقري للتكبير", "Tap to enlarge")}
            </span>
          </button>
        )}
        <div className="gallery-controls">
          <button
            className="icon-button"
            onClick={() => move(-1)}
            aria-label={t("الصورة السابقة", "Previous image")}
          >
            <Icon
              name="chevron"
              style={{ transform: locale === "ar" ? "none" : "rotate(180deg)" }}
            />
          </button>
          <span aria-live="polite">
            <bdi dir="ltr">{index + 1} / 3</bdi>
          </span>
          <button
            className="icon-button"
            onClick={() => move(1)}
            aria-label={t("الصورة التالية", "Next image")}
          >
            <Icon
              name="chevron"
              style={{ transform: locale === "ar" ? "rotate(180deg)" : "none" }}
            />
          </button>
        </div>
      </div>
      <div className="thumbnails" aria-label={t("صور القطعة", "Piece images")}>
        {labels.map((label, i) => (
          <button
            key={i}
            aria-label={label}
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
              setFailed(false);
            }}
            className={i === index ? "active" : ""}
          >
            {i === 2 ? (
              <span>
                <Icon name="zoom" />
                {t("التفاصيل", "Detail")}
              </span>
            ) : (
              <img
                src={`/placeholders/${p.tone}-${i === 1 ? "back" : "front"}.svg`}
                alt=""
                width="800"
                height="1000"
              />
            )}
            <small>
              {i === 0
                ? t("أمام", "Front")
                : i === 1
                  ? t("خلف", "Back")
                  : t("قريبًا", "Pending")}
            </small>
          </button>
        ))}
      </div>
      <p className="caption">
        {t(
          "اسحبي للتنقل أو استخدمي الأزرار · رسومات بديلة وليست نماذج ثلاثية الأبعاد",
          "Swipe or use the controls · Placeholders, not 3D models",
        )}
      </p>
      {zoom && (
        <Dialog
          title={t("عرض مكبّر — رسم بديل", "Enlarged view · placeholder")}
          closeLabel={t("إغلاق التكبير", "Close enlarged view")}
          onClose={() => setZoom(false)}
          wide
        >
          <div className="zoom-toolbar">
            <button
              className="button secondary"
              aria-pressed={enlarged}
              onClick={() => setEnlarged(!enlarged)}
            >
              <Icon name={enlarged ? "minus" : "plus"} />
              {enlarged
                ? t("ملاءمة الصورة", "Fit image")
                : t("تكبير 180٪", "Zoom to 180%")}
            </button>
            <p>
              {t(
                "يمكن تمرير الصورة بعد التكبير",
                "Scroll the image after zooming",
              )}
            </p>
          </div>
          <div className="zoom-viewport">
            <img
              src={src}
              className={enlarged ? "enlarged" : ""}
              width="800"
              height="1000"
              alt={labels[index]}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
export function ProductDetail({ id }: { id: string }) {
  const { locale, products, cart, setCart, saved, toggleSave, notice, openBag } =
    useShop();
  const p = products.find((p) => p.id === id)!;
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState(false);
  const [returnPath, setReturnPath] = useState("/preview/catalogue/");
  const sizeField = useRef<HTMLFieldSetElement>(null);
  const inBag = cart
    .filter((l) => l.id === p.id)
    .reduce((s, l) => s + l.quantity, 0);
  const remaining = Math.max(0, p.stock - inBag);
  useEffect(() => {
    try {
      const path = sessionStorage.getItem("aulla-list-return");
      if (path?.startsWith("/preview/catalogue/")) setReturnPath(path);
    } catch {}
  }, []);
  function add() {
    if (!size) {
      setError(t("اختاري المقاس التجريبي أولًا.", "Choose a demo size first."));
      sizeField.current?.querySelector("button")?.focus();
      return;
    }
    if (quantity > remaining || quantity < 1) {
      setError(
        t(
          "الكمية المطلوبة تتجاوز المخزون التجريبي المتبقي.",
          "The quantity exceeds the remaining demo stock.",
        ),
      );
      return;
    }
    setCart((c) =>
      normalizeCart([...c, { id: p.id, size, quantity }], products),
    );
    setError("");
    openBag();
    notice(t("أُضيفت إلى السلة التجريبية", "Added to your demo bag"));
  }
  return (
    <div className="container product-page">
      <nav className="breadcrumbs" aria-label={t("مسار الصفحة", "Breadcrumb")}>
        <Link href={returnPath} scroll={false}>
          {t("العبايات", "Abayas")}
        </Link>
        <span>/</span>
        <span>{nameOf(p, locale)}</span>
      </nav>
      <div className="product-layout">
        <Gallery product={p} />
        <section className="product-info">
          <div className="product-title-row">
            <h1>{nameOf(p, locale)}</h1>
            <button
              className={
                "icon-button " + (saved.includes(id) ? "selected" : "")
              }
              aria-label={t("حفظ القطعة", "Save piece")}
              aria-pressed={saved.includes(id)}
              onClick={() => toggleSave(id)}
            >
              <Icon name="heart" />
            </button>
          </div>
          <div className="pdp-price">
            <Money value={p.price} locale={locale} />
            <span>{t("سعر تجريبي", "Demo price")}</span>
          </div>
          <p className="product-description">
            {t(
              "نموذج لتجربة اختيار العباية. الرسم والاسم والخيارات لا تمثّل قطعة فعلية من المتجر. ستُضاف الصور والمعلومات الحقيقية بعد اعتمادها.",
              "A study for trying the abaya selection experience. The illustration, name and options do not represent an actual store item. Approved photos and product information will replace them.",
            )}
          </p>
          <p className="availability">
            {p.stock > 0
              ? t(
                  `متاح للمعاينة · ${remaining} قطع متبقية في المخزون التجريبي`,
                  `Available to try · ${remaining} left in demo stock`,
                )
              : t(
                  "غير متاح — حالة مخزون تجريبية",
                  "Unavailable · demo stock state",
                )}
          </p>
          <fieldset
            ref={sizeField}
            className="size-selector"
            aria-describedby={error ? "selection-error" : undefined}
          >
            <legend>
              {t("المقاس — خيارات تجريبية", "Size · demo options")}
            </legend>
            <div className="size-buttons">
              {sizes.map((s) => (
                <button
                  key={s}
                  aria-pressed={size === s}
                  className={size === s ? "active" : ""}
                  onClick={() => {
                    setSize(s);
                    setError("");
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            className="text-link guide-link"
            onClick={() => setGuide(true)}
          >
            {t("كيف آخذ قياساتي؟", "How do I take my measurements?")}
          </button>
          <div className="purchase-row">
            <div className="quantity-control">
              <button
                className="icon-button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity === 1}
                aria-label={t("تقليل الكمية", "Decrease quantity")}
              >
                <Icon name="minus" />
              </button>
              <output aria-label={t("الكمية", "Quantity")}>{quantity}</output>
              <button
                className="icon-button"
                onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
                disabled={quantity >= remaining}
                aria-label={t("زيادة الكمية", "Increase quantity")}
              >
                <Icon name="plus" />
              </button>
            </div>
            <button className="button" disabled={remaining === 0} onClick={add}>
              <Icon name="bag" />
              {remaining === 0
                ? t("غير متاح", "Unavailable")
                : t("أضيفي إلى السلة التجريبية", "Add to demo bag")}
            </button>
          </div>
          {error && (
            <p id="selection-error" role="alert" className="error">
              {error}
            </p>
          )}
          <button type="button" className="text-link to-bag" onClick={openBag}>
            {t("عرض السلة", "View bag")}
            <Icon name="arrow" />
          </button>
          <div className="product-accordions">
            <details open>
              <summary>{t("الخامة والتفاصيل", "Material & details")}</summary>
              <p>
                {t(
                  "لم تُعتمد بيانات خامة لهذه القطعة التجريبية. لا تستدلّي على اللون أو الملمس من الرسم البديل.",
                  "No material information has been approved for this demo piece. Do not infer colour or texture from the placeholder.",
                )}
              </p>
            </details>
            <details>
              <summary>{t("العناية والقياس", "Care & sizing")}</summary>
              <p>
                {t(
                  "تعليمات العناية وجدول القياسات الفعلي بانتظار صاحبة المتجر. خيارات المقاس أعلاه للتجربة فقط.",
                  "Care instructions and the actual size chart await the owner’s approval. Sizes above are for demonstration only.",
                )}
              </p>
            </details>
            <details>
              <summary>
                {t(
                  "التجهيز والتوصيل والاستبدال",
                  "Preparation, delivery & exchanges",
                )}
              </summary>
              <p>
                {t("لا تنشئ المعاينة طلبات حقيقية. رسوم التجربة: ", "This preview creates no real orders. Demo delivery is ")}
                <Money value={25} locale={locale} />{t("، ومجانية من ", ", free from ")}<Money value={600} locale={locale} />
                {t(". المدة والسياسات الفعلية غير معتمدة هنا.", ". Actual lead times and policies have not been approved here.")}
              </p>
              <Link href="/policies/" className="text-link">
                {t("تفاصيل المعاينة", "Preview details")}
              </Link>
            </details>
          </div>
        </section>
      </div>
      <section className="related">
        <div className="section-heading">
          <h2>{t("مساحة لاختيارات أخرى", "Room for another choice")}</h2>
          <Link className="text-link" href="/preview/catalogue/">
            {t("جميع القطع", "All pieces")}
            <Icon name="arrow" />
          </Link>
        </div>
        <div className="product-grid home-grid">
          {products
            .filter((x) => x.id !== id)
            .slice(0, 3)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      {guide && (
        <Dialog
          title={t("دليل القياس", "Measurement guide")}
          closeLabel={t("إغلاق الدليل", "Close guide")}
          onClose={() => setGuide(false)}
        >
          <div className="guide-copy">
            <p>
              {t(
                "لا يوجد جدول قياس فعلي معتمد بعد. هذه خطوات إرشادية للمعاينة، وليست توصية بمقاس.",
                "An approved size chart is not available yet. These are preview instructions, not a size recommendation.",
              )}
            </p>
            <ol>
              <li>
                {t(
                  "استخدمي عباية تناسبك على سطح مستوٍ.",
                  "Lay a well-fitting abaya flat.",
                )}
              </li>
              <li>
                {t(
                  "سجّلي الطول وعرض الصدر والأكمام.",
                  "Note length, chest width and sleeve length.",
                )}
              </li>
              <li>
                {t(
                  "قارني بجدول صاحبة المتجر بعد اعتماده.",
                  "Compare with the owner’s chart once approved.",
                )}
              </li>
            </ol>
            <p className="notice">
              {t(
                "لا ترسلي قياسات شخصية في هذه المعاينة.",
                "Do not submit personal measurements in this preview.",
              )}
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
