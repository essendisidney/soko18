"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";

type LikedMe = {
  count: number;
  locked: boolean;
  people: { profileId: string; slug: string; name: string; super: boolean; at: string }[] | null;
};

export function LikedMeList() {
  const [data, setData] = useState<LikedMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/likes/received")
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { data?: LikedMe; error?: { message: string } } | null;
        if (!res.ok || !json?.data) {
          setError(json?.error?.message ?? "Sign in to see your likes.");
          return;
        }
        setData(json.data);
      })
      .catch(() => setError("Could not load likes."));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight">Likes you</h1>
      {error ? <p className="mt-4 text-sm text-muted">{error}</p> : null}
      {data ? (
        <>
          <p className="mt-2 text-sm text-muted">
            {data.count === 0
              ? "No new likes yet. A Boost puts you at the top of the deck for 30 minutes."
              : `${data.count} ${data.count === 1 ? "person likes" : "people like"} you.`}
          </p>
          {data.locked ? (
            <div className="mt-6 rounded-3xl border border-gold p-5">
              <p className="font-display text-2xl">See who they are</p>
              <p className="mt-2 text-sm text-muted">Gold shows everyone who liked you, so you can match instantly.</p>
              <Link href="/upgrade">
                <Button className="mt-4 w-full" variant="gold">
                  Get Gold
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-2">
              {(data.people ?? []).map((person) => (
                <li key={person.profileId}>
                  <Link
                    href={`/profile/${person.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-line px-4 py-3"
                  >
                    <span>{person.name}</span>
                    {person.super ? <span className="text-xs text-gold">Super Like</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
