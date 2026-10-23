/** What a trusted contact receives. Plain, calm, no Kutana chat text, and Kenya's emergency numbers. */

export type OutboxRow = {
  id: string;
  kind: "missed_checkin" | "all_clear";
  contact_name: string | null;
  contact_phone: string | null;
  member_name: string;
  place: string;
  starts_at: string;
  check_in_at: string;
};

export function nairobiTime(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function outboxText(row: Pick<OutboxRow, "kind" | "member_name" | "place" | "starts_at">) {
  const who = row.member_name || "Your friend";
  if (row.kind === "all_clear") return `Kutana: ${who} has checked in and is safe. Thank you for being their contact.`;
  return (
    `Kutana safety alert: ${who} planned to meet someone at ${row.place} (${nairobiTime(row.starts_at)}) ` +
    `and hasn't checked in. Please call them now. If you can't reach them, call 999 or 112.`
  );
}
