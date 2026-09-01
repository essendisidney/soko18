export const SUBSCRIPTION_CATALOG = {
  basic: {
    amountKes: 5000,
    days: 30,
    title: "Basic",
    line: "ID both sides, two-way ratings, panic, chat receipts.",
  },
  premium: {
    amountKes: 10000,
    days: 30,
    title: "Premium",
    line: "Everything in Basic, plus priority and analytics.",
  },
} as const;

export type SubscriptionKind = keyof typeof SUBSCRIPTION_CATALOG;

export const PROMOTION_CATALOG = {
  boost: { amountKes: 500, hours: 24, ledgerType: "boost" as const, title: "Boost", line: "24 hours on Discover." },
  spotlight: {
    amountKes: 1200,
    hours: 4,
    ledgerType: "spotlight" as const,
    title: "Spotlight",
    line: "4 hours. Available tonight.",
  },
  featured: {
    amountKes: 3500,
    hours: 168,
    ledgerType: "featured" as const,
    title: "Featured",
    line: "7 days, labeled paid.",
  },
} as const;

export const BUNDLE_CATALOG = {
  "spotlight-boost": {
    amountKes: 1500,
    title: "Tonight",
    line: "Spotlight + Boost.",
    kinds: ["spotlight", "boost"] as const,
  },
} as const;

export const PRIVACY_CATALOG = {
  incognito: {
    amountKes: 1500,
    days: 30,
    title: "Incognito",
    line: "Hidden unless you like them first.",
  },
  safety: {
    amountKes: 1000,
    days: 30,
    title: "Safety pack",
    line: "Panic and live share stay in the product. Pack is the add-on price.",
  },
} as const;

export const ACCESS_CATALOG = {
  skip: {
    amountKes: 5000,
    title: "Skip the line",
    line: "Review next after STK. Never a fake queue count.",
  },
  mystery: {
    amountKes: 200,
    title: "Mystery match",
    line: "One random card. No swipe.",
  },
  golden: {
    amountKes: 500,
    title: "Golden Hour",
    line: "8–9pm EAT pin. Not a discounted meet.",
  },
} as const;

/** 100 coins for KES 1,000. Spend after STK. */
export const COIN_PACK = { kes: 1000, coins: 100 } as const;
export const COIN_PRICE = { boost: 50, spotlight: 120 } as const;

/** Local sandbox catalog. Never a paid flag without a ledger row. */
export const LOCAL_ACCESS = {
  skip: ACCESS_CATALOG.skip,
  mystery: ACCESS_CATALOG.mystery,
  golden: ACCESS_CATALOG.golden,
  incognito: PRIVACY_CATALOG.incognito,
  safety: PRIVACY_CATALOG.safety,
  basic: SUBSCRIPTION_CATALOG.basic,
  premium: SUBSCRIPTION_CATALOG.premium,
} as const;
