import { cookies } from "next/headers";
import { DiscoverDeck } from "@/components/discover/discover-deck";
import { discoverFeedLive } from "@/lib/discovery/live";
import { CITY_COOKIE, parseCityCookie } from "@/lib/geo/city-cookie";

export default async function DiscoverPage() {
  const store = await cookies();
  const citySlug = parseCityCookie(store.get(CITY_COOKIE)?.value);
  const { items } = await discoverFeedLive({
    citySlug,
    nearArea: citySlug === "nairobi" ? "kilimani" : null,
    gender: "any",
  });
  return <DiscoverDeck initial={items} />;
}
