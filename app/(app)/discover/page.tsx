import { cookies } from "next/headers";
import { DiscoverDeck } from "@/components/discover/discover-deck";
import { getDiscoverFeed } from "@/lib/discovery/feed";
import { CITY_COOKIE, parseCityCookie } from "@/lib/geo/city-cookie";

export default async function DiscoverPage() {
  const store = await cookies();
  const citySlug = parseCityCookie(store.get(CITY_COOKIE)?.value);
  const { items } = getDiscoverFeed({
    citySlug,
    nearArea: citySlug === "nairobi" ? "kilimani" : null,
    gender: "man",
  });
  return <DiscoverDeck initial={items} />;
}
