"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icons";
export function Dialog({
  title,
  closeLabel,
  onClose,
  children,
  wide = false,
  sheet = false,
  drawer = false,
  leadingIcon,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  sheet?: boolean;
  drawer?: boolean;
  leadingIcon?: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const animation = useRef<Animation | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    closing.current = false;
    dialog?.showModal();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (!reduced.matches)
      animation.current =
        dialog?.animate(
          [
            { opacity: drawer ? 1 : 0.5, transform: drawer ? `translateX(${document.documentElement.dir === 'rtl' ? '-100%' : '100%'})` : "translateY(16px) scale(.98)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: drawer ? 280 : 240, easing: "cubic-bezier(.23,1,.32,1)" },
        ) ?? null;
    const stop = () => {
      if (reduced.matches) animation.current?.cancel();
    };
    reduced.addEventListener("change", stop);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      animation.current?.cancel();
      reduced.removeEventListener("change", stop);
      document.body.style.overflow = previous;
      if (opener?.isConnected) opener.focus({preventScroll:true});
    };
  }, [drawer]);
  function dismiss(animate: boolean) {
    if (closing.current) return;
    if (
      !animate ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !ref.current?.animate
    ) {
      close.current();
      return;
    }
    closing.current = true;
    animation.current?.cancel();
    animation.current = ref.current.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: drawer ? 1 : 0, transform: drawer ? `translateX(${document.documentElement.dir === 'rtl' ? '-100%' : '100%'})` : "translateY(12px) scale(.98)" },
      ],
      { duration: 180, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" },
    );
    animation.current.finished.then(
      () => close.current(),
      () => close.current(),
    );
  }
  return createPortal(
    <dialog
      ref={ref}
      className={"dialog " + (wide ? "wide " : "") + (sheet ? "sheet " : "") + (drawer ? "cart-drawer" : "")}
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const nodes = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dismiss(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            dismiss(true);
        }
      }}
    >
      <div className="dialog-head">
        {leadingIcon&&<span className="dialog-leading-icon" aria-hidden="true">{leadingIcon}</span>}
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={(event) => dismiss(event.detail !== 0)}
          aria-label={closeLabel}
          autoFocus
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}
