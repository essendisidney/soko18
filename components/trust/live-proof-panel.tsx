"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/soko/button";
import {
  canRequestLiveProof,
  liveProofLine,
  requestLiveProof,
  sendLiveProof,
  type LiveProof,
  type LiveProofKind,
} from "@/lib/trust/live-proof";
import { readLiveProof, writeLiveProof } from "@/lib/trust/live-proof-local";

export function LiveProofPanel({
  conversationId,
  blocked,
}: {
  conversationId: string;
  blocked: boolean;
}) {
  const [proof, setProof] = useState<LiveProof | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProof(readLiveProof(conversationId));
  }, [conversationId]);

  function ask(kind: LiveProofKind) {
    if (!canRequestLiveProof(true, blocked)) return;
    const next = requestLiveProof(proof, conversationId, kind, new Date().toISOString());
    writeLiveProof(next);
    setProof(next);
  }

  function onPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    const next = sendLiveProof(proof, conversationId, "photo", new Date().toISOString());
    writeLiveProof(next);
    setProof(next);
  }

  function onVoice(file: File | undefined) {
    if (!file || !file.type.startsWith("audio/")) return;
    setAudio(URL.createObjectURL(file));
    const next = sendLiveProof(proof, conversationId, "voice", new Date().toISOString());
    writeLiveProof(next);
    setProof(next);
  }

  return (
    <section className="mt-4 rounded-2xl border border-line p-3">
      <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Live proof</h2>
      <p className="mt-2 text-xs text-muted">{liveProofLine(proof)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" size="sm" className="w-full" disabled={blocked} onClick={() => ask("photo")}>
          Ask photo
        </Button>
        <Button type="button" variant="ghost" size="sm" className="w-full" disabled={blocked} onClick={() => ask("voice")}>
          Ask voice
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={blocked}
          onClick={() => photoRef.current?.click()}
        >
          Capture
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={blocked}
          onClick={() => voiceRef.current?.click()}
        >
          Record
        </Button>
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0])}
      />
      <input
        ref={voiceRef}
        type="file"
        accept="audio/*"
        capture="user"
        className="hidden"
        onChange={(e) => onVoice(e.target.files?.[0])}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="mt-3 h-28 w-full rounded-2xl object-cover" />
      ) : null}
      {audio ? <audio src={audio} controls className="mt-3 w-full" /> : null}
    </section>
  );
}
