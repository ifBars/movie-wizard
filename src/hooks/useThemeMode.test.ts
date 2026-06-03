import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useThemeMode } from "@/hooks/useThemeMode";

const THEME_STORAGE_KEY = "movie-wizard:theme";

describe("useThemeMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("initializes to light when no stored preference and no dark OS preference", () => {
    const { result } = renderHook(() => useThemeMode());
    expect(result.current.themeMode).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  test("initializes to dark when OS prefers dark", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useThemeMode());
    expect(result.current.themeMode).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("reads stored theme preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const { result } = renderHook(() => useThemeMode());
    expect(result.current.themeMode).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("setThemeMode updates theme and storage", () => {
    const { result } = renderHook(() => useThemeMode());

    act(() => {
      result.current.setThemeMode("dark");
    });

    expect(result.current.themeMode).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("toggleTheme switches between light and dark", () => {
    const { result } = renderHook(() => useThemeMode());

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.themeMode).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.themeMode).toBe("light");
  });
});
