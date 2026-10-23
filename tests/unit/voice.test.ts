import { describe, expect, it } from "vitest";
import { clipLength, pickVoiceFormat, VOICE_BITS_PER_SECOND, VOICE_MAX_MS } from "@/lib/voice/shared";

describe("voice intros", () => {
  it("records Opus where it can, AAC on Safari, nothing where it can't", () => {
    expect(pickVoiceFormat((m) => m.startsWith("audio/webm"))?.ext).toBe("webm");
    expect(pickVoiceFormat((m) => m === "audio/mp4")?.ext).toBe("m4a");
    expect(pickVoiceFormat(() => false)).toBeNull();
  });

  it("stays small: 15 seconds at low bitrate is well under the 300 KB bucket limit", () => {
    expect(VOICE_MAX_MS).toBe(15_000);
    expect(((VOICE_BITS_PER_SECOND / 8) * VOICE_MAX_MS) / 1000).toBeLessThan(300 * 1024);
  });

  it("shows clip length", () => {
    expect(clipLength(7_200)).toBe("0:07");
    expect(clipLength(15_000)).toBe("0:15");
    expect(clipLength(-5)).toBe("0:00");
  });
});
