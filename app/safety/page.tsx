import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { SafetyTools } from "@/components/safety/safety-tools";
import { IdentitySubmit } from "@/components/trust/identity-submit";

export const metadata: Metadata = {
  title: "Safety",
  robots: { index: true, follow: true },
};

export default function SafetyPage() {
  return (
    <LegalPage kicker="Community" title="Safety">
      <LegalSection title="What you pay for">
        <p>Matching and chatting are free. Gold adds extras: see who likes you, unlimited likes, Rewind and Super Likes. Safety tools — selfie verification, report, block and panic to a trusted contact — are free for everyone.</p>
      </LegalSection>
      <LegalSection title="Rules">
        <p>18+ only. Date of birth at the door. Identity review on both sides for Verified. No content involving minors, ever. No impersonation. No harassment. Meet in public if you meet at all — Kutana does not arrange meetings.</p>
        <p>Discover is area-level. Panic and live location go only to a trusted contact you set — not a public map.</p>
      </LegalSection>
      <LegalSection title="Report and block">
        <p>Every public profile has Report and Block. Threads have the same. A report opens a staff case. Block stops messages both ways. History stays readable to participants.</p>
      </LegalSection>
      <LegalSection title="Photos">
        <p>Photos show as soon as you add them. Our team checks every new profile and photo, and removes anything fake, explicit or paid. If you see something wrong, tap Report — it goes straight to us.</p>
      </LegalSection>
      <LegalSection title="If something is wrong">
        <p>Use Report on the profile or thread. Panic is on this page after you save a trusted contact. For your own data, use Settings → Download my data or Delete account.</p>
      </LegalSection>
      <IdentitySubmit />
      <SafetyTools />
    </LegalPage>
  );
}
