import type { Metadata, Viewport } from "next";
import { Geist, Syne } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "SOKO18",
    template: "%s · SOKO18",
  },
  description: "Discover. Connect. Verify. Nairobi local discovery.",
  applicationName: "SOKO18",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SOKO18",
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
      className={`${geist.variable} ${syne.variable} bg-bg antialiased`}
    >
      <body className="min-h-dvh bg-bg text-cream">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
