export type LikeKind = "pass" | "like" | "super";

export async function postLike(profileId: string, kind: LikeKind) {
  const res = await fetch("/api/likes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, kind }),
  });
  const json = (await res.json().catch(() => null)) as
    | { data?: { matched: boolean; isNew: boolean; matchId?: string; conversationId?: string } }
    | { error?: { code: string; message: string } }
    | null;
  if (!res.ok || !json || !("data" in json) || !json.data) {
    const code = json && "error" in json && json.error ? json.error.code : null;
    const message = json && "error" in json && json.error ? json.error.message : null;
    return { ok: false as const, status: res.status, code, message };
  }
  return { ok: true as const, data: json.data };
}
