import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage kicker="18+" title="Terms">
      <LegalSection title="Who this is for">
        <p>SOKO18 is an 18+ local discovery product for Nairobi. You must be 18 or older to use it. By continuing, you confirm that.</p>
        <p>It is not a classifieds board and not a dating app. We own local discovery. Dating products own dating.</p>
      </LegalSection>
      <LegalSection title="The product">
        <p>v1 is live in Nairobi only. Other cities are waitlist until Nairobi has density.</p>
        <p>Profiles are drafts until SOKO18 reviews them. Photos go upload → scan → queue → review. Unapproved media does not appear on Discover, Browse, or public profiles.</p>
        <p>Paid Boost, Spotlight, and Featured are labeled. They cannot buy organic Nairobi Now.</p>
      </LegalSection>
      <LegalSection title="Your account">
        <p>You are responsible for what you post. Do not involve minors. Do not impersonate. Do not try to bypass review.</p>
        <p>We can pause, suspend, or remove an account or listing when safety or these terms require it. Ban and delete revoke sessions.</p>
      </LegalSection>
      <LegalSection title="Money">
        <p>Promotions are priced in Kenya Shillings. A paid flag is not set without a ledger row. Sandbox payment is the working rail until M-Pesa is connected.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Questions: use Report on a profile or thread, or Settings for export and deletion.</p>
      </LegalSection>
    </LegalPage>
  );
}
