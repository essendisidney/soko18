import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage kicker="Privacy" title="Privacy">
      <LegalSection title="Who we are">
        <p>SOKO18 is a dating app operated from Nairobi, Kenya. We process personal data under the Kenya Data Protection Act, 2019, and follow equivalent rules (such as the GDPR) for members in other countries.</p>
      </LegalSection>
      <LegalSection title="What we collect and why">
        <p><strong>Account:</strong> email, display name and date of birth — to run your account and confirm you are 18+.</p>
        <p><strong>Profile:</strong> photos, bio, prompts, area and what you’re looking for — to show you to other members.</p>
        <p><strong>Sensitive data:</strong> your gender and who you want to see. We only use these for matching, only with your explicit consent, and never show who you want to see on your profile. You can withdraw consent in Settings.</p>
        <p><strong>Verification:</strong> the selfie you take for the blue check. Only our review team sees it.</p>
        <p><strong>Payments:</strong> product, amount, M-Pesa receipt and phone number. We never see your M-Pesa PIN.</p>
        <p><strong>Safety:</strong> reports, blocks and messages held by our paid-services filter, so we can keep members safe.</p>
      </LegalSection>
      <LegalSection title="Location">
        <p>We keep a city and area only — never a live pin, and we never show anyone’s precise location. Panic and live-location sharing go only to trusted contacts you choose.</p>
      </LegalSection>
      <LegalSection title="Who sees what">
        <p>Other members see your approved photos, first name, age, area, bio and prompts. Photos stay private until approved. With Incognito, only people you like can see you. We do not sell personal data.</p>
        <p>Processors we use: Supabase (database and file storage), Vercel (hosting) and Safaricom M-Pesa (payments). Data may be stored outside Kenya with safeguards required by law.</p>
      </LegalSection>
      <LegalSection title="How long we keep it">
        <p>While your account is open. When you delete your account, your profile disappears immediately and your personal data is erased after 30 days. Anonymous payment records are kept for as long as tax law requires.</p>
      </LegalSection>
      <LegalSection title="Your rights">
        <p>You can download your data, correct it, withdraw consent, or delete your account in Settings at any time. You can also complain to the Office of the Data Protection Commissioner (ODPC) in Kenya.</p>
        <p>Contact us through Report or Settings for any privacy request.</p>
      </LegalSection>
    </LegalPage>
  );
}
