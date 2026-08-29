export type DiscoverAction = {
  profileId: string;
  kind: "pass" | "like" | "spotlight";
  at: number;
};

export const ACTIONS_KEY = "soko18_discover_actions";
const PASS_MS = 30 * 24 * 60 * 60 * 1000;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listen) => listen());
}

export function subscribeDiscoverActions(onChange: () => void) {
  listeners.add(onChange);
  function handle(event: StorageEvent) {
    if (event.key === ACTIONS_KEY) onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}

export function actionsSnapshot() {
  return localStorage.getItem(ACTIONS_KEY);
}

export function readDiscoverActions(): DiscoverAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DiscoverAction[];
  } catch {
    return [];
  }
}

export function writeDiscoverAction(action: DiscoverAction) {
  const cutoff = Date.now() - PASS_MS;
  const next = readDiscoverActions()
    .filter((row) => row.profileId !== action.profileId)
    .filter((row) => row.kind !== "pass" || row.at >= cutoff);
  next.push(action);
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(next));
  emit();
}

export function lastPass(): DiscoverAction | null {
  const passes = readDiscoverActions().filter((row) => row.kind === "pass");
  if (!passes.length) return null;
  return passes.reduce((latest, row) => (row.at >= latest.at ? row : latest));
}

export function undoLastPass() {
  const last = lastPass();
  if (!last) return null;
  const next = readDiscoverActions().filter(
    (row) => !(row.profileId === last.profileId && row.kind === "pass" && row.at === last.at),
  );
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(next));
  emit();
  return last.profileId;
}

export function excludedProfileIds() {
  return readDiscoverActions().map((row) => row.profileId);
}
