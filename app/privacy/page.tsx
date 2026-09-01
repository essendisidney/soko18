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
        <p>On first open we check that your date of birth is 18+. We do not store that date on the device. Use my area reads your position once and stores only a city and area name — never a live pin, never another person’s coordinates. Signed-in profiles keep a birth year. Identity evidence for Verified stays off public pages and is not a public bucket. We do not put national ID numbers in the public product.</p>
      </LegalSection>
      <LegalSection title="Location">
        <p>Presence is area-level only — Kilimani, Nyali, not a live pin on Discover. Use my area reads the device once. Panic and live location go only to a trusted contact you name. SOKO18 does not put other people’s GPS on a map.</p>
      </LegalSection>
      <LegalSection title="Photos and search">
        <p>Photos are sensitive. They are not published until approved. Public search indexing is off until you turn it on.</p>
      </LegalSection>
      <LegalSection title="Messages and analytics">
        <p>We do not store message bodies or media URLs in analytics. Impressions, likes, and matches can update daily studio stats.</p>
      </LegalSection>
      <LegalSection title="Discretion">
        <p>Use a username, not a legal name. Incognito hides you unless you like first. Contact blocks are stored as hashes — not your phone book. We do not invent a 100,000-person waitlist. Skip the line is a paid review bump when M-Pesa is live.</p>
        <p>This PWA cannot stop every screenshot. Native builds use capture prevention. Print Screen on web is logged in the thread as a notice.</p>
      </LegalSection>
      <LegalSection title="Your controls">
        <p>Export and delete are in Settings. Delete is a soft removal of the account and profile, then a global sign-out. Hide last-seen and indexing stay in Settings.</p>
        <p>Report and block are on profiles and in threads. Block severs send both ways.</p>
      </LegalSection>
    </LegalPage>
  );
}
