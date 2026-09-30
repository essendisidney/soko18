import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { browseHomeFromCookie, CITY_COOKIE } from "@/lib/geo/city-cookie";

export default async function BrowsePage() {
  const store = await cookies();
  redirect(browseHomeFromCookie(store.get(CITY_COOKIE)?.value));
}
