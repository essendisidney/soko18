"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { accountRole, useAuth } from "@/lib/auth/use-auth";
import { isStaffRole } from "@/lib/admin/roles";
import { signOutAction } from "@/lib/auth/actions";
import { useDraftProfile } from "@/lib/profile/use-draft";

const rows = [
  { href: "/studio", label: "SOKO18 Studio" },
  { href: "/admin", label: "Admin" },
  { href: "/settings", label: "Settings" },
  { href: "/nairobi", label: "Nairobi" },
  { href: "/onboarding/city", label: "Other cities" },
];

export default function MePage() {
  const { user, ready, configured } = useAuth();
  const role = accountRole(user);
  const draft = useDraftProfile();
  const [gate, setGate] = useState(false);
  const router = useRouter();

  return (
    <div>
      <Wordmark />
      <h1 className="mt-8 font-display text-[34px] tracking-tight">Me</h1>
      <p className="mt-2 text-sm text-muted">
        {user ? "Account, safety, and business tools." : "Discovering as a guest."}
      </p>

      {ready && user ? (
        <div className="mt-6 rounded-3xl border border-line px-5 py-4">
          <p className="text-sm">{user.email}</p>
          {role ? <p className="mt-1 text-xs text-muted">{role}</p> : null}
          <form action={signOutAction} className="mt-4">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <Link href="/login?next=/me">
            <Button className="w-full" variant="gold">
              Sign in
            </Button>
          </Link>
          <Link href="/signup?next=/me">
            <Button className="w-full" variant="ghost">
              Create account
            </Button>
          </Link>
          {!configured ? (
            <p className="text-xs leading-relaxed text-muted">
              Accounts open when the backend is connected. Guest discover stays open.
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6">
        {draft ? (
          <Link href="/studio/profile">
            <Button className="w-full" variant="ghost">
              Edit profile
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => {
              if (configured && ready && !user) {
                setGate(true);
                return;
              }
              router.push("/studio/profile");
            }}
          >
            Create profile
          </Button>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-line">
        {rows
          .filter((row) => row.href !== "/admin" || isStaffRole(role))
          .map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="flex items-center justify-between border-b border-line px-5 py-4 last:border-b-0"
          >
            {row.label}
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-muted">
        SOKO18 is 18+. Report, block, and privacy controls are always available from a profile or thread.
      </p>
      <AnimatePresence>
        {gate ? <AuthGate intent="profile" onClose={() => setGate(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}
