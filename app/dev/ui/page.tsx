import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { Chip } from "@/components/soko/chip";
import { StatCard } from "@/components/soko/stat-card";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { ProfileCard } from "@/components/soko/profile-card";
import { PROFILES } from "@/lib/data/seed";

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-md space-y-10 bg-bg px-5 py-10">
      <Wordmark size="lg" />
      <section>
        <h1 className="font-display text-3xl">Design system</h1>
        <p className="mt-2 text-sm text-muted">Phase 02 · tokens and components only.</p>
      </section>
      <section className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        <Button variant="gold">Gold</Button>
        <Button variant="ghost">Ghost</Button>
      </section>
      <section className="flex gap-2">
        <Chip selected>Selected</Chip>
        <Chip>Idle</Chip>
        <VerificationBadge />
      </section>
      <StatCard label="Profile views" value="4,821" delta="↑ 18%" />
      <div className="h-[420px]">
        <ProfileCard profile={PROFILES[0]} />
      </div>
    </main>
  );
}
