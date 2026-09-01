import Link from "next/link";
import { Button } from "@/components/soko/button";

export default function StudioSettingsPage() {
  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-muted">Indexing is off until you turn it on.</p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-line">
        <Link
          href="/studio/profile"
          className="flex items-center justify-between border-b border-line px-5 py-4 text-sm"
        >
          Public search indexing
          <span className="text-muted">Profile</span>
        </Link>
        <Link href="/settings" className="flex items-center justify-between px-5 py-4 text-sm">
          Account privacy
          <span className="text-muted">Settings</span>
        </Link>
      </div>

      <Link href="/discover" className="mt-8 block">
        <Button variant="gold" className="w-full">
          Discover
        </Button>
      </Link>
      <Link href="/studio" className="mt-6 inline-block text-sm text-muted">
        Back
      </Link>
    </div>
  );
}
