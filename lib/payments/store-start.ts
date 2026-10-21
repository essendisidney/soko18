import { PLAN_SKUS, type Sku } from "@/lib/payments/catalog";

/**
 * Which plan the store opens on. Buttons say "Gold · from KES 149", so they link to
 * /upgrade?plan=gold_week and the store opens on exactly that. Anything else opens on Gold 30 days.
 */
export function storeStart(plan: string | null): { tier: "gold" | "platinum"; sku: Sku } {
  const sku = (PLAN_SKUS as readonly string[]).includes(plan ?? "") ? (plan as Sku) : "gold_month";
  return { tier: sku.startsWith("platinum") ? "platinum" : "gold", sku };
}
