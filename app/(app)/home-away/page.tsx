import type { Metadata } from "next";
import { HomeAwayPanel } from "@/components/diaspora/home-away-panel";

export const metadata: Metadata = {
  title: "Home & Away",
  robots: { index: false, follow: false },
};

export default function HomeAwayPage() {
  return (
    <div className="pb-8">
      <h1 className="font-display text-[34px] leading-none tracking-tight">Home &amp; Away</h1>
      <p className="mt-2 text-sm text-muted">For Kenyans abroad: meet people at home, or before you fly in.</p>
      <HomeAwayPanel />
    </div>
  );
}
