import type { Metadata } from "next";
import { Store } from "@/components/payments/store";

export const metadata: Metadata = {
  title: "Upgrade",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ plan?: string | string[]; paid?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function UpgradePage({ searchParams }: Props) {
  const params = await searchParams;
  return <Store plan={one(params.plan)} paid={one(params.paid)} />;
}
