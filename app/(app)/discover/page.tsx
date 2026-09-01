import { DiscoverDeck } from "@/components/discover/discover-deck";
import { getDiscoverFeed } from "@/lib/discovery/feed";

export default function DiscoverPage() {
  const { items } = getDiscoverFeed({ citySlug: "nairobi", nearArea: "kilimani", gender: "man" });
  return <DiscoverDeck initial={items} />;
}
