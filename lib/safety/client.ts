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

export async function postEmergency(
  kind: "panic" | "share",
  input: { lat: number; lng: number; name: string; phone: string },
) {
  const res = await fetch(kind === "panic" ? "/api/safety/panic" : "/api/safety/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => null)) as { data?: { delivered?: boolean } } | null;
  return { ok: res.ok, status: res.status, delivered: Boolean(json?.data?.delivered) };
}

export function readDeviceLocation() {
  return new Promise<GeolocationPosition | null>((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
