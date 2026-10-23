import type { Metadata, Viewport } from "next";
import { Geist, Syne } from "next/font/google";
import localFont from "next/font/local";
import { siteUrl } from "@/lib/site";
import { PwaRegister } from "@/components/pwa/register";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// The KUTANA wordmark only: Big Shoulders (SIL OFL) at weight 900, cut down to the letters
// K U T A N (1.3 KB instead of a 36 KB variable font on every page).
const brand = localFont({
  src: "./fonts/kutana-wordmark.woff2",
  variable: "--font-kutana",
  weight: "900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Kutana",
    template: "%s · Kutana",
  },
  description: "Meet real people near you, safely. Private dating in Kenya — no sponsors, pay with M-Pesa.",
  applicationName: "Kutana",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kutana",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#070708",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${syne.variable} ${brand.variable} bg-bg antialiased`}
    >
      <body className="min-h-dvh bg-bg text-cream">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
