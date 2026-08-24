export async function postFavorite(profileId: string, saved: boolean) {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, saved }),
  });
  return { ok: res.ok, status: res.status };
}

export async function postBlock(profileId: string, blocked: boolean) {
  const res = await fetch("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, blocked }),
  });
  return { ok: res.ok, status: res.status };
}

export async function postProfileReport(profileId: string, reason: string) {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, reason }),
  });
  return { ok: res.ok, status: res.status };
}
