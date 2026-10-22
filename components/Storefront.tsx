"use client";
import { MotionCard } from "./MotionCard";
import { Money } from "./Money";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { nameOf, money, tx, type Product } from "../lib/catalog";
import { useShop, PageTitle, Empty } from "./Shop";
import { Icon } from "./Icons";
import { HomeShowcase, HomeCollection } from "./HomeShowcase";
import {PackagingStory} from './PackagingStory';
import {SocialVideos} from './SocialVideos';
import { sourceProducts } from "../lib/source-catalogue";
export function ProductCard({ product: p }: { product: Product }) {
  const { locale, saved, toggleSave } = useShop();
  const path = usePathname();
  const [broken, setBroken] = useState(false);
  const t = (ar: string, en: string) => tx(locale, ar, en);
  function remember() {
    if (path.startsWith("/preview/catalogue"))
      try {
        sessionStorage.setItem(
          "aulla-list-return",
          location.pathname + location.search,
        );
        sessionStorage.setItem("aulla-list-scroll", String(scrollY));
      } catch {}
  }
  return (
    <MotionCard className="product-card">
      <div className={"product-art tone-" + p.tone}>
        <Link
          href={"/product/" + p.id + "/"}
          onClick={remember}
          aria-label={t(
            `عرض ${nameOf(p, locale)}`,
            `View ${nameOf(p, locale)}`,
          )}
        >
          {broken ? (
            <div className="media-fallback">
              {t("الصورة غير متاحة", "Image unavailable")}
            </div>
          ) : (
            <img
              src={`/placeholders/${p.tone}-front.svg`}
              width="800"
              height="1000"
              alt={t(
                "رسم توضيحي بديل لعباية كاملة؛ ليس صورة منتج",
                "Full abaya schematic placeholder, not a product photo",
              )}
              loading="lazy"
              onError={() => setBroken(true)}
            />
          )}
        </Link>
        <button
          className={
            "icon-button save-button " +
            (saved.includes(p.id) ? "selected" : "")
          }
          aria-label={t(
            `حفظ ${nameOf(p, locale)}`,
            `Save ${nameOf(p, locale)}`,
          )}
          aria-pressed={saved.includes(p.id)}
          onClick={() => toggleSave(p.id)}
        >
          <Icon name="heart" />
        </button>
        {p.stock === 0 && (
          <span className="stock-label">
            {t("نفد — تجريبي", "Sold out · demo")}
          </span>
        )}
      </div>
      <div className="card-meta">
        <div>
          <Link href={"/product/" + p.id + "/"} onClick={remember}>
            <h3>{nameOf(p, locale)}</h3>
          </Link>
          <p>
            {t(
              "قطعة تجريبية · الخامة غير معتمدة",
              "Demo piece · Material unconfirmed",
            )}
          </p>
        </div>
        <span className="card-price">
          <Money value={p.price} locale={locale} />
          <small>{t("سعر تجريبي", "Demo price")}</small>
        </span>
        <span className="art-caption">
          {t("رسم بديل", "Placeholder study")}
        </span>
      </div>
    </MotionCard>
  );
}
export function Home() {
  const detail = sourceProducts.find((p) => p.id === "knwEQbiwWA9RLQ6QirLB")!;
  const { locale, products } = useShop();
  const editorial = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = editorial.current;
    if (!root || !window.IntersectionObserver || !Element.prototype.animate)
      return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const animated = new Set<Element>();
    const visited = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (preference.matches || visited.has(entry.target)) continue;
          visited.add(entry.target);
          const image = entry.target.matches(".showcase");
          const picture = entry.target.tagName === "IMG";
          entry.target.classList.add(
            image
              ? "taste-shutter"
              : picture
                ? "taste-picture"
                : "taste-arrive",
          );
          animated.add(entry.target);
        }
      },
      { threshold: 0.08 },
    );
    root
      .querySelectorAll<HTMLElement>(
        "h1, h2, .hero-support > *, .showcase, .editorial-strip > *, .section-heading p, .product-art img, .card-meta, .story-copy p, .story-copy .text-link, .detail-study > :not(.fabric-line)",
      )
      .forEach((element, i) => {
        element.style.setProperty("--arrival", `${(i % 3) * 70}ms`);
        observer.observe(element);
      });
    const reduce = () => {
      if (preference.matches) {
        for (const element of animated)
          element.classList.remove(
            "taste-shutter",
            "taste-picture",
            "taste-arrive",
          );
        animated.clear();
      }
    };
    preference.addEventListener("change", reduce);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", reduce);
      for (const element of animated)
        element.classList.remove(
          "taste-shutter",
          "taste-picture",
          "taste-arrive",
        );
    };
  }, []);
  const t = (ar: string, en: string) => tx(locale, ar, en);
  return (
    <div className="home-editorial" ref={editorial}>
      <HomeShowcase />
      <div className="editorial-strip container">
        <span>{t("التفاصيل تستحق أن تُرى", "Details deserve to be seen")}</span>
        <span>{t("صور القطعة وتفاصيلها", "Product photos & details")}</span>
        <span>{t("تسوّق بالعربية والإنجليزية", "Arabic & English")}</span>
      </div>
      <HomeCollection />
      <SocialVideos />
        <PackagingStory />
    </div>
  );
}
export function DemoExperience() {
  const { locale, products } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  return (
    <div className="container">
      <PageTitle
        title={t("تجربة الشراء الوهمية", "Fictional shopping preview")}
      />{" "}
      <section className="collection">
        <div className="section-heading">
          <div>
            <h2>{t("اختيارات على مهل", "Pieces to pause for")}</h2>
            <p>
              {t(
                "ست قطع لتجربة المجموعة. الأسماء والأسعار والمخزون للمعاينة فقط.",
                "Six pieces to explore the experience. Names, prices and stock are demonstration data.",
              )}
            </p>
          </div>
          <Link className="text-link" href="/preview/catalogue/">
            {t("المجموعة كاملة", "View the collection")}
            <Icon name="arrow" />
          </Link>
        </div>
        <div className="product-grid home-grid">
          {products.slice(0, 3).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <div className="demo-reserved">
        {" "}
        <small>
          {t(
            "مساحة محجوزة لصورة خامة القطعة التجريبية بعد اعتمادها",
            "Reserved for an approved fabric photograph of the demo piece",
          )}
        </small>
      </div>
    </div>
  );
}
export function Catalogue() {
  const { locale, products, saved } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") || "";
  const group = params.get("group") || "all";
  const sort = params.get("sort") || "featured";
  const onlySaved = params.get("saved") === "1";
  const stock = params.get("stock") === "1";
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace("/preview/catalogue/" + (next.size ? "?" + next.toString() : ""), {
      scroll: false,
    });
  };
  useEffect(() => {
    try {
      const y = Number(sessionStorage.getItem("aulla-list-scroll"));
      if (y > 0) {
        requestAnimationFrame(() => window.scrollTo(0, y));
        sessionStorage.removeItem("aulla-list-scroll");
      }
    } catch {}
  }, []);
  let shown = products.filter(p=>!p.source).filter(
    (p) =>
      (nameOf(p, locale) + " " + p.id)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (group === "all" || p.group === group) &&
      (!onlySaved || saved.includes(p.id)) &&
      (!stock || p.stock > 0),
  );
  if (sort === "low") shown = [...shown].sort((a, b) => a.price - b.price);
  if (sort === "high") shown = [...shown].sort((a, b) => b.price - a.price);
  return (
    <section className="container catalog-page">
      <PageTitle
        title={
          onlySaved
            ? t("قطعك المحفوظة", "Your saved pieces")
            : t("العبايات", "The abaya collection")
        }
        description={t(
          "اختيارك يبدأ بنظرة كاملة. كل ما ترينه هنا بيانات ورسومات تجريبية.",
          "Start with the full picture. Everything here is demonstration data and placeholder artwork.",
        )}
      >
        <span className="result-count" role="status">
          {shown.length} {t("قطع تجريبية", "demo pieces")}
        </span>
      </PageTitle>
      <div className="catalog-tools">
        <form
          className="search-field"
          onSubmit={(e) => {
            e.preventDefault();
            update("q", search);
          }}
        >
          <Icon name="search" />
          <label className="sr-only" htmlFor="search">
            {t("البحث في العبايات", "Search abayas")}
          </label>
          <input
            id="search"
            placeholder={t("ابحثي عن قطعة…", "Find a piece…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">{t("بحث", "Search")}</button>
        </form>
        <label className="sort-field">
          {t("الترتيب", "Sort by")}
          <select value={sort} onChange={(e) => update("sort", e.target.value)}>
            <option value="featured">{t("المقترح", "Featured")}</option>
            <option value="low">
              {t("السعر: الأقل أولًا", "Price: low to high")}
            </option>
            <option value="high">
              {t("السعر: الأعلى أولًا", "Price: high to low")}
            </option>
          </select>
        </label>
      </div>
      <div className="filter-row">
        <div
          className="filter-tabs"
          aria-label={t("تصفية المجموعة التجريبية", "Filter demo collection")}
        >
          {[
            ["all", "الكل", "All"],
            ["daily", "يومي — تجريبي", "Everyday · demo"],
            ["occasion", "مناسبات — تجريبي", "Occasion · demo"],
          ].map(([id, ar, en]) => (
            <button
              key={id}
              className={group === id ? "active" : ""}
              aria-pressed={group === id}
              onClick={() => update("group", id === "all" ? "" : id)}
            >
              {t(ar, en)}
            </button>
          ))}
        </div>
        <div className="filter-checks">
          <label>
            <input
              type="checkbox"
              checked={onlySaved}
              onChange={(e) => update("saved", e.target.checked ? "1" : "")}
            />
            {t("المفضلة", "Saved")}
          </label>
          <label>
            <input
              type="checkbox"
              checked={stock}
              onChange={(e) => update("stock", e.target.checked ? "1" : "")}
            />
            {t("المتاح فقط", "In stock only")}
          </label>
        </div>
      </div>
      {shown.length ? (
        <div className="product-grid">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <Icon name="search" />
          <h2>{t("لا توجد قطع هنا بعد", "No pieces here yet")}</h2>
          <p>
            {t(
              "جرّبي بحثًا آخر أو امسحي الفلاتر. يمكنك حفظ أي قطعة بالقلب.",
              "Try another search or clear the filters. Save a piece with the heart button.",
            )}
          </p>
          <button
            className="button"
            onClick={() => router.replace("/preview/catalogue/", { scroll: false })}
          >
            {t("عرض كل القطع", "Show all pieces")}
          </button>
        </div>
      )}
    </section>
  );
}
