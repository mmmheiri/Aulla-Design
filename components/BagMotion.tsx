"use client";
import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import { Icon } from "./Icons";

/** Local, one-shot Lottielab Cart icon; decorative feedback, never a progress claim. */
export function BagMotion() {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const abort = new AbortController();
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let instance: AnimationItem | undefined;
    const stop = () => { if (preference.matches) instance?.goToAndStop(0, true); };
    preference.addEventListener("change", stop);
    async function load() {
      const [{ default: lottie }, response] = await Promise.all([
        import("lottie-web/build/player/lottie_light"),
        fetch("/lottie/lottielab-cart.json", { signal: abort.signal }),
      ]);
      if (!response.ok) throw Error("Animation unavailable");
      const data = await response.json();
      if (disposed) return;
      instance = lottie.loadAnimation({ container: element!, renderer: "svg", loop: false, autoplay: false, animationData: data });
      instance.addEventListener("DOMLoaded", () => {
        if (disposed) return;
        setReady(true);
        if (preference.matches) instance?.goToAndStop(0, true);
        else instance?.play();
      });
    }
    load().catch(() => { /* Existing static bag icon remains available. */ });
    return () => { disposed = true; abort.abort(); preference.removeEventListener("change", stop); instance?.destroy(); };
  }, []);
  return <span className={`bag-motion${ready ? " ready" : ""}`} aria-hidden="true"><span className="bag-motion-fallback"><Icon name="bag" /></span><span className="bag-motion-player" ref={host} /></span>;
}
