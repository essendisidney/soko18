import type { Metadata } from "next";
import { GiftInbox } from "@/components/gifts/gift-inbox";

export const metadata: Metadata = {
  title: "Gifts",
  robots: { index: false, follow: false },
};

export default function GiftsPage() {
  return (
    <div className="pb-8">
      <h1 className="font-display text-[34px] leading-none tracking-tight">Gifts</h1>
      <p className="mt-2 text-sm text-muted">Kutana perks from your matches. Never cash.</p>
      <GiftInbox />
    </div>
  );
}
