/** Contours traced from the supplied AD raster; shared light/dark ink treatments. */
export function Brand({ footer = false }: { footer?: boolean }) {
  return <span className={`brand-lockup${footer ? " brand-lockup-footer" : ""}`} dir="ltr">
    <span className="brand-symbol" aria-hidden="true" />
    <span className="brand-type"><strong>AULLA</strong><span>DESIGN</span></span>
  </span>;
}
