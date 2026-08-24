export type LikeKind = "pass" | "like" | "spotlight";

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
    return { ok: false as const, status: res.status };
  }
  return { ok: true as const, data: json.data };
}
