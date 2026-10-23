import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { DatePlanner } from "@/components/safety/date-plan";

export const metadata: Metadata = {
  title: "Date plan",
  robots: { index: false, follow: false },
};

export default function DatePlanPage() {
  return (
    <LegalPage kicker="Safety" title="Date plan">
      <LegalSection title="How it works">
        <p>Tell us where and when you’re meeting, who to tell, and when you’ll check in. At check-in time we’ll ask if you’re OK. If you don’t answer, your contact gets the plan so they can call you. Free for everyone.</p>
      </LegalSection>
      <DatePlanner />
    </LegalPage>
  );
}
