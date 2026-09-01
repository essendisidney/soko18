import Link from "next/link";
import { Button } from "@/components/soko/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div>
        <p className="font-display text-3xl tracking-tight">Not here</p>
        <p className="mt-3 text-sm text-muted">This profile isn’t available.</p>
        <Link href="/discover" className="mt-8 inline-block">
          <Button variant="gold">Discover</Button>
        </Link>
      </div>
    </main>
  );
}
