import { DiscoverDeck } from "@/components/discover/discover-deck";
import { getDiscoverFeed } from "@/lib/discovery/feed";
import { activeNow } from "@/lib/nairobi/live";

export default function DiscoverPage() {
  const { items } = getDiscoverFeed({ citySlug: "nairobi", nearArea: "kilimani" });
  const live = activeNow();
  return <DiscoverDeck initial={items} subtitle={`Nairobi · ${live.city} active now`} />;
}
