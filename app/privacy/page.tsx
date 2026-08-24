import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage kicker="ODPC" title="Privacy">
      <LegalSection title="What we collect">
        <p>The minimum to run discovery in Nairobi: account email when you sign in, a display name, birth year, area, bio, and photos you upload.</p>
        <p>We do not put national ID numbers in the public product. Verification evidence stays off public pages and is not a public bucket.</p>
      </LegalSection>
      <LegalSection title="Location">
        <p>Presence is area-level only — Kilimani, Westlands, not a live pin. SOKO18 does not use precise real-time GPS in the product.</p>
      </LegalSection>
      <LegalSection title="Photos and search">
        <p>Photos are sensitive. They are not published until approved. Public search indexing is off until you turn it on.</p>
      </LegalSection>
      <LegalSection title="Messages and analytics">
        <p>We do not store message bodies or media URLs in analytics. Impressions, likes, and matches can update daily studio stats.</p>
      </LegalSection>
      <LegalSection title="Your controls">
        <p>Export and delete are in Settings. Delete is a soft removal of the account and profile, then a global sign-out. Hide last-seen and indexing stay in Settings.</p>
        <p>Report and block are on profiles and in threads. Block severs send both ways.</p>
      </LegalSection>
    </LegalPage>
  );
}
