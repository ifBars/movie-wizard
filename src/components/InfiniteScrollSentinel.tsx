import { CircleNotch } from "@phosphor-icons/react";
import { useRef } from "react";
import { useExternalLayoutSyncEffect, useExternalSyncEffect } from "@/hooks/useExternalSyncEffect";

type InfiniteScrollSentinelProps = {
  // Re-arms the observer whenever the list grows: it only reports changes, so a sentinel still on screen after a
  // load would otherwise never fire again.
  armKey: string;
  isLoading?: boolean;
  onReach?: () => void;
};

export function InfiniteScrollSentinel({ armKey, isLoading = false, onReach }: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onReachRef = useRef(onReach);
  const isActive = Boolean(onReach) && !isLoading;

  useExternalLayoutSyncEffect(() => {
    onReachRef.current = onReach;
  }, [onReach]);

  useExternalSyncEffect(() => {
    const sentinel = sentinelRef.current;
    if (!isActive || !sentinel || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          onReachRef.current?.();
        }
      },
      // Start loading well before the last row so scrolling rarely has to wait.
      { rootMargin: "0px 0px 900px 0px" },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [armKey, isActive]);

  if (!onReach && !isLoading) {
    return null;
  }

  return (
    <div ref={sentinelRef} className="infinite-scroll-sentinel" role="status" aria-live="polite">
      {isLoading ? (
        <>
          <CircleNotch className="infinite-scroll-sentinel__spinner" weight="bold" />
          <span>Loading more movies…</span>
        </>
      ) : null}
    </div>
  );
}
