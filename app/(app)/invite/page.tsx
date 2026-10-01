import { Suspense } from "react";
import { InviteCard } from "@/components/growth/invite-card";

export const metadata = { title: "Invite friends" };

export default function InvitePage() {
  return (
    <div className="pb-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Invite friends</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Bring your people, get Gold</h1>
      <p className="mt-2 text-sm text-muted">
        Kutana is better with more real people nearby. Every friend who joins and gets approved earns you a week of Gold.
      </p>
      <Suspense fallback={null}>
        <InviteCard />
      </Suspense>
    </div>
  );
}
