import { NextResponse } from "next/server";
import { getMarket, pricesFor, resolveCountry } from "@/lib/markets/server";

export async function GET() {
  const country = await resolveCountry();
  const [market, prices] = await Promise.all([getMarket(country), pricesFor(country)]);
  return NextResponse.json({
    data: {
      country,
      market: market
        ? { name: market.name, status: market.status, currency: market.currency, providers: market.payment_providers }
        : { name: "Kenya", status: "live", currency: "KES", providers: ["mpesa"] },
      prices,
    },
  });
}
