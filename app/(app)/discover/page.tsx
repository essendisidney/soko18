import { DiscoverDeck } from "@/components/discover/discover-deck";
import { getDiscoverFeed } from "@/lib/discovery/feed";
import { nairobiPlaceLine } from "@/lib/nairobi/live";

export default function DiscoverPage() {
  const { items } = getDiscoverFeed({ citySlug: "nairobi", nearArea: "kilimani" });
  return <DiscoverDeck initial={items} subtitle={nairobiPlaceLine()} />;
}
