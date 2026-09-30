import type { Metadata } from "next";
import { Store } from "@/components/payments/store";

export const metadata: Metadata = {
  title: "Upgrade",
  robots: { index: false, follow: false },
};

export default function UpgradePage() {
  return <Store />;
}
