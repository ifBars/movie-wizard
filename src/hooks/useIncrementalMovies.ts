import { useCallback, useMemo, useState } from "react";
import { useExternalSyncEffect } from "@/hooks/useExternalSyncEffect";
import type { Movie } from "@/types";

export const movieBatchSize = 48;

const visibleCountStoragePrefix = "movie-wizard:visible:";

// Grows the rendered slice as the user reaches the end of a list. The count is remembered per history entry so
// coming back from a movie page re-renders enough cards for scroll restoration to reach the saved offset.
export function useIncrementalMovies(movies: Movie[], listKey: string) {
  const storageKey = `${visibleCountStoragePrefix}${readHistoryKey()}:${listKey}`;
  const [visibleCount, setVisibleCount] = useState(() => readVisibleCount(storageKey));
  const visibleMovies = useMemo(() => movies.slice(0, visibleCount), [movies, visibleCount]);
  const hasMore = visibleCount < movies.length;

  const showMore = useCallback(() => {
    setVisibleCount((count) => count + movieBatchSize);
  }, []);

  useExternalSyncEffect(() => {
    try {
      if (visibleCount > movieBatchSize) {
        sessionStorage.setItem(storageKey, String(visibleCount));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Storage can be unavailable in private windows; the list still works without restoration.
    }
  }, [storageKey, visibleCount]);

  return { hasMore, showMore, visibleMovies };
}

function readHistoryKey() {
  const state: unknown = typeof window === "undefined" ? null : window.history.state;
  return typeof state === "object" && state !== null && "key" in state && typeof state.key === "string" ? state.key : "default";
}

function readVisibleCount(storageKey: string) {
  try {
    const storedCount = Number.parseInt(sessionStorage.getItem(storageKey) ?? "", 10);
    return Number.isFinite(storedCount) && storedCount > movieBatchSize ? storedCount : movieBatchSize;
  } catch {
    return movieBatchSize;
  }
}
