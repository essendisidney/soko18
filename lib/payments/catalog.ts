/**
 * What SOKO18 sells. Mirrors `public.products` (supabase/migrations/00010_dating_pivot.sql).
 * The database price is the one that counts — a transaction whose amount doesn't match is refused.
 *
 * Everyone is a member and everyone can pay. We sell visibility, reach and privacy.
 * We never take a cut of anything arranged between members.
 */

export type ProductKind = "plan" | "boost" | "super_like" | "incognito";
export type PlanTier = "gold" | "platinum";

export type Product = {
  sku: string;
  title: string;
  line: string;
  amountKes: number;
  kind: ProductKind;
  plan?: PlanTier;
  days?: number;
  quantity: number;
  bonusSuperLikes?: number;
  bonusBoosts?: number;
};

export const PRODUCTS = {
  gold_week: {
    sku: "gold_week",
    title: "Gold · 7 days",
    line: "Unlimited likes, see who likes you, 3 Super Likes.",
    amountKes: 149,
    kind: "plan",
    plan: "gold",
    days: 7,
    quantity: 1,
    bonusSuperLikes: 3,
  },
  gold_month: {
    sku: "gold_month",
    title: "Gold · 30 days",
    line: "Unlimited likes, see who likes you, 5 Super Likes.",
    amountKes: 499,
    kind: "plan",
    plan: "gold",
    days: 30,
    quantity: 1,
    bonusSuperLikes: 5,
  },
  platinum_month: {
    sku: "platinum_month",
    title: "Platinum · 30 days",
    line: "Gold, plus Incognito, a free Boost and 10 Super Likes.",
    amountKes: 999,
    kind: "plan",
    plan: "platinum",
    days: 30,
    quantity: 1,
    bonusSuperLikes: 10,
    bonusBoosts: 1,
  },
  boost_1: {
    sku: "boost_1",
    title: "Boost",
    line: "Top of the deck in your area for 30 minutes.",
    amountKes: 99,
    kind: "boost",
    quantity: 1,
  },
  boost_5: {
    sku: "boost_5",
    title: "5 Boosts",
    line: "Five 30-minute Boosts. Use them any time.",
    amountKes: 399,
    kind: "boost",
    quantity: 5,
  },
  super_1: {
    sku: "super_1",
    title: "Super Like",
    line: "They see you liked them before they swipe.",
    amountKes: 49,
    kind: "super_like",
    quantity: 1,
  },
  super_5: {
    sku: "super_5",
    title: "5 Super Likes",
    line: "Five Super Likes.",
    amountKes: 199,
    kind: "super_like",
    quantity: 5,
  },
  incognito_month: {
    sku: "incognito_month",
    title: "Incognito · 30 days",
    line: "Only people you like can see you.",
    amountKes: 299,
    kind: "incognito",
    days: 30,
    quantity: 1,
  },
} as const satisfies Record<string, Product>;

export type Sku = keyof typeof PRODUCTS;
export const SKUS = Object.keys(PRODUCTS) as [Sku, ...Sku[]];

export const PLAN_SKUS = ["gold_week", "gold_month", "platinum_month"] as const satisfies readonly Sku[];
export const BOOST_SKUS = ["boost_1", "boost_5"] as const satisfies readonly Sku[];
export const SUPER_LIKE_SKUS = ["super_1", "super_5"] as const satisfies readonly Sku[];

/** Free members get this many likes per Nairobi day. Gold and Platinum are unlimited. */
export const FREE_DAILY_LIKES = 30;

/** Minutes a single Boost keeps you at the top of the local deck. */
export const BOOST_MINUTES = 30;

/** Ledger purpose written on the transaction row for each product kind. */
export function ledgerPurpose(product: Product) {
  if (product.kind === "plan") return product.plan ?? "gold";
  return product.kind;
}

/** What each plan unlocks. Used on the upgrade screen. */
export const PLAN_FEATURES: Record<"free" | PlanTier, readonly string[]> = {
  free: [`${FREE_DAILY_LIKES} likes a day`, "Matches and chat", "ID verification and safety tools"],
  gold: ["Unlimited likes", "See who likes you", "Super Likes included"],
  platinum: ["Everything in Gold", "Incognito included", "A free Boost", "10 Super Likes"],
};

/**
 * Local sandbox purchases for when Supabase isn't connected (seed mode).
 * Never a paid flag without a ledger row.
 */
export const LOCAL_ACCESS = {
  gold: PRODUCTS.gold_month,
  incognito: PRODUCTS.incognito_month,
} as const;
