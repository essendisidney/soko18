export const COUNTRY_COOKIE = "soko18_country";
export const DEFAULT_COUNTRY = "KE";

/** Format money the local way: KES 499, ₦3,500, $14.99. */
export function formatMoney(amount: number, currency: string, locale = "en") {
  try {
    const whole = ["KES", "UGX", "TZS", "RWF", "XOF", "NGN"].includes(currency);
    return new Intl.NumberFormat(locale === "sw" ? "sw-KE" : locale === "fr" ? "fr-FR" : "en-KE", {
      style: "currency",
      currency,
      currencyDisplay: currency === "KES" ? "code" : "narrowSymbol",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
