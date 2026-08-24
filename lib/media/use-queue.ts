"use client";

import { useSyncExternalStore } from "react";
import { mediaSnapshot, pendingQueue, readMediaQueue, readModerationLog, subscribeMedia } from "@/lib/media/store";

export function useMediaQueue() {
  useSyncExternalStore(subscribeMedia, mediaSnapshot, () => "");
  return readMediaQueue();
}

export function usePendingQueue() {
  useSyncExternalStore(subscribeMedia, mediaSnapshot, () => "");
  return pendingQueue();
}

export function useModerationLog() {
  useSyncExternalStore(subscribeMedia, mediaSnapshot, () => "");
  return readModerationLog();
}
