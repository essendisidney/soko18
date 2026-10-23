"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { createClient } from "@/lib/supabase/client";
import { clipLength, pickVoiceFormat, VOICE_BITS_PER_SECOND, VOICE_MAX_MS, type MyVoice } from "@/lib/voice/shared";

type Take = { blob: Blob; url: string; ms: number; contentType: string; ext: string };

const STATUS: Record<NonNullable<MyVoice>["status"], string> = {
  pending: "Waiting for a quick check before people can hear it.",
  approved: "Live on your profile.",
  rejected: "Not approved. Record a new one: keep it about you, no offers or contact details.",
};

/** Record a 15-second voice intro in any language. Small (Opus, mono) and checked by a person first. */
export function VoiceRecorder() {
  const { user, configured } = useAuth();
  const [mine, setMine] = useState<MyVoice>(null);
  const [take, setTake] = useState<Take | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/voice")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: MyVoice } | null) => setMine(json?.data ?? null))
      .catch(() => {});
  }, [user]);

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

  if (!configured || !user) return null;

  async function start() {
    setNote("");
    const format = typeof MediaRecorder === "undefined" ? null : pickVoiceFormat((m) => MediaRecorder.isTypeSupported(m));
    if (!format) return setNote("This browser can’t record audio. Try Chrome or Safari.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      return setNote("Allow the microphone to record your intro.");
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream, { mimeType: format.mime, audioBitsPerSecond: VOICE_BITS_PER_SECOND });
    const began = Date.now();
    const tick = window.setInterval(() => {
      const ms = Date.now() - began;
      setElapsed(ms);
      if (ms >= VOICE_MAX_MS && rec.state === "recording") rec.stop();
    }, 200);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      window.clearInterval(tick);
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const ms = Math.min(Date.now() - began, VOICE_MAX_MS);
      if (ms < 1000) return setNote("Too short. Say a little more.");
      const blob = new Blob(chunks, { type: format.contentType });
      setTake({ blob, url: URL.createObjectURL(blob), ms, contentType: format.contentType, ext: format.ext });
    };
    recorder.current = rec;
    rec.start(250);
    setElapsed(0);
    setRecording(true);
  }

  async function save() {
    if (!take || !user) return;
    setBusy(true);
    const path = `${user.id}/${crypto.randomUUID()}.${take.ext}`;
    const { error } = await createClient().storage.from("voice").upload(path, take.blob, { contentType: take.contentType, upsert: false });
    if (error) {
      setBusy(false);
      return setNote("Upload failed. Try again on a better connection.");
    }
    const old = mine?.path;
    const res = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, durationMs: Math.round(take.ms) }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok) return setNote(json?.error?.message ?? "Could not save.");
    if (old && old !== path) void createClient().storage.from("voice").remove([old]);
    URL.revokeObjectURL(take.url);
    setTake(null);
    setMine({ status: "pending", durationMs: Math.round(take.ms), path });
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/voice", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setMine(null);
  }

  return (
    <section className="rounded-3xl border border-line p-4" aria-label="Voice intro">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Voice intro</p>
          <p className="mt-1 text-sm text-cream/90">
            {mine ? `${clipLength(mine.durationMs)} · ${STATUS[mine.status]}` : "15 seconds, any language. Say hi the way you would in person."}
          </p>
        </div>
        {mine && !take && !recording ? (
          <button type="button" aria-label="Remove voice intro" onClick={() => void remove()} disabled={busy} className="grid size-9 shrink-0 place-items-center rounded-full text-muted">
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      {take ? (
        <div className="mt-3 space-y-2">
          <audio src={take.url} controls className="w-full" />
          <div className="flex gap-2">
            <Button type="button" className="flex-1" variant="gold" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Use this"}
            </Button>
            <Button type="button" className="flex-1" variant="ghost" disabled={busy} onClick={() => setTake(null)}>
              Again
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="mt-3 w-full"
          variant={recording ? "gold" : "ghost"}
          onClick={() => (recording ? recorder.current?.stop() : void start())}
        >
          {recording ? (
            <>
              <Square className="size-4" /> Stop · {clipLength(VOICE_MAX_MS - elapsed)} left
            </>
          ) : (
            <>
              <Mic className="size-4" /> {mine ? "Record a new one" : "Record"}
            </>
          )}
        </Button>
      )}
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
