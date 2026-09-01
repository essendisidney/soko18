import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/soko/button";
import { FriendPassCard } from "@/components/growth/friend-pass-card";

export default function InvitePage() {
  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Invite</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Friend pass</h1>
      <p className="mt-2 text-sm text-muted">WhatsApp a real person. Staff review first. Empty stays empty.</p>
      <Suspense fallback={null}>
        <FriendPassCard />
      </Suspense>
      <Link href="/discover" className="mt-8 block">
        <Button variant="gold" className="w-full">
          Discover
        </Button>
      </Link>
    </div>
  );
}
