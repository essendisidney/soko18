import { StudioHome } from "@/components/studio/studio-home";
import { getStudioOverview } from "@/lib/studio/overview";
import { nairobiGreeting } from "@/lib/nairobi/live";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const result = await getStudioOverview();
  return (
    <StudioHome overview={result.ok ? result.data : null} greeting={nairobiGreeting()} />
  );
}
