import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { FREE_DAILY_LIKES } from "@/lib/payments/catalog";

export const metadata: Metadata = {
  title: "Terms",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage kicker="18+" title="Terms">
      <LegalSection title="Who this is for">
        <p>SOKO18 is a dating app for adults in Kenya. You must be 18 or older. On first open you confirm that with your date of birth, and every profile is reviewed before it goes live.</p>
        <p>Use my area finds singles near you at area level only. We never show anyone your precise location.</p>
      </LegalSection>
      <LegalSection title="What’s not allowed">
        <p>SOKO18 is for meeting people, not for selling anything. Offering, requesting or arranging sex for money, gifts, rent, fare or any other payment is banned, and so is advertising escort, massage or “sponsor” services. So are sharing rates, asking for money, or moving someone off the app to pay.</p>
        <p>Profiles and messages that look like paid services are held automatically and reviewed. Accounts that break this rule are removed and may be reported to the authorities.</p>
        <p>Do not involve anyone under 18. Do not impersonate anyone. Do not harass, threaten or scam other members. Do not try to get around review.</p>
      </LegalSection>
      <LegalSection title="The product">
        <p>Profiles go live after review. Photos go upload → scan → review. Unapproved photos never appear on Discover, Browse or public profiles.</p>
        <p>Free members get {FREE_DAILY_LIKES} likes a day, matches and chat. Gold and Platinum add unlimited likes, see who likes you, Super Likes and more. Boosted profiles are shown higher for 30 minutes and are never mixed in more than once every few cards.</p>
      </LegalSection>
      <LegalSection title="Money">
        <p>Plans, Boosts, Super Likes and Incognito are priced in Kenya Shillings and paid by M-Pesa. Nothing is unlocked until the payment posts to our ledger. Plans run for the days shown and do not renew automatically.</p>
        <p>SOKO18 never takes a share of, handles, or guarantees anything between members. Never send money to someone you met here.</p>
      </LegalSection>
      <LegalSection title="Your account">
        <p>You are responsible for what you post. We can pause, suspend or remove an account or profile when safety or these terms require it. Ban and delete end your sessions.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Use Report on any profile or chat, or Settings for export and deletion.</p>
      </LegalSection>
    </LegalPage>
  );
}
