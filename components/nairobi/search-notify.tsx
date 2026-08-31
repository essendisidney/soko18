"use client";

import { Button } from "@/components/soko/button";
import {
  joinSearchNotify,
  searchNotifyKey,
  searchNotifySnapshot,
  subscribeSearchNotify,
} from "@/lib/browse/search-notify";
import { useLocalIds } from "@/lib/safety/use-id-list";

export function SearchNotifyButton({ query }: { query: string }) {
  const listed = useLocalIds(subscribeSearchNotify, searchNotifySnapshot).includes(searchNotifyKey(query));

  return (
    <Button
      className="mt-4 w-full"
      variant={listed ? "ghost" : "gold"}
      onClick={() => joinSearchNotify(query)}
    >
      {listed ? "You’re on the list" : "Notify me"}
    </Button>
  );
}
