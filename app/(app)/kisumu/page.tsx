import type { Metadata } from "next";
import { WaitlistHome } from "@/components/city/waitlist-home";
import { KISUMU, KISUMU_AREAS } from "@/lib/data/kisumu";

export const metadata: Metadata = {
  title: "Kisumu",
  description: "SOKO18 is live in Nairobi first. Kisumu opens when Nairobi has density.",
  robots: { index: false, follow: true },
};

export default function KisumuPage() {
  return (
    <WaitlistHome
      name={KISUMU.name}
      slug={KISUMU.slug}
      areas={KISUMU_AREAS}
      areaBase="/kisumu"
    />
  );
}
