import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
const base = "http://127.0.0.1:8826";
await mkdir("docs/previews", { recursive: true });
await mkdir(".impeccable/review", { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {
  date: new Date().toISOString(),
  browser: browser.version(),
  scope:
    "Local production static export only. Desktop Chromium viewport emulation, not physical phones.",
  checks: [],
  screenshots: [],
  errors: [],
  externalRequests: [],
  a11y: [],
};
const check = async (name, fn) => {
  try {
    const details = await fn();
    report.checks.push({ name, passed: true, ...(details || {}) });
    console.log("PASS " + name);
  } catch (e) {
    report.checks.push({ name, passed: false, error: e.message });
    console.log("FAIL " + name + ": " + e.message);
  }
};
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
context.on("request", (r) => {
  if (!r.url().startsWith(base) && !r.url().startsWith("data:"))
    report.externalRequests.push(r.url());
});
context.on("page", (p) =>
  p.on("pageerror", (e) => report.errors.push(e.message)),
);
const page = await context.newPage();
async function goto(path) {
  await page.goto(base + path);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
}
async function screenshot(name) {
  await page.locator(".toast.visible").waitFor({ state: "hidden" });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "docs/previews/" + name + ".png",
    fullPage: true,
    animations: "disabled",
  });
  report.screenshots.push(name + ".png");
}
await check(
  "Responsive RTL/LTR, no horizontal overflow, full contained artwork",
  async () => {
    const rows = [];
    for (const width of [320, 390, 768, 1440])
      for (const locale of ["ar", "en"]) {
        await page.setViewportSize({
          width,
          height: width >= 768 ? 1000 : 844,
        });
        await goto("/");
        if ((await page.locator("html").getAttribute("lang")) !== locale)
          await page
            .getByRole("button", {
              name: locale === "en" ? "Switch to English" : "التبديل إلى العربية",
              exact: true,
            })
            .click();
        for (const path of [
          "/",
          "/preview/catalogue/",
          "/product/demo-01/",
          "/cart/",
          "/checkout/",
          "/admin/",
        ]) {
          await goto(path);
          await page
            .locator("img")
            .evaluateAll((images) =>
              images.forEach((i) => (i.loading = "eager")),
            );
          await page.waitForFunction(() =>
            [...document.images].every((i) => i.complete),
          );
          const info = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
            dir: document.documentElement.dir,
            lang: document.documentElement.lang,
            missing: [...document.images].filter(
              (i) => !i.complete || i.naturalWidth === 0,
            ).length,
            fit: [
              ...document.querySelectorAll(
                ".gallery-image img,.product-art img",
              ),
            ].map((i) => getComputedStyle(i).objectFit),
          }));
          assert.equal(info.dir, locale === "ar" ? "rtl" : "ltr");
          assert.equal(info.lang, locale);
          assert.ok(
            info.scroll <= info.width + 1,
            `${width} ${locale} ${path}: overflow ${info.scroll}`,
          );
          assert.equal(info.missing, 0, `${path}: missing images`);
          assert.ok(info.fit.every((f) => f === "contain"));
          rows.push({ width, locale, path, ...info });
          if (
            [390, 1440].includes(width) &&
            locale === "ar" &&
            ["/", "/preview/catalogue/", "/product/demo-01/", "/admin/"].includes(path)
          )
            await screenshot(
              {
                "/": "home",
                "/preview/catalogue/": "catalogue",
                "/product/demo-01/": "product",
                "/admin/": "admin",
              }[path] +
                "-" +
                (width === 390 ? "mobile" : "desktop"),
            );
          if (width === 390 && locale === "en" && path === "/product/demo-01/")
            await screenshot("product-mobile-en");
        }
      }
    return { viewports: rows };
  },
);
await page.setViewportSize({ width: 390, height: 844 });
await goto("/");
if ((await page.locator("html").getAttribute("lang")) === "en")
  await page.getByRole("button", { name: "التبديل إلى العربية", exact: true }).click();
await check(
  "Search, empty results, favorites and URL-backed filters",
  async () => {
    await goto("/preview/catalogue/");
    await page
      .getByRole("textbox", { name: "البحث في العبايات" })
      .fill("غيرموجود");
    await page.getByRole("button", { name: "بحث", exact: true }).click();
    await page.getByRole("heading", { name: "لا توجد قطع هنا بعد" }).waitFor();
    await page.getByRole("button", { name: "عرض كل القطع" }).click();
    await page.locator(".product-card").first().waitFor();
    assert.equal(await page.locator(".product-card").count(), 6);
    await page
      .getByRole("button", { name: "حفظ نموذج 01", exact: true })
      .click();
    await page.getByRole("checkbox", { name: "المفضلة", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll(".product-card").length === 1,
    );
    assert.equal(await page.locator(".product-card").count(), 1);
    assert.match(page.url(), /saved=1/);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll(".product-card").length === 1);
    assert.equal(await page.locator(".product-card").count(), 1);
    await page.getByRole("checkbox", { name: "المفضلة", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll(".product-card").length === 6,
    );
    await page.getByLabel("المتاح فقط", { exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll(".product-card").length === 5,
    );
    assert.equal(await page.locator(".product-card").count(), 5);
  },
);
await check("Catalogue return keeps filters and scroll position", async () => {
  await goto("/preview/catalogue/?group=daily");
  await page.evaluate(() => scrollTo(0, 550));
  await page.locator(".product-art a").first().click();
  await page.getByRole("heading", { name: "نموذج 01", exact: true }).waitFor();
  const before = await page.evaluate(() =>
    Number(sessionStorage.getItem("aulla-list-scroll")),
  );
  await page
    .locator(".breadcrumbs")
    .getByRole("link", { name: "العبايات", exact: true })
    .click();
  await page.waitForTimeout(150);
  assert.match(page.url(), /group=daily/);
  assert.ok(
    Math.abs((await page.evaluate(() => scrollY)) - before) < 40,
    `saved ${before}, restored ${await page.evaluate(() => scrollY)}`,
  );
});
await check(
  "Product selection validation, thumbnail navigation and gallery focus",
  async () => {
    await goto("/product/demo-01/");
    await page
      .getByRole("button", { name: "أضيفي إلى السلة التجريبية", exact: true })
      .click();
    await page.locator(".error[role=alert]").waitFor();
    assert.match(
      await page.locator(".error[role=alert]").innerText(),
      /اختاري/,
    );
    await page
      .getByRole("button", { name: "الصورة التالية", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "الخلف — رسم بديل", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .getByRole("button", {
        name: "تفاصيل الخامة — بانتظار الصورة",
        exact: true,
      })
      .click();
    await page
      .getByRole("heading", { name: "الخامة تُرى. لا تُخمن." })
      .waitFor();
    await page
      .getByRole("button", { name: "الأمام — رسم بديل", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تكبير الرسم البديل", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await page.evaluate(() =>
          document.querySelector("dialog").contains(document.activeElement),
        ),
      );
    }
    await page.getByRole("button", { name: "تكبير 180٪", exact: true }).click();
    assert.equal(
      await page.locator(".zoom-viewport img").getAttribute("class"),
      "enlarged",
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.ok(
      await page
        .getByRole("button", { name: "تكبير الرسم البديل", exact: true })
        .evaluate((e) => e === document.activeElement),
    );
    await page
      .getByRole("button", { name: "كيف آخذ قياساتي؟", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    // Synthetic touch events exercise the local gesture handler; not a physical-device swipe test.
    await page.locator(".gallery-stage").dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: 100, clientY: 180 }],
    });
    await page.locator(".gallery-stage").dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: 220, clientY: 185 }],
    });
    assert.equal(
      await page
        .getByRole("button", { name: "الخلف — رسم بديل", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
  },
);
await check("Image failure recovery and sold-out state", async () => {
  await page.route("**/placeholders/ink-front.svg", (r) => r.abort());
  await goto("/product/demo-01/");
  await page.getByText("تعذّر تحميل الصورة", { exact: true }).waitFor();
  await page.unroute("**/placeholders/ink-front.svg");
  await page
    .getByRole("button", { name: "إعادة المحاولة", exact: true })
    .click();
  await page.waitForFunction(() => document.querySelectorAll(".gallery-image img").length === 1);
  await page.locator(".gallery-image img").waitFor();
  assert.ok(
    await page
      .locator(".gallery-image img")
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  await goto("/product/demo-04/");
  assert.equal(
    await page
      .getByRole("button", { name: "غير متاح", exact: true })
      .isDisabled(),
    true,
  );
});
await check(
  "Bag quantities, reload, removal and demo shipping total",
  async () => {
    await goto("/product/demo-01/");
    await page.getByRole("button", { name: "54", exact: true }).click();
    await page
      .getByRole("button", { name: "أضيفي إلى السلة التجريبية", exact: true })
      .click();
    await page.getByRole("link", { name: "عرض السلة", exact: true }).click();
    await page.locator(".bag-item").waitFor();
    await screenshot("cart-mobile");
    assert.match(await page.locator(".grand-total").innerText(), /355|٣٥٥/);
    await page
      .getByRole("button", { name: "زيادة كمية نموذج 01", exact: true })
      .click();
    assert.match(await page.locator(".grand-total").innerText(), /660|٦٦٠/);
    await page.reload();
    assert.equal(
      await page.locator(".quantity-control output").innerText(),
      "2",
    );
    await page
      .getByRole("button", { name: "تقليل كمية نموذج 01", exact: true })
      .click();
    await page.getByRole("button", { name: /إزالة نموذج 01/ }).click();
    await page.getByRole("heading", { name: "مساحة لاختيارك الأول" }).waitFor();
  },
);
await check(
  "Checkout validation, simulated failure/retry, duplicate-click guard, no PII storage",
  async () => {
    await goto("/product/demo-01/");
    await page.getByRole("button", { name: "54", exact: true }).click();
    await page
      .getByRole("button", { name: "أضيفي إلى السلة التجريبية", exact: true })
      .click();
    await page.getByRole("link", { name: "عرض السلة", exact: true }).click();
    await page
      .getByRole("link", { name: "متابعة إلى التجربة", exact: true })
      .click();
    await page
      .getByRole("button", { name: "مراجعة التجربة", exact: true })
      .click();
    assert.ok(
      await page
        .locator('input[name="demo-name"]')
        .evaluate((e) => !e.checkValidity()),
    );
    await page
      .getByRole("textbox", { name: "اسم تجريبي", exact: true })
      .fill("عميلة وهمية QA");
    await page
      .getByRole("textbox", { name: "هاتف تجريبي", exact: true })
      .fill("0500000000");
    await page
      .getByRole("textbox", { name: "عنوان وهمي", exact: true })
      .fill("عنوان وهمي للاختبار فقط");
    await page
      .getByRole("checkbox", {
        name: "أفهم أنها معاينة وأستخدم بيانات وهمية.",
        exact: true,
      })
      .check();
    await page
      .getByRole("button", { name: "مراجعة التجربة", exact: true })
      .click();
    await screenshot("checkout-mobile");
    await page
      .getByRole("checkbox", {
        name: "اختبار حالة فشل الدفع المحاكى",
        exact: true,
      })
      .check();
    await page
      .getByRole("button", {
        name: "تأكيد الطلب التجريبي — بدون دفع",
        exact: true,
      })
      .click();
    await page.locator(".error[role=alert]").waitFor();
    await page
      .getByRole("checkbox", {
        name: "اختبار حالة فشل الدفع المحاكى",
        exact: true,
      })
      .uncheck();
    await page
      .getByRole("button", { name: "إعادة المحاولة محليًا", exact: true })
      .evaluate((e) => {
        e.click();
        e.click();
      });
    await page.getByRole("heading", { name: "اكتملت التجربة" }).waitFor();
    await screenshot("confirmation-mobile");
    assert.equal(
      await page
        .locator(".receipt")
        .getByText(/^DEMO-[0-9a-f-]{36}$/)
        .count(),
      1,
    );
    const storage = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    assert.ok(
      !storage.includes("عميلة وهمية QA") &&
        !storage.includes("0500000000") &&
        !storage.includes("عنوان وهمي للاختبار فقط"),
    );
    await page
      .getByRole("link", { name: "عرض الطلب التجريبي في اللوحة", exact: true })
      .click();
    await page
      .locator(".admin-order")
      .filter({ hasText: /DEMO-[0-9a-f-]{36}/ })
      .waitFor();
    assert.equal(
      await page
        .locator(".admin-order")
        .filter({ hasText: /DEMO-[0-9a-f-]{36}/ })
        .count(),
      1,
    );
  },
);
await check(
  "Mobile admin: separate payment/fulfilment, product edit failure/retry and persistence",
  async () => {
    await page.locator(".admin-order").filter({ hasText: "DEMO-1041" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("حالة التجهيز التجريبية").selectOption("shipped");
    assert.match(await page.getByRole("dialog").innerText(), /معلّق/);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "المنتجات", exact: true }).click();
    await page
      .getByRole("button", { name: "تعديل", exact: true })
      .first()
      .click();
    await page.getByLabel("السعر التجريبي بالدرهم", { exact: true }).fill("399");
    await page
      .getByRole("checkbox", { name: "اختبار فشل الحفظ", exact: true })
      .check();
    await page
      .getByRole("button", { name: "حفظ في المعاينة", exact: true })
      .click();
    await page.locator(".error[role=alert]").waitFor();
    await page
      .getByRole("checkbox", { name: "اختبار فشل الحفظ", exact: true })
      .uncheck();
    await page
      .getByRole("button", { name: "حفظ في المعاينة", exact: true })
      .click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.match(
      await page.locator(".admin-products article").first().innerText(),
      /399|٣٩٩/,
    );
    await page.reload();
    await page.getByRole("button", { name: "المنتجات", exact: true }).click();
    assert.match(
      await page.locator(".admin-products article").first().innerText(),
      /399|٣٩٩/,
    );
  },
);
await check(
  "Corrupt/hostile saved state is sanitized without crash",
  async () => {
    await page.evaluate(() =>
      localStorage.setItem(
        "aulla-preview-v1",
        JSON.stringify({
          cart: [
            { id: "demo-01", size: "54", quantity: 9999 },
            { id: "demo-04", size: "50", quantity: 2 },
          ],
          saved: ["foreign", "demo-01", "demo-01"],
        }),
      ),
    );
    await goto("/cart/");
    assert.equal(await page.locator(".bag-item").count(), 1);
    assert.equal(
      await page.locator(".quantity-control output").innerText(),
      "5",
    );
    await page.evaluate(() =>
      localStorage.setItem("aulla-preview-v1", "{broken"),
    );
    await page.reload();
    await page.getByRole("heading", { name: "مساحة لاختيارك الأول" }).waitFor();
  },
);
await check(
  "Storage blocked, reduced motion, mobile menu and keyboard skip link",
  async () => {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await c.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
    });
    const p = await c.newPage();
    await p.goto(base);
    await p.getByRole("button", { name: "القائمة", exact: true }).click();
    assert.equal(
      await p
        .getByRole("button", { name: "القائمة", exact: true })
        .getAttribute("aria-expanded"),
      "true",
    );
    await p
      .getByRole("link", { name: "العبايات", exact: true })
      .first()
      .click();
    await p.waitForURL("**/collection/");
    await p.waitForTimeout(100);
    assert.equal(
      await p
        .getByRole("button", { name: "القائمة", exact: true })
        .getAttribute("aria-expanded"),
      "false",
    );
    await p.goto(base);
    await p.keyboard.press("Tab");
    assert.equal(
      await p.evaluate(() => document.activeElement.className),
      "skip",
    );
    assert.equal(
      await p
        .locator(".editorial-model:visible")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    await c.close();
  },
);
await check("Landscape and 200% text resize remain usable", async () => {
  await page.setViewportSize({ width: 844, height: 390 });
  await goto("/product/demo-01/");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await goto("/admin/");
  await page.addStyleTag({
    content:
      "body {font-size:28px} input,select,button,textarea {font-size:inherit!important}",
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
});
await check(
  "Axe WCAG 2.2 A/AA on representative RTL/LTR surfaces",
  async () => {
    for (const locale of ["ar", "en"])
      for (const path of [
        "/",
        "/preview/catalogue/",
        "/product/demo-01/",
        "/cart/",
        "/checkout/",
        "/admin/",
      ]) {
        await goto(path);
        if ((await page.locator("html").getAttribute("lang")) !== locale)
          await page
            .getByRole("button", {
              name: locale === "en" ? "Switch to English" : "التبديل إلى العربية",
              exact: true,
            })
            .click();
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        report.a11y.push({
          locale,
          path,
          violations: result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
      }
    assert.equal(
      report.a11y.reduce((s, r) => s + r.violations.length, 0),
      0,
      JSON.stringify(report.a11y.filter((r) => r.violations.length)),
    );
  },
);
await check("No runtime JavaScript errors or external requests", async () => {
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
});
await context.close();
await browser.close();
await copyFile(
  "docs/previews/home-desktop.png",
  ".impeccable/review/desktop.png",
).catch(() => {});
await copyFile(
  "docs/previews/home-mobile.png",
  ".impeccable/review/mobile.png",
).catch(() => {});
await writeFile(
  "docs/browser-results.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `${report.checks.filter((c) => c.passed).length}/${report.checks.length} checks passed`,
);
if (report.checks.some((c) => !c.passed)) process.exitCode = 1;
