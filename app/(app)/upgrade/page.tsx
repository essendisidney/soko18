import type { Metadata } from "next";
import { Suspense } from "react";
import { Store } from "@/components/payments/store";

export const metadata: Metadata = {
  title: "Upgrade",
  robots: { index: false, follow: false },
};

export default function UpgradePage() {
  return (
    <Suspense fallback={null}>
      <Store />
    </Suspense>
  );
}
