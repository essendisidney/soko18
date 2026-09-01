import { describe, expect, it } from "vitest";
import { appendMessage, lastOwnReceipt, markThreadRead } from "@/lib/messages/engine";

describe("chat read receipts", () => {
  it("marks the other person’s messages read and leaves own as sent", () => {
    const sent = appendMessage({
      actorId: "a",
      accountA: "a",
      accountB: "b",
      conversationId: "c1",
      body: "Hey",
      blocks: [],
      messages: [],
      now: "2026-08-24T12:00:00.000Z",
      id: "m1",
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const inbound = appendMessage({
      actorId: "b",
      accountA: "a",
      accountB: "b",
      conversationId: "c1",
      body: "Hi",
      blocks: [],
      messages: sent.messages,
      now: "2026-08-24T12:01:00.000Z",
      id: "m2",
    });
    expect(inbound.ok).toBe(true);
    if (!inbound.ok) return;
    expect(lastOwnReceipt(inbound.messages, "c1", "a")).toBe("sent");

    const readByB = markThreadRead(inbound.messages, "c1", "b", "2026-08-24T12:02:00.000Z");
    expect(readByB.changed).toBe(true);
    expect(lastOwnReceipt(readByB.messages, "c1", "a")).toBe("read");
    expect(readByB.messages.find((row) => row.id === "m2")?.readAt).toBeNull();

    const readByA = markThreadRead(readByB.messages, "c1", "a", "2026-08-24T12:03:00.000Z");
    expect(readByA.messages.find((row) => row.id === "m2")?.readAt).toBe("2026-08-24T12:03:00.000Z");
  });
});
