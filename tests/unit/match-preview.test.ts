import { describe, expect, it } from "vitest";
import {
  applyThreadPreview,
  lastMessageMap,
  matchPreview,
  mergeLastPreview,
} from "@/lib/messages/preview";

describe("match preview", () => {
  it("says hello until there is a message", () => {
    expect(matchPreview(null)).toBe("Say hello");
    expect(matchPreview("   ")).toBe("Say hello");
    expect(matchPreview("Free tonight?")).toBe("Free tonight?");
  });

  it("keeps the newest line per thread", () => {
    const map = lastMessageMap([
      { conversationId: "c1", body: "Hey", createdAt: "2026-08-24T12:00:00.000Z" },
      { conversationId: "c1", body: "Westlands?", createdAt: "2026-08-24T12:05:00.000Z" },
      { conversationId: "c2", body: "Hi", createdAt: "2026-08-24T11:00:00.000Z" },
    ]);
    expect(map.get("c1")?.body).toBe("Westlands?");
    mergeLastPreview(map, "c2", "Later", "2026-08-24T10:00:00.000Z");
    expect(map.get("c2")?.body).toBe("Hi");
  });

  it("hides blocked matches and sorts by last activity", () => {
    const items = applyThreadPreview(
      [
        {
          conversationId: "c1",
          createdAt: "2026-08-24T10:00:00.000Z",
          otherAccountId: "them",
        },
        {
          conversationId: "c2",
          createdAt: "2026-08-24T11:00:00.000Z",
          otherAccountId: "blocked",
        },
      ],
      "me",
      lastMessageMap([
        { conversationId: "c1", body: "Kilimani later", createdAt: "2026-08-24T12:00:00.000Z" },
      ]),
      [{ blockerId: "me", blockedId: "blocked" }],
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.lastMessage).toBe("Kilimani later");
    expect(items[0]?.createdAt).toBe("2026-08-24T12:00:00.000Z");
  });
});
