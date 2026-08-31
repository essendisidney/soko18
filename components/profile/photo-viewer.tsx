"use client";

import { useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export function PhotoViewer({
  photos,
  index,
  alt,
  onIndex,
  onClose,
}: {
  photos: string[];
  index: number;
  alt: string;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const start = useRef<number | null>(null);
  const src = photos[index];
  if (!src) return null;

  function go(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= photos.length) return;
    onIndex(next);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <button
        type="button"
        aria-label="Close photos"
        className="absolute top-4 left-4 z-20 grid size-10 place-items-center rounded-full bg-black/40 text-cream"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>
      {photos.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            className="absolute top-16 bottom-0 left-0 z-10 w-1/3"
            onClick={() => go(-1)}
          />
          <button
            type="button"
            aria-label="Next photo"
            className="absolute top-16 bottom-0 right-0 z-10 w-1/3"
            onClick={() => go(1)}
          />
          <p className="pointer-events-none absolute bottom-8 inset-x-0 z-10 text-center text-xs text-cream/70">
            {index + 1} / {photos.length}
          </p>
        </>
      ) : null}
      <div
        className="absolute inset-0"
        onPointerDown={(event) => {
          start.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (start.current == null) return;
          const dx = event.clientX - start.current;
          start.current = null;
          if (dx < -40) go(1);
          else if (dx > 40) go(-1);
        }}
      >
        <Image src={src} alt={alt} fill className="object-contain" sizes="100vw" />
      </div>
    </div>
  );
}
