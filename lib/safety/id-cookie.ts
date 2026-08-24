import { cookies } from "next/headers";

export type IdListState = {
  actorId: string;
  ids: string[];
};

export async function readIdListCookie(name: string, actorId: string): Promise<IdListState> {
  const store = await cookies();
  const raw = store.get(name)?.value;
  if (!raw) return { actorId, ids: [] };
  try {
    const parsed = JSON.parse(raw) as IdListState;
    if (parsed.actorId !== actorId) return { actorId, ids: [] };
    return { actorId, ids: parsed.ids ?? [] };
  } catch {
    return { actorId, ids: [] };
  }
}

export async function writeIdListCookie(name: string, state: IdListState) {
  const store = await cookies();
  store.set(name, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
