import { StudioHome } from "@/components/studio/studio-home";
import { getStudioOverview } from "@/lib/studio/overview";

export const dynamic = "force-dynamic";

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function StudioPage() {
  const result = await getStudioOverview();
  return (
    <StudioHome overview={result.ok ? result.data : null} greeting={greeting(new Date())} />
  );
}
