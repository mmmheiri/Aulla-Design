import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource/noto-naskh-arabic/400.css";
import "./globals.css";
import "./source.css";
import "./taste.css";
import "./studio.css";
import "./model-review.css";
import "./mobile-refinement.css";
import "./fabric-colours.css";
import "./portrait-hero.css";
import "./worn-details.css";
import "./quiet-luxury.css";
import "./commerce-refinements.css";
import "./arc-hero.css";
import "./editorial-hero.css";
import "./brand-polish.css";
import "./invoice.css";
import "./ui-polish.css";
import "./server-commerce.css";
import "./social-videos.css";
import "./atelier-refinement.css";
import "./liquid-controls.css";
import "./cart-drawer.css";
import "./size-assistant.css";
import "./journey-polish.css";
import "leaflet/dist/leaflet.css";
import "./master-polish.css";
import { Shell, ShopProvider } from "../components/Shop";
import { RouteMotion } from "../components/RouteMotion";
export const metadata: Metadata = {
  title: "Aulla Design — Abaya collection · Local preview",
  description:
    "Explore Aulla abayas, original photographs, colour choices and sizing. Local test storefront; no live payments.",
  icons: {
    icon: "/brand/aulla-ad-original-v3-symbol.svg",
    apple: "/brand/aulla-app-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Aulla Design",
    statusBarStyle: "default",
  },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#111626",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <ShopProvider>
          <RouteMotion />
          <Shell>{children}</Shell>
        </ShopProvider>
      </body>
    </html>
  );
}
