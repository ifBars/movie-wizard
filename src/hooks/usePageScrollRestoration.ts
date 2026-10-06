import { useRef } from "react";
import { useExternalLayoutSyncEffect } from "@/hooks/useExternalSyncEffect";

const scrollStoragePrefix = "movie-wizard:scroll:";

export function usePageScrollRestoration(locationKey: string) {
  const activeLocationKey = useRef(locationKey);
  // Track the offset while the user scrolls: by the time a route change commits, the outgoing page may
  // already be replaced by a shorter one and the browser will have clamped window.scrollY.
  const lastScrollY = useRef(0);

  useExternalLayoutSyncEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    lastScrollY.current = window.scrollY;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const handleScroll = () => {
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      saveScrollPosition(activeLocationKey.current, lastScrollY.current);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  useExternalLayoutSyncEffect(() => {
    const previousLocationKey = activeLocationKey.current;
    if (previousLocationKey !== locationKey) {
      saveScrollPosition(previousLocationKey, lastScrollY.current);
    }
    activeLocationKey.current = locationKey;

    const restoredScrollY = readScrollPosition(locationKey) ?? 0;
    lastScrollY.current = restoredScrollY;
    window.scrollTo({ top: restoredScrollY, left: 0, behavior: "auto" });

    if (restoredScrollY === 0) {
      return;
    }

    return keepRestoringScroll(restoredScrollY);
  }, [locationKey]);
}

function saveScrollPosition(locationKey: string, scrollY: number) {
  sessionStorage.setItem(`${scrollStoragePrefix}${locationKey}`, String(Math.max(0, Math.round(scrollY))));
}

function readScrollPosition(locationKey: string) {
  const storedValue = sessionStorage.getItem(`${scrollStoragePrefix}${locationKey}`);

  if (!storedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(storedValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

const restoreTimeoutMs = 1200;

// Returning pages mount behind exit animations, so the document can be too short to reach the
// saved offset on the first frame. Keep nudging until it fits, the user scrolls, or we time out.
function keepRestoringScroll(targetScrollY: number) {
  const startedAt = performance.now();
  let frame = 0;

  const stop = () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };

  const step = () => {
    if (Math.abs(window.scrollY - targetScrollY) > 1) {
      window.scrollTo({ top: targetScrollY, left: 0, behavior: "auto" });
    }

    if (window.scrollY >= targetScrollY - 1 || performance.now() - startedAt > restoreTimeoutMs) {
      stop();
      return;
    }

    frame = window.requestAnimationFrame(step);
  };

  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);
  frame = window.requestAnimationFrame(step);

  return stop;
}
