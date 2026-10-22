"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageTitle, useShop } from "./Shop";
import { tx } from "../lib/catalog";
import candidates from "../docs/garment-3d/local-candidates.json";
import { sourceProducts, sourceName } from "../lib/source-catalogue";

type View = "front" | "side" | "back" | "other" | "in" | "out";

/** A rejected technical candidate, deliberately separate from the product gallery. */
export function GarmentModelReview() {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [piece, setPiece] = useState("knwEQbiwWA9RLQ6QirLB");
  const [referenceIndex, setReferenceIndex] = useState(0);
  const candidate = candidates.records.find((r) => r.id === piece)!;
  const product = sourceProducts.find((p) => p.id === piece)!;
  const modelPath = candidate.modelPath;
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("piece");
    if (requested && candidates.records.some((r) => r.id === requested)) setPiece(requested);
  }, []);
  const [active, setActive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("idle");
  const host = useRef<HTMLDivElement>(null);
  const command = useRef<(view: View) => void>(() => {});

  useEffect(() => {
    if (!active || !host.current || !modelPath) return;
    const element = host.current;
    const abort = new AbortController();
    let disposed = false;
    let release = () => {};
    setStatus("loading");
    async function load() {
      const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
        import("three"),
        import("three/addons/controls/OrbitControls.js"),
        import("three/addons/loaders/GLTFLoader.js"),
      ]);
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0xedf0f5);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.setAttribute("aria-label", locale === "ar"
        ? "مجسّم توليدي تجريبي غير معتمد؛ استخدمي أزرار الزوايا والتقريب"
        : "Unapproved generative test mesh. Use the view and zoom buttons.");
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      let object: import("three").Group | undefined;
      let radius = 1, distance = 4, angle = 0;
      const draw = () => { if (!disposed) renderer.render(scene, camera); };
      const fit = () => {
        const vertical = THREE.MathUtils.degToRad(camera.fov);
        const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
        distance = radius / Math.sin(Math.min(vertical, horizontal) / 2) * 1.1;
        controls.minDistance = radius * 0.6;
        controls.maxDistance = distance * 2;
        camera.position.set(Math.sin(angle) * distance, 0.1, Math.cos(angle) * distance);
        controls.update();
      };
      const resize = () => {
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height) return;
        renderer.setSize(box.width, box.height, false);
        camera.aspect = box.width / box.height;
        camera.updateProjectionMatrix();
        if (object) fit();
        draw();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      controls.addEventListener("change", draw);
      const lost = (event: Event) => { event.preventDefault(); setStatus("failed"); };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      function dispose(root: import("three").Object3D) {
        root.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.geometry.dispose();
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) {
              value.dispose();
              if (typeof ImageBitmap !== "undefined" && value.image instanceof ImageBitmap) value.image.close();
            }
            material.dispose();
          }
        });
      }
      release = () => {
        command.current = () => {};
        observer.disconnect(); controls.removeEventListener("change", draw); controls.dispose();
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        if (object) dispose(object);
        scene.traverse((node) => { if (node instanceof THREE.Light) node.dispose(); });
        renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      };
      const response = await fetch(modelPath!, { signal: abort.signal });
      if (!response.ok) throw new Error("Candidate unavailable");
      const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/models/garments/");
      if (disposed) { dispose(gltf.scene); return; }
      object = gltf.scene;
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 2 / Math.max(size.x, size.y, size.z);
      object.position.sub(bounds.getCenter(new THREE.Vector3())).multiplyScalar(scale);
      object.scale.multiplyScalar(scale);
      radius = size.length() * scale / 2;
      scene.add(object);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x667080, 2));
      for (const [x, y, z, intensity] of [[-3, 4, 5, 2], [4, 1, -3, 1]]) {
        const light = new THREE.DirectionalLight(0xffffff, intensity);
        light.position.set(x, y, z); scene.add(light);
      }
      let meshes = 0, triangles = 0;
      object.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          meshes++;
          triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
        }
      });
      renderer.domElement.dataset.meshes = String(meshes);
      renderer.domElement.dataset.triangles = String(triangles);
      renderer.domElement.dataset.candidate = "unapproved";
      command.current = (view) => {
        if (view === "in" || view === "out") {
          const delta = camera.position.clone().sub(controls.target);
          delta.setLength(THREE.MathUtils.clamp(delta.length() * (view === "in" ? 0.8 : 1.25), controls.minDistance, controls.maxDistance));
          camera.position.copy(controls.target).add(delta);
        } else {
          angle = { front: 0, side: Math.PI / 2, back: Math.PI, other: -Math.PI / 2 }[view];
          camera.position.set(Math.sin(angle) * distance, 0.1, Math.cos(angle) * distance);
        }
        controls.update(); draw();
      };
      resize(); setStatus("ready");
    }
    load().catch(() => { if (!disposed) setStatus("failed"); release(); });
    return () => { disposed = true; abort.abort(); release(); };
  }, [active, attempt, locale, modelPath]);

  return (
    <section className="container garment-review">
      <Link className="text-link" href={`/collection/${piece}/`}>{t("العودة إلى صور القطعة", "Back to the piece’s photographs")}</Link>
      <PageTitle title={`${sourceName(product, locale)} · ${t("مسودة 3D", "3D draft")}`} />
      <p className="garment-verdict">{t(
        "مسودة توليدية غير معتمدة. هذه هندسة ثلاثية الأبعاد مع تلوين للسطح، وليست مسحًا للقطعة أو خامة مقاسة. التطريز والحواف والأجزاء المخفية قد تتشوّه أو تُخمن؛ الصور الأصلية هي المرجع.",
        "Unapproved generative draft. This is actual 3D geometry with vertex colour, not a garment scan or measured fabric. Embroidery, hems and hidden surfaces can be distorted or inferred; original photographs remain the reference.",
      )}</p>
      <label className="garment-picker">{t("اختاري القطعة للمقارنة", "Choose a piece to compare")}
        <select value={piece} onChange={(e) => { setActive(false); setStatus("idle"); setReferenceIndex(0); setPiece(e.target.value); }}>
          {sourceProducts.map((p) => <option key={p.id} value={p.id}>{sourceName(p, locale)}</option>)}
        </select>
      </label>
      <div className="garment-comparison">
        <figure>
          <img className="garment-reference" src={product.images[referenceIndex].local!} width="704" height="704" alt={`${sourceName(product, locale)} · ${t("صورة المصدر", "Source photograph")} ${referenceIndex + 1}`} />
          <figcaption>{t("الصورة الأصلية · المرجع", "Original photograph · the reference")}</figcaption>
          <div className="thumbnails">{product.images.map((image, index) => <button key={image.local} aria-pressed={referenceIndex === index} aria-label={`${t("صورة المصدر", "Source photograph")} ${index + 1}`} onClick={() => setReferenceIndex(index)}><img src={image.local!} width="64" height="64" alt="" /></button>)}</div>
        </figure>
        <figure>
          <div className="garment-stage" data-state={status}>
            <img src={candidate.poster || candidate.source} width="900" height="900" alt={candidate.poster ? t("تصيير للنموذج التوليدي غير المعتمد", "Render of the unapproved generative mesh") : t("صورة المصدر؛ افتحي النموذج لمشاهدة الهندسة ثلاثية الأبعاد", "Source photograph; open the model to see actual 3D geometry")} />
            <div className="garment-canvas" ref={host} />
            {!active && <div className="garment-launch"><button className="button" disabled={!modelPath} onClick={() => setActive(true)}>{modelPath ? t("فحص النموذج بالدوران", "Rotate the test mesh") : t("المسودة لم تتوفر بعد", "Draft not available yet")}</button></div>}
            {status === "loading" && <p className="garment-message" role="status">{t("جارٍ تحميل النموذج…", "Loading the mesh…")}</p>}
            {status === "failed" && <div className="garment-message" role="status">
              <p>{t("تعذّر عرض المجسّم. التصيير الثابت متاح.", "The mesh could not load. The static render is available.")}</p>
              <button className="button" onClick={() => setAttempt((n) => n + 1)}>{t("إعادة المحاولة", "Retry")}</button>
              <button className="button secondary" onClick={() => { setActive(false); setStatus("idle"); }}>{t("العودة للتصيير", "Return to render")}</button>
            </div>}
          </div>
          <figcaption>{t("مسودة من صورة واحدة · تلوين سطح تقريبي", "Single-image draft · approximate vertex colour")}</figcaption>
          {active && <div className="garment-controls" aria-label={t("أدوات فحص المجسّم", "Mesh inspection controls")}>
            {([
              ["front", "أمام", "Front"], ["side", "جانب ١", "Side 1"], ["back", "خلف تخميني", "Inferred back"],
              ["other", "جانب ٢", "Side 2"], ["in", "تقريب", "Zoom in"], ["out", "إبعاد", "Zoom out"],
            ] as const).map(([view, ar, en]) => <button key={view} disabled={status !== "ready"} onClick={() => command.current(view)}>{t(ar, en)}</button>)}
          </div>}
          <p className="garment-help">{t("اسحبي للدوران أو استخدمي الأزرار. الخلف والجوانب تخمين من الأداة ولم تُتحقق بالصور.", "Drag to orbit or use the buttons. Back and sides are inferred by the tool and have not been verified against photographs.")}</p>
        </figure>
      </div>
      <div className="garment-next">
        <h2>{t("حدود هذه المسودات", "Limits of these drafts")}</h2>
        <p>{t("نحتاج صورًا كاملة للأمام والخلف والجانبين لكل قطعة ولون، ولقطات واضحة للتطريز والإغلاق والأكمام والحافة. الصور الحالية لا تغطي هذه الزوايا؛ التوليد وحده لا يثبت مطابقتها.", "We need full front, back and both side photographs for each garment and colour, plus clear embroidery, closure, cuff and hem details. Current references do not cover these views; generation alone cannot establish fidelity.")}</p>
        <p>{t("وُلدت هذه المسودات محليًا عبر TripoSR دون حساب أو مهام مدفوعة. اللون من استنتاج الأداة، ولا يثبت نوع الخامة أو المقاس. لا توجد نماذج منتجات معتمدة بعد.", "These drafts were generated locally through TripoSR without an account or paid jobs. Colour is inferred by the tool and establishes neither fabric type nor fit. No product models are approved yet.")}</p>
        {modelPath && <a className="text-link" href={modelPath} download>{t("تنزيل مسودة GLB", "Download the draft GLB")}</a>}
      </div>
    </section>
  );
}
