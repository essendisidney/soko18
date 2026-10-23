"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Plays a profile's approved voice intro. Renders nothing if there isn't one you may hear. */
export function VoicePlay({ profileId, name }: { profileId: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!UUID.test(profileId)) return;
    void fetch(`/api/voice/${profileId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { url: string } | null } | null) => setUrl(json?.data?.url ?? null))
      .catch(() => {});
  }, [profileId]);

  if (!url) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const el = audio.current;
        if (!el) return;
        if (el.paused) void el.play();
        else el.pause();
      }}
      className="mt-4 flex w-full items-center gap-3 rounded-3xl border border-gold/40 bg-gold/5 px-4 py-3 text-left"
      aria-label={playing ? "Pause voice intro" : `Play ${name}’s voice intro`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-bg">
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </span>
      <span className="text-sm">Hear {name} say hi</span>
      <audio ref={audio} src={url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </button>
  );
}
