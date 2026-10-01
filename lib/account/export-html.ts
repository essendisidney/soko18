/**
 * Turn the data export into a readable, printable page (opens in any browser, "Save as PDF").
 * Pure string building — every value is escaped.
 */

type Row = Record<string, unknown>;

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+)?/;

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO.test(value) && value.length > 10) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((item) => (item && typeof item === "object" ? Object.values(item as Row).map(show).join(": ") : show(item)))
      .join("; ");
  }
  if (typeof value === "object") return Object.entries(value as Row).map(([k, v]) => `${label(k)}: ${show(v)}`).join(", ");
  if (typeof value === "string" && /^[a-z]+(_[a-z0-9]+)+$/.test(value)) {
    const words = value.replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return String(value);
}

const LABELS: Record<string, string> = {
  amount_kes: "Amount (KES)",
  sku: "Item",
  slug: "Profile link",
  created_at: "Date",
  settled_at: "Paid at",
};

function label(key: string) {
  if (LABELS[key]) return LABELS[key];
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function keyValues(obj: Row | null | undefined) {
  if (!obj) return `<p class="empty">Nothing here yet.</p>`;
  const rows = Object.entries(obj)
    .filter(([k]) => k !== "id")
    .map(([k, v]) => `<tr><th>${esc(label(k))}</th><td>${esc(show(v))}</td></tr>`)
    .join("");
  return `<table class="kv">${rows}</table>`;
}

function table(rows: Row[] | undefined) {
  if (!rows || rows.length === 0) return `<p class="empty">None.</p>`;
  const cols = Object.keys(rows[0]).filter((k) => k !== "id");
  const head = cols.map((c) => `<th>${esc(label(c))}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${esc(show(r[c]))}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

const SECTIONS: { key: string; title: string; note?: string }[] = [
  { key: "consents", title: "Your consent choices" },
  { key: "subscriptions", title: "Plans" },
  { key: "payments", title: "Payments" },
  { key: "media", title: "Photos", note: "Your photos are stored privately. Paths are listed here." },
  { key: "likes", title: "Likes you sent" },
  { key: "introsSent", title: "Messages sent before matching" },
  { key: "messagesSent", title: "Messages you sent" },
  { key: "verification", title: "Verification" },
  { key: "reportsMade", title: "Reports you made" },
  { key: "blocked", title: "People you blocked" },
];

export function exportToHtml(data: Row) {
  const exported = show(data.exportedAt);
  const sections = SECTIONS.map(
    (s) =>
      `<section><h2>${esc(s.title)} <span class="count">${Array.isArray(data[s.key]) ? (data[s.key] as unknown[]).length : 0}</span></h2>${
        s.note ? `<p class="note">${esc(s.note)}</p>` : ""
      }${table(data[s.key] as Row[])}</section>`,
  ).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your SOKO data</title>
<style>
  :root { color-scheme: light; }
  body { font: 15px/1.5 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #faf8f3; margin: 0; padding: 24px 16px 48px; }
  main { max-width: 760px; margin: 0 auto; }
  header { border-bottom: 2px solid #d4b56a; padding-bottom: 16px; margin-bottom: 8px; }
  .brand { font-weight: 800; letter-spacing: .02em; font-size: 22px; }
  h1 { font-size: 26px; margin: 8px 0 4px; }
  h2 { font-size: 17px; margin: 28px 0 8px; }
  .count { font-size: 12px; font-weight: 600; background: #efe6cf; color: #6b5622; border-radius: 99px; padding: 1px 8px; vertical-align: middle; }
  .muted, .note { color: #6b6b6b; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e7e2d6; border-radius: 10px; overflow: hidden; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #efebe2; vertical-align: top; }
  thead th { background: #f4efe3; font-weight: 600; white-space: nowrap; }
  .kv th { width: 38%; background: #f9f6ef; font-weight: 600; }
  .scroll { overflow-x: auto; }
  .empty { color: #8a8a8a; font-style: italic; margin: 4px 0; }
  .actions { margin: 16px 0 0; }
  button { font: inherit; background: #1a1a1a; color: #fff; border: 0; border-radius: 99px; padding: 10px 18px; cursor: pointer; }
  footer { margin-top: 36px; font-size: 12px; color: #8a8a8a; }
  @media print { body { background: #fff; padding: 0; } .actions { display: none; } table { break-inside: auto; } tr { break-inside: avoid; } }
</style></head>
<body><main>
<header>
  <div class="brand">SOKO</div>
  <h1>Your data</h1>
  <p class="muted">Everything we hold about your account, exported ${esc(exported)}.</p>
  <div class="actions"><button onclick="window.print()">Save as PDF / Print</button></div>
</header>
<section><h2>Account</h2>${keyValues(data.account as Row)}</section>
<section><h2>Profile</h2>${keyValues(data.profile as Row | null)}</section>
${sections}
<footer>You can correct your details or delete your account any time in Settings. Questions or complaints: you can also contact Kenya’s Office of the Data Protection Commissioner (ODPC).</footer>
</main></body></html>`;
}
