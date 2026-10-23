import { createClient } from "@/lib/supabase/server";

type AgeGap = { account_id: string; display_name: string | null; age: number; younger_likes: number; younger_intros: number };
type Ring = { voucher_id: string; voucher_name: string | null; vouchee_id: string; vouchee_name: string | null; created_at: string };

/** K1 staff signals: big age gaps in a short window, and vouches between brand-new accounts. */
export async function TrustFlags() {
  const supabase = await createClient();
  const [{ data: gaps }, { data: rings }] = await Promise.all([
    supabase.rpc("staff_age_gap_flags"),
    supabase.rpc("staff_vouch_rings"),
  ]);
  const ageGaps = (gaps as AgeGap[] | null) ?? [];
  const vouchRings = (rings as Ring[] | null) ?? [];

  return (
    <section className="mt-10 max-w-3xl space-y-8">
      <div>
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Age-gap flags · last 24 hours</h2>
        <p className="mt-1 text-xs text-muted">Accounts that liked or messaged 10+ different people at least 10 years younger.</p>
        {ageGaps.length === 0 ? (
          <p className="mt-3 text-sm text-muted">None.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {ageGaps.map((row) => (
              <li key={row.account_id} className="flex justify-between border-b border-line py-1.5">
                <span>
                  {row.display_name ?? "No name"} <span className="text-xs text-muted">{row.age} · {row.account_id.slice(0, 8)}</span>
                </span>
                <span className="text-cream/85">
                  {row.younger_likes} likes · {row.younger_intros} intros
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Vouches between new accounts · 14 days</h2>
        <p className="mt-1 text-xs text-muted">Many vouches among brand-new accounts can mean a ring. Check them before trusting the badge.</p>
        {vouchRings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">None.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {vouchRings.map((row) => (
              <li key={`${row.voucher_id}-${row.vouchee_id}`} className="flex justify-between border-b border-line py-1.5">
                <span>
                  {row.voucher_name ?? row.voucher_id.slice(0, 8)} → {row.vouchee_name ?? row.vouchee_id.slice(0, 8)}
                </span>
                <span className="text-xs text-muted">{new Date(row.created_at).toLocaleDateString("en-KE")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
