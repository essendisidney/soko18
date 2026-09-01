"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/soko/button";
import {
  friendPassUrl,
  hasFriendPass,
  ownFriendPass,
  redeemFriendPass,
} from "@/lib/growth/referral";
import { shareProfile } from "@/lib/profile/share";

export function FriendPassCard() {
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [mine, setMine] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [priority, setPriority] = useState(false);

  useEffect(() => {
    setMine(ownFriendPass());
    setPriority(hasFriendPass());
    const incoming = params.get("pass");
    if (!incoming) return;
    const result = redeemFriendPass(incoming);
    if (result.ok) {
      setPriority(true);
      setNote("Friend pass saved. Staff see you first when you submit.");
    }
  }, [params]);

  return (
    <section className="mt-8">
      <h2 className="text-sm text-muted">Your pass</h2>
      <p className="mt-2 text-sm text-muted">
        A real person vouches. Speeds review. Not a fake committee. Not 2,000 fake wallet credit. Coins after STK — this pass does not mint credit.
      </p>
      <p className="mt-3 font-display text-2xl tracking-[0.2em]">{mine || "————"}</p>
      <Button
        className="mt-3 w-full"
        variant="ghost"
        onClick={() => {
          const url = friendPassUrl(window.location.origin, ownFriendPass());
          void shareProfile("SOKO18 pass", url).then((result) => {
            setNote(result === "copied" || result === "shared" ? "Pass ready to send." : "Couldn’t share.");
          });
        }}
      >
        Share pass
      </Button>
      <label className="mt-4 block">
        <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Someone’s pass</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
        />
      </label>
      <Button
        className="mt-3 w-full"
        variant="ghost"
        onClick={() => {
          const result = redeemFriendPass(code);
          if (!result.ok) {
            setNote(result.reason === "self" ? "That’s your pass." : "Need a real pass.");
            return;
          }
          setPriority(true);
          setNote("Friend pass saved. Staff see you first when you submit.");
        }}
      >
        Redeem
      </Button>
      {priority ? <p className="mt-3 text-xs text-gold">Priority review on.</p> : null}
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
