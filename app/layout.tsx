import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Geist, Syne } from "next/font/google";
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

const brand = Big_Shoulders({
  variable: "--font-kutana",
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Kutana",
    template: "%s · Kutana",
  },
  description: "Real, verified people near you. Private dating in Kenya — pay with M-Pesa.",
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
