/**
 * "Didn't get the prompt? Try again" must never charge twice. An M-Pesa prompt stays open on the
 * phone for about a minute, so while one for the same thing and the same number is still open we
 * hand back that payment instead of sending a second prompt.
 */
export const PROMPT_OPEN_MS = 90_000;

export type PendingPrompt = {
  id: string;
  sku: string;
  phone: string | null;
  status: string;
  provider: string;
  created_at: string;
  amount: number | string;
  currency: string;
};

export function reusablePrompt(rows: PendingPrompt[], sku: string, phone: string | null, now = Date.now()) {
  if (!phone) return null;
  return (
    rows.find(
      (row) =>
        row.status === "pending" &&
        row.sku === sku &&
        row.phone === phone &&
        (row.provider === "mpesa" || row.provider === "intasend") &&
        now - new Date(row.created_at).getTime() < PROMPT_OPEN_MS,
    ) ?? null
  );
}
