import { useRef } from "react";
import { useExternalLayoutSyncEffect } from "@/hooks/useExternalSyncEffect";

const scrollStoragePrefix = "movie-wizard:scroll:";

export function usePageScrollRestoration(locationKey: string) {
  const activeLocationKey = useRef(locationKey);

  useExternalLayoutSyncEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    return () => {
      saveScrollPosition(activeLocationKey.current);

      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  useExternalLayoutSyncEffect(() => {
    const previousLocationKey = activeLocationKey.current;
    saveScrollPosition(previousLocationKey);
    activeLocationKey.current = locationKey;

    const restoredScrollY = readScrollPosition(locationKey);
    window.scrollTo({ top: restoredScrollY ?? 0, left: 0, behavior: "auto" });
  }, [locationKey]);
}

function saveScrollPosition(locationKey: string) {
  sessionStorage.setItem(`${scrollStoragePrefix}${locationKey}`, String(Math.max(0, window.scrollY)));
}

function readScrollPosition(locationKey: string) {
  const storedValue = sessionStorage.getItem(`${scrollStoragePrefix}${locationKey}`);

  if (!storedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(storedValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}
