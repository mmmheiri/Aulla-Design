"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { animate } from "motion/mini";

export function RouteMotion() {
  const path = usePathname();
  const keyboard = useRef(false);
  useEffect(() => {
    const key = () => {
      keyboard.current = true;
    };
    const pointer = () => {
      keyboard.current = false;
    };
    addEventListener("keydown", key);
    addEventListener("pointerdown", pointer);
    return () => {
      removeEventListener("keydown", key);
      removeEventListener("pointerdown", pointer);
    };
  }, []);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const main = document.getElementById("main");
    if (preference.matches || keyboard.current || !main?.animate) return;
    const animation = animate(
      main,
      { opacity: [0.75, 1], transform: ["translateY(10px)", "none"] },
      { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
    );
    const stop = () => {
      if (preference.matches) animation.cancel();
    };
    preference.addEventListener("change", stop);
    return () => {
      animation.cancel();
      preference.removeEventListener("change", stop);
    };
  }, [path]);
  return null;
}
