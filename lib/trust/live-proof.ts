export type LiveProofKind = "photo" | "voice";
export type LiveProofStatus = "none" | "asked" | "sent";

export type LiveProof = {
  conversationId: string;
  kind: LiveProofKind;
  status: LiveProofStatus;
  at: string;
};

export function canRequestLiveProof(matched: boolean, blocked: boolean) {
  return matched && !blocked;
}

export function requestLiveProof(current: LiveProof | null, conversationId: string, kind: LiveProofKind, now: string): LiveProof {
  if (current?.conversationId === conversationId && current.status === "sent") return current;
  return { conversationId, kind, status: "asked", at: now };
}

export function sendLiveProof(current: LiveProof | null, conversationId: string, kind: LiveProofKind, now: string): LiveProof {
  return { conversationId, kind, status: "sent", at: now };
}

export function liveProofLine(proof: LiveProof | null) {
  if (!proof || proof.status === "none") return "Ask for a live photo or voice in this thread. Not published.";
  if (proof.status === "asked") {
    return proof.kind === "voice" ? "Live voice asked. They record on their device." : "Live photo asked. They capture on their device.";
  }
  return proof.kind === "voice"
    ? "Live voice in this thread only. Not on Discover."
    : "Live proof in this thread only. Not on Discover.";
}
