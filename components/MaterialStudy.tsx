"use client";

import { useEffect, useRef, useState } from "react";
import { useShop } from "./Shop";
import { tx } from "../lib/catalog";

type Action = "left" | "right" | "closer" | "farther" | "reset" | "png";

export function MaterialStudy() {
  const { locale } = useShop();
  const t = (ar: string, en: string) => tx(locale, ar, en);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const [attempt, setAttempt] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const command = useRef<(action: Action) => void>(() => {});

  useEffect(() => {
    if (!active || !host.current) return;
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
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x111626);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.setAttribute(
        "aria-label",
        locale === "ar"
          ? "مجسّمات عينات قماش تقريبية؛ التحكم بالأزرار المجاورة"
          : "Approximate 3D fabric swatches. Use the adjacent controls.",
      );
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
      const initial = new THREE.Vector3(2.5, 2.65, 5.5);
      camera.position.copy(initial);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.95, 0);
      controls.enablePan = false;
      controls.enableDamping = false;
      controls.minDistance = 1.7;
      controls.maxDistance = 9;
      controls.minPolarAngle = 0.2;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.update();
      let object: import("three").Group | undefined;
      const draw = () => {
        if (!disposed) renderer.render(scene, camera);
      };
      const resize = () => {
        const { width, height } = element.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        draw();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      controls.addEventListener("change", draw);
      const lost = (event: Event) => {
        event.preventDefault();
        setStatus("failed");
      };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      function disposeObject(root: import("three").Object3D) {
        root.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.geometry.dispose();
          for (const material of Array.isArray(node.material)
            ? node.material
            : [node.material]) {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) {
                value.dispose();
                if (
                  typeof ImageBitmap !== "undefined" &&
                  value.image instanceof ImageBitmap
                )
                  value.image.close();
              }
            }
            material.dispose();
          }
        });
      }
      release = () => {
        command.current = () => {};
        observer.disconnect();
        controls.removeEventListener("change", draw);
        controls.dispose();
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        if (object) disposeObject(object);
        scene.traverse((node) => {
          if (node instanceof THREE.Light) node.dispose();
        });
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
      try {
        const response = await fetch("/models/aulla-material-study.glb", {
          signal: abort.signal,
        });
        if (!response.ok) throw new Error("Scene unavailable");
        const gltf = await new GLTFLoader().parseAsync(
          await response.arrayBuffer(),
          "/models/",
        );
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        object = gltf.scene;
        object.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.castShadow = node.name !== "ENV_floor";
            node.receiveShadow = node.name === "ENV_floor";
            if (node.name === "ENV_floor") {
              const previous = Array.isArray(node.material)
                ? node.material
                : [node.material];
              previous.forEach((material) => material.dispose());
              // A transparent contact-shadow receiver keeps the studio backdrop continuous.
              node.material = new THREE.ShadowMaterial({
                color: 0x02050d,
                opacity: 0.14,
              });
            }
          }
        });
        // Stable local studio light; the source .blend retains its delivery rig.
        const importedLights: import("three").Light[] = [];
        object.traverse((node) => {
          if (node instanceof THREE.Light) importedLights.push(node);
        });
        importedLights.forEach((light) => light.removeFromParent());
        scene.add(object);
        scene.add(new THREE.HemisphereLight(0xdce6fa, 0x253047, 1.2));
        const key = new THREE.DirectionalLight(0xffffff, 1.5);
        key.position.set(-3, 5, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -4;
        key.shadow.camera.right = 4;
        key.shadow.camera.top = 4;
        key.shadow.camera.bottom = -2;
        key.shadow.camera.far = 20;
        key.shadow.bias = -0.0004;
        key.shadow.normalBias = 0.015;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xadc8ff, 0.6);
        fill.position.set(4, 2, -1);
        scene.add(fill);
        renderer.domElement.dataset.swatches = String(
          object
            .getObjectsByProperty("type", "Mesh")
            .filter((mesh) => mesh.name.startsWith("SWATCH_")).length,
        );
        const loadedTextures = new Set<import("three").Texture>();
        object.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture && value.image?.width > 0) loadedTextures.add(value);
            }
          }
        });
        renderer.domElement.dataset.textures = String(loadedTextures.size);
        command.current = (action) => {
          if (!object || disposed) return;
          if (action === "left" || action === "right")
            object.rotation.y += action === "left" ? 0.3 : -0.3;
          if (action === "closer" || action === "farther") {
            const delta = camera.position.clone().sub(controls.target);
            delta.setLength(
              THREE.MathUtils.clamp(
                delta.length() * (action === "closer" ? 0.8 : 1.25),
                1.7,
                9,
              ),
            );
            camera.position.copy(controls.target).add(delta);
          }
          if (action === "reset") {
            object.rotation.y = 0;
            camera.position.copy(initial);
            controls.target.set(0, 0.95, 0);
          }
          controls.update();
          draw();
          if (action === "png") {
            const output = document.createElement("canvas");
            output.width = renderer.domElement.width;
            output.height = renderer.domElement.height + 68;
            const context = output.getContext("2d");
            if (!context) return;
            context.fillStyle = "#111626";
            context.fillRect(0, 0, output.width, output.height);
            context.drawImage(renderer.domElement, 0, 0);
            context.fillStyle = "#ffffff";
            context.font = "16px sans-serif";
            context.fillText(
              "AULLA · Approximate visual study · Not a product or measured fabric",
              16,
              output.height - 24,
              output.width - 32,
            );
            output.toBlob((blob) => {
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "aulla-material-study-approximation.png";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
          }
        };
        resize();
        setStatus("ready");
      } catch (error) {
        if (
          !disposed &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          release();
          setStatus("failed");
        }
      }
    }
    load().catch(() => {
      if (!disposed) {
        release();
        setStatus("failed");
      }
    });
    return () => {
      disposed = true;
      abort.abort();
      release();
    };
  }, [active, attempt, locale]);

  return (
    <section className="material-study container" id="material-study">
      <div className="material-heading">
        <div>
          <h2>{t("مشهد توضيحي لطيّات القماش", "An illustrative fabric-fold scene")}</h2>
          <p>
            {t(
              "ثلاث عينات افتراضية لشرح الضوء على الطيّات. ليست خامات تختارينها للطلب، ولا تمثّل ملمس عباية بعينها. افتحي العرض لتدوير العينات وتقريبها.",
              "Three virtual swatches showing light across folds. These are not fabric choices for an order or the measured surface of any abaya. Open the viewer to rotate and zoom the swatches.",
            )}
          </p>
        </div>
        <a className="text-link" href="/collection/">
          {t("القطع وصورها الأصلية", "Pieces & original photographs")}
        </a>
      </div>
      <div
        className={`material-view ${status === "ready" ? "live" : ""}`}
        data-state={status}
      >
        <img
          src="/models/aulla-material-study.png"
          width="1200"
          height="900"
          alt={t(
            "تصيير لثلاث عينات قماش إيضاحية؛ ليست صور منتجات",
            "Render of three illustrative fabric swatches, not product photographs",
          )}
          loading="lazy"
        />
        <div className="material-canvas" ref={host} />
        {!active && (
          <div className="material-launch">
            <button className="button" onClick={() => setActive(true)}>
              {t("عرض عينات القماش التوضيحية · 3D", "View illustrative fabric swatches · 3D")}
            </button>
          </div>
        )}
        {status === "loading" && (
          <p className="material-message" role="status">
            {t("جارٍ تحميل المشهد…", "Loading the scene…")}
          </p>
        )}
        {status === "failed" && (
          <div className="material-message" role="status">
            <p>
              {t(
                "تعذّر عرض المجسّم. الصورة التوضيحية متاحة.",
                "The 3D scene could not load. The illustrative render is still available.",
              )}
            </p>
            <button className="button" onClick={() => setAttempt((n) => n + 1)}>
              {t("إعادة المحاولة", "Retry")}
            </button>
            <button
              onClick={() => {
                setActive(false);
                setStatus("idle");
              }}
            >
              {t("العودة للصورة", "Return to image")}
            </button>
          </div>
        )}
      </div>
      {active && (
        <div
          className="studio-controls"
          aria-label={t("أدوات عرض المشهد", "Scene controls")}
        >
          {(
            [
              ["left", "دوران يسار", "Rotate left"],
              ["right", "دوران يمين", "Rotate right"],
              ["closer", "تقريب", "Zoom in"],
              ["farther", "إبعاد", "Zoom out"],
              ["reset", "إعادة المشهد", "Reset view"],
              ["png", "حفظ لقطة 2D", "Save 2D render"],
            ] as const
          ).map(([action, ar, en]) => (
            <button
              key={action}
              disabled={status !== "ready"}
              onClick={() => command.current(action)}
            >
              {t(ar, en)}
            </button>
          ))}
          <p>
            {t(
              "اسحبي للدوران · مرّري إصبعين للتقريب · أو استخدمي الأزرار",
              "Drag to orbit · Pinch to zoom · Or use the buttons",
            )}
          </p>
        </div>
      )}
      <details className="material-explanation">
        <summary>{t("ما علاقة العينات بأوصاف المتجر؟", "How do these relate to the store descriptions?")}</summary>
      <div className="material-notes">
        <div>
          <h3>{t("مخمل", "Velvet")}</h3>
          <p>
            {t(
              "مذكور لفاطمة والميّاسة، وخيار للقطعة السوداء في ميرة. لمعان السطح هنا معالجة بصرية تقريبية.",
              "Named for Fatma and Almayasa, and an option for Meera’s black piece. Surface sheen here is an approximate visual treatment.",
            )}
          </p>
        </div>
        <div>
          <h3>{t("قطن مبطّن", "Lined cotton")}</h3>
          <p>
            {t(
              "هذا وصف لورا المنشور. نوع النسج ونسبة الألياف ووزن القماش غير محددة؛ العينة إيضاحية.",
              "Lora’s published description. Weave, fibre percentage and fabric weight are unspecified; this swatch is illustrative.",
            )}
          </p>
        </div>
        <div>
          <h3>{t("شيفون كريب", "Chiffon crepe")}</h3>
          <p>
            {t(
              "مذكور لليازية مع تطريز وفصوص يدوية. لا يمثّل المشهد شفافية القطعة أو تفاصيل تطريزها.",
              "Named for Alyazia, with hand embroidery and crystals. The scene does not reproduce the piece’s transparency or embroidery.",
            )}
          </p>
        </div>
      </div>
      <p className="material-disclaimer">
        {t(
          "ندى كوري مذكور أيضًا في أوصاف المتجر، والدانتيل في مريم وطيف. الاسم التجاري وحده لا يثبت التركيب أو المنشأ. هذا المشهد ليس محاكاة مقاس أو انسدال معتمدة، ولا نموذجًا لأي عباية؛ صور القطع ووصفها المنشور هما المرجع.",
          "Korean Nida also appears in the store descriptions, and lace in Maryam and Taif. A trade name alone does not establish fibre content or origin. This is neither a validated fit/drape simulation nor a model of an abaya; the product photographs and published descriptions remain the reference.",
        )}
      </p>
      </details>
    </section>
  );
}
