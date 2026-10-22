"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { ReactNode, MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { catalogue, tx, type Locale, type Product } from "../lib/catalog";
import { normalizeCart, totals, type CartLine } from "../lib/commerce";
import { Icon } from "./Icons";
import {shopProducts,mapShopProducts} from "../lib/shop-products";
import {sourceProducts,type SourceProduct} from '../lib/source-catalogue';
import type {MeasurementDraft} from '../lib/measurements';
import { Brand } from "./Brand";
import { CartDrawer } from "./CartDrawer";
import {restoreOrders,restoreProducts,type PreviewOrder} from "../lib/preview-admin";
export type Order = PreviewOrder;
type ShopState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  products: Product[];
  sourceCatalog: SourceProduct[];
  refreshCatalog: () => Promise<void>;
  measurements: MeasurementDraft;
  setMeasurements: (value:MeasurementDraft) => void;
  setProducts: (p: Product[]) => void;
  cart: CartLine[];
  setCart: (f: CartLine[] | ((c: CartLine[]) => CartLine[])) => void;
  bagOpen: boolean;
  openBag: () => void;
  closeBag: () => void;
  saved: string[];
  toggleSave: (id: string) => void;
  notice: (message: string) => void;
  orders: Order[];
  setOrders: (f: Order[] | ((o: Order[]) => Order[])) => void;
};
const Context = createContext<ShopState | null>(null);
export function useShop() {
  const value = useContext(Context);
  if (!value) throw new Error("Shop provider missing");
  return value;
}
export function ShopProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [products, setProducts] = useState(shopProducts);
  const [sourceCatalog,setSourceCatalog]=useState(sourceProducts);
  // Personal measurement drafts stay in memory, never in localStorage.
  const [measurements,setMeasurements]=useState<MeasurementDraft>({unit:'cm',values:{}});
  const refreshCatalog=useCallback(async()=>{
    const response=await fetch('/api/commerce/catalogue/',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Catalogue could not be refreshed');
    const data=await response.json();
    if(!Array.isArray(data.products))throw new Error('Invalid catalogue response');
    setSourceCatalog(data.products);setProducts(mapShopProducts(data.products));
  },[]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const openBag = useCallback(() => setBagOpen(true), []);
  const closeBag = useCallback(() => setBagOpen(false), []);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<Order[]>([
    { id: "DEMO-1042", total: 355, count: 1, paid: true, stage: "new" },
    { id: "DEMO-1041", total: 640, count: 2, paid: false, stage: "preparing" },
    { id: "DEMO-1040", total: 405, count: 1, paid: true, stage: "shipped" },
  ]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      setMessage("");
      setBagOpen(false);
      if (timer.current) clearTimeout(timer.current);
      previousPath.current = pathname;
    }
  }, [pathname]);
  const notice = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 5000);
  }, []);
  useEffect(() => {
    let cancelled=false;
    async function restore(){
    // Restore language before waiting for catalogue reconciliation.
    try{const savedLocale=JSON.parse(localStorage.getItem("aulla-preview-v1")||"{}").locale;if(savedLocale==="ar"||savedLocale==="en")setLocale(savedLocale);}catch{/* The existing restore handler reports unavailable storage. */}
    let current=shopProducts;
    try{
      const response=await fetch('/api/commerce/catalogue/',{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(response.ok){const data=await response.json();if(Array.isArray(data.products)){current=mapShopProducts(data.products);if(!cancelled){setSourceCatalog(data.products);setProducts(current);}}}
    }catch{/* Static catalogue keeps browsing available when the test database is offline. */}
    if(cancelled)return;
    try {
      const state = JSON.parse(
        localStorage.getItem("aulla-preview-v1") || "{}",
      );
      if (state.locale === "en" || state.locale === "ar") setLocale(state.locale);
      setCart(normalizeCart(state.cart, current));
      if (Array.isArray(state.saved))
        setSaved([
          ...new Set<string>(
            state.saved.filter(
              (id: unknown) =>
                typeof id === "string" && current.some((p) => p.id === id),
            ),
          ),
        ]);
    } catch {
      notice(
        "تعذّر استعادة الحفظ المحلي. يمكنك متابعة المعاينة. / Local storage unavailable; preview still works.",
      );
    }
    try {
      const raw=localStorage.getItem("aulla-admin-preview-v2");
      if(raw){const data=JSON.parse(raw);if(data.version===2){
        if(Array.isArray(data.orders))setOrders(restoreOrders(data.orders));
        // Browser demo edits must never override server-owned product prices or stock.
        const demo=restoreProducts(data.products,current).filter(p=>!p.source);
        setProducts([...demo,...current.filter(p=>p.source)]);
      }}
    } catch {notice("تعذّر استعادة الإدارة المحلية / Local admin data could not be restored");}
    setReady(true);
    }
    void restore();
    return () => {
      cancelled=true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notice]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "aulla-preview-v1",
          JSON.stringify({ locale, cart, saved }),
        );
      } catch {
        /* In-memory mode remains usable. */
      }
  }, [ready, locale, cart, saved]);
  useEffect(() => {
    setCart((c) => normalizeCart(c, products));
  }, [products]);
  useEffect(()=>{
    if(!ready)return;
    try{localStorage.setItem("aulla-admin-preview-v2",JSON.stringify({version:2,orders,products:products.map(({id,name,price,stock})=>({id,name,price,stock}))}));}
    catch{notice("التغييرات في الذاكرة فقط؛ التخزين المحلي غير متاح / Changes remain in memory; local storage unavailable");}
  },[ready,orders,products,notice]);
  const toggleSave = (id: string) =>
    setSaved((current) =>
      current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
    );
  return (
    <Context.Provider
      value={{
        locale,
        setLocale,
        products,
        sourceCatalog,
        refreshCatalog,
        measurements,
        setMeasurements,
        setProducts,
        cart,
        setCart,
        bagOpen,
        openBag,
        closeBag,
        saved,
        toggleSave,
        notice,
        orders,
        setOrders,
      }}
    >
      {children}
      <div
        className={"toast " + (message ? "visible" : "")}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </Context.Provider>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const { locale, setLocale, cart, products, saved, bagOpen, openBag } = useShop();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const menuButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!menu)return;
    const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setMenu(false);menuButton.current?.focus({preventScroll:true});}};
    const outside=(event:PointerEvent)=>{if(event.target instanceof Element&&!event.target.closest('#main-nav,.mobile-menu'))setMenu(false);};
    const leave=(event:FocusEvent)=>{if(event.target instanceof Element&&!event.target.closest('#main-nav,.mobile-menu'))setMenu(false);};
    document.addEventListener('keydown',dismiss);document.addEventListener('pointerdown',outside);document.addEventListener('focusin',leave);
    return()=>{document.removeEventListener('keydown',dismiss);document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',leave);};
  },[menu]);
  const [tabsHidden, setTabsHidden] = useState(false);
  const [headerHidden,setHeaderHidden]=useState(false);
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const count = totals(cart, products).count;
  const showBag = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setMenu(false);
    openBag();
  };
  useEffect(() => {
    setMenu(false);
    setTabsHidden(false);
    setHeaderHidden(false);
  }, [path]);
  useEffect(() => {
    let previous = scrollY;
    const onScroll = () => {
      const current = scrollY;
      if (Math.abs(current - previous) < 8) return;
      const down=current>previous&&current>120;
      if (!document.activeElement?.closest('.site-header'))setHeaderHidden(down);
      if (innerWidth<=760&&!document.activeElement?.closest(".mobile-tabs"))
        setTabsHidden(current > previous && current > 120);
      previous = current;
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <a href="#main" className="skip">
        {t("تخطّي إلى المحتوى", "Skip to content")}
      </a>
      <div className="preview-bar" role="region" aria-label={t("تنبيه المعاينة", "Preview notice")}>
        {t(
          "نسخة للمراجعة · لا دفع حي أو رسائل حقيقية",
          "Review edition · No live payments or messages",
        )}
      </div>
      <header className="site-header" data-hidden={headerHidden&&!menu&&!bagOpen} onFocusCapture={()=>setHeaderHidden(false)}>
        <div className="header-inner">
          <button
            ref={menuButton}
            className="icon-button mobile-menu"
            aria-label={t("القائمة", "Menu")}
            aria-expanded={menu}
            aria-controls="main-nav"
            onClick={() => setMenu(!menu)}
          >
            <Icon name="menu" />
          </button>
          <Link
            href="/"
            className="wordmark"
            aria-label={t("Aulla Design — الرئيسية", "Aulla Design — home")}
          >
            <img className="hanger-wordmark" src="/brand/aulla-hanger-wordmark.png" alt="AullaDesign" width="174" height="47" />
          </Link>
          <nav
            id="main-nav"
            onClick={event=>{if((event.target as Element).closest('a'))setMenu(false);}}
            aria-label={t("التنقل الرئيسي", "Main navigation")}
            className={menu ? "open" : ""}
          >
            <Link href="/" aria-current={path === "/" ? "page" : undefined}>
              {t("الرئيسية", "Home")}
            </Link>
            <Link
              href="/collection/"
              aria-current={path.startsWith("/collection") ? "page" : undefined}
            >
              {t("العبايات", "Abayas")}
            </Link>
            <Link
              href="/about/"
              aria-current={path.startsWith("/about") ? "page" : undefined}
            >
              {t("عن أولّا", "About Aulla")}
            </Link>
          </nav>
          <form className="header-search" action="/collection/">
            <label>
              <Icon name="search" />
              <span className="sr-only">
                {t("ابحثي في المجموعة", "Search the collection")}
              </span>
              <input
                name="q"
                type="search"
                placeholder={t("ابحثي عن قطعتك", "Find your piece")}
              />
            </label>
          </form>
          <div className="header-actions">
            <button
              className="language icon-button" aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              lang={locale === "ar" ? "en" : "ar"}
            >
              <Icon name="globe" />
            </button>
            <Link
              className="icon-button saved-link"
              href="/collection/?saved=1"
              aria-label={t("المفضلة", "Saved pieces")}
            >
              <Icon name="heart" />
              {saved.length > 0 && <small>{saved.length}</small>}
            </Link>
            <Link
              className="bag-link"
              href="/cart/"
              onClick={showBag}
              aria-haspopup="dialog"
              aria-expanded={bagOpen}
              aria-label={t(`السلة، ${count} قطع`, `Bag, ${count} pieces`)}
            >
              <Icon name="bag" />
              <span>{t("السلة", "Bag")}</span>
              <b className="bag-count" key={count} aria-live="polite" aria-atomic="true">{count}</b>
            </Link>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="wordmark">
              <Brand footer />
            </div>
            <p>
              {t(
                "مساحة للقطعة. وللتفاصيل التي تهمّك.",
                "Room for the piece. And the details that matter.",
              )}
            </p>
          </div>
          <div>
            <h2>{t("اكتشفي", "Explore")}</h2>
            <Link href="/collection/">{t("جميع العبايات", "All abayas")}</Link>
            <Link href="/collection/?group=colours">
              {t("ألوان تناسبكِ", "Explore colour")}
            </Link>
            <Link href="/about/">{t("عن المعاينة", "About the preview")}</Link>
          </div>
          <div>
            <h2>{t("قبل الطلب", "Before you order")}</h2>
            <Link href="/policies/">
              {t("التوصيل والاستبدال", "Delivery & exchanges")}
            </Link>
            <Link href="/guide/">{t("دليل القياس", "Size guide")}</Link>
          </div>
          <div>
            <h2>{t("مساحة الإدارة", "Management")}</h2>
            <Link href="/admin/">
              {t("مساحة أولّا", "Atelier workspace")}
            </Link>
            <p>
              {t("دخول محمي · بيانات اختبار", "Protected access · Test data")}
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © 2026 Aulla Design ·{" "}
            {t("نسخة للمراجعة", "Review edition")}
          </span>
          <span>
            {t(
              "الشعار والصور المرجعية بإذن · رسومات التجربة معلّمة",
              "Permissioned logo and reference photos · Labelled demo schematics",
            )}
          </span>
        </div>
      </footer>
      <nav
        className={`mobile-tabs ${tabsHidden ? "retracted" : ""}`}
        style={path.startsWith('/admin')?{display:'none'}:undefined}
        onFocusCapture={() => setTabsHidden(false)}
        aria-label={t("التنقّل الرئيسي للهاتف", "Mobile primary navigation")}
      >
        {[
          {
            href: "/",
            icon: "home",
            ar: "الرئيسية",
            en: "Home",
            active: path === "/",
          },
          {
            href: "/collection/",
            icon: "grid",
            ar: "العبايات",
            en: "Abayas",
            active: path.startsWith("/collection"),
          },
          {
            href: "/guide/",
            icon: "ruler",
            ar: "دليل القياس",
            en: "Size guide",
            active: path.startsWith("/guide"),
          },
          {
            href: "/cart/",
            icon: "bag",
            ar: "السلة",
            en: "Bag",
            active: path.startsWith("/cart") || path.startsWith("/checkout"),
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={item.href === '/cart/' ? showBag : undefined}
            aria-haspopup={item.href === '/cart/' ? 'dialog' : undefined}
            aria-expanded={item.href === '/cart/' ? bagOpen : undefined}
            aria-current={item.active ? "page" : undefined}
          >
            {item.href==='/'||item.href==='/collection/'?<span className="nav-brand-symbol" aria-hidden="true" style={{maskImage:`url(${item.href==='/'?'/brand/aulla-ad-original-v3-symbol.svg':'/brand/abaya-nav-v1.png'})`,WebkitMaskImage:`url(${item.href==='/'?'/brand/aulla-ad-original-v3-symbol.svg':'/brand/abaya-nav-v1.png'})`}}/>:<Icon name={item.icon} />}
            <span>{t(item.ar, item.en)}</span>
          </Link>
        ))}
      </nav>
      {bagOpen && <CartDrawer />}
    </>
  );
}
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  body,
  action,
  href = "/collection/",
  illustration,
}: {
  title: string;
  body: string;
  action: string;
  href?: string;
  illustration?: ReactNode;
}) {
  return (
    <div className="empty">
      {illustration ?? <Icon name="bag" />}
      <h2>{title}</h2>
      <p>{body}</p>
      <Link className="button" href={href}>
        {action}
        <Icon name="arrow" />
      </Link>
    </div>
  );
}
