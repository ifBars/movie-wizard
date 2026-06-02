import { useCallback, useState } from "react";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "movie-wizard:theme";

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const initial = getStoredTheme() ?? getPreferredTheme();
    applyTheme(initial);
    return initial;
  });

  const toggleTheme = useCallback(() => {
    setThemeMode((current) => {
      const next = current === "light" ? "dark" : "light";
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { themeMode, toggleTheme };
}
