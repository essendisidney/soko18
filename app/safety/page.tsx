import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Safety",
  robots: { index: true, follow: true },
};

export default function SafetyPage() {
  return (
    <LegalPage kicker="Community" title="Safety">
      <LegalSection title="Rules">
        <p>18+ only. No content involving minors, ever. No impersonation. No harassment. Meet in public if you meet at all — SOKO18 does not arrange meetings.</p>
        <p>Do not share a precise live location. The product shows area, not a pin.</p>
      </LegalSection>
      <LegalSection title="Report and block">
        <p>Every public profile has Report and Block. Threads have the same. A report opens a staff case. Block stops messages both ways. History stays readable to participants.</p>
      </LegalSection>
      <LegalSection title="Photos">
        <p>Nothing is published blindly. Staff review the queue. Owners cannot approve their own photos. Guests never see pending uploads on Discover or Browse.</p>
      </LegalSection>
      <LegalSection title="If something is wrong">
        <p>Use Report on the profile or thread. For your own data, use Settings → Download my data or Delete account.</p>
      </LegalSection>
    </LegalPage>
  );
}
