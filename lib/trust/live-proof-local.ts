import type { LiveProof } from "@/lib/trust/live-proof";

const KEY = "soko18_live_proof";

export function readLiveProof(conversationId: string): LiveProof | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, LiveProof>;
    return parsed[conversationId] ?? null;
  } catch {
    return null;
  }
}

export function writeLiveProof(proof: LiveProof) {
  let parsed: Record<string, LiveProof> = {};
  try {
    parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, LiveProof>;
  } catch {
    parsed = {};
  }
  parsed[proof.conversationId] = proof;
  localStorage.setItem(KEY, JSON.stringify(parsed));
}
