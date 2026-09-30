import { Suspense } from "react";
import { Store } from "@/components/payments/store";

export const dynamic = "force-dynamic";

export default function StudioPromotionsPage() {
  return (
    <Suspense fallback={null}>
      <Store />
    </Suspense>
  );
}
