import type { CSSProperties } from "react";
const paths: Record<string, React.ReactNode> = {
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  play: <path d="m9 5 11 7-11 7V5Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  home: <path d="m3 11 9-8 9 8v10h-6v-7H9v7H3V11Z" />,
  ruler: (
    <>
      <path d="m3 16 13-13 5 5-13 13-5-5Z" />
      <path d="m13 6 2 2m-6 2 2 2m-6 2 2 2" />
    </>
  ),
  bag: (
    <>
      <path d="M5 7h14l1 14H4L5 7Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </>
  ),
  arrow: (
    <>
      <path d="M20 12H4m7-7-7 7 7 7" />
    </>
  ),
  heart: <path d="m12 20-8-8C-2 5 8-1 12 6c4-7 14-1 8 6l-8 8Z" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  sliders: <><path d="M4 7h4m4 0h8M4 17h8m4 0h4"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trash: <><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  check: <path d="m5 12 4 4L19 6" />,
  menu: <><path className="menu-top" d="M4 7h16" /><path className="menu-bottom" d="M4 17h16" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  zoom: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6M7 10h6M10 7v6" />
    </>
  ),
};
export function Icon({ name, style }: { name: string; style?: CSSProperties }) {
  return (
    <svg
      className={`icon icon-${name}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
