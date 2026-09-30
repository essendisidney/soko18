import Link from "next/link";
import { SnappedCityKicker } from "@/components/city/city-door";
import { Button } from "@/components/soko/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div>
        <SnappedCityKicker className="text-[13px] tracking-[0.2em] text-gold uppercase" />
        <p className="mt-3 font-display text-3xl tracking-tight">Not here</p>
        <p className="mt-3 text-sm text-muted">This profile isn’t available.</p>
        <Link href="/discover" className="mt-8 inline-block">
          <Button variant="gold">Discover</Button>
        </Link>
      </div>
    </main>
  );
}
