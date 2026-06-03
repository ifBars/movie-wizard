import { describe, expect, test } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useAppRouteState } from "@/hooks/useAppRouteState";

function wrapper(pathname: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[pathname]}>{children}</MemoryRouter>;
  };
}

describe("useAppRouteState", () => {
  test("returns discover for root path", () => {
    const { result } = renderHook(() => useAppRouteState(), { wrapper: wrapper("/") });
    expect(result.current.activeView).toBe("discover");
    expect(result.current.isKnownRoute).toBe(true);
    expect(result.current.selectedMovieId).toBeNull();
    expect(result.current.pathname).toBe("/");
  });

  test("returns watchlist for /watchlist", () => {
    const { result } = renderHook(() => useAppRouteState(), { wrapper: wrapper("/watchlist") });
    expect(result.current.activeView).toBe("watchlist");
    expect(result.current.isKnownRoute).toBe(true);
  });

  test("returns history for /history", () => {
    const { result } = renderHook(() => useAppRouteState(), { wrapper: wrapper("/history") });
    expect(result.current.activeView).toBe("history");
    expect(result.current.isKnownRoute).toBe(true);
  });

  test("returns settings for /settings", () => {
    const { result } = renderHook(() => useAppRouteState(), { wrapper: wrapper("/settings") });
    expect(result.current.activeView).toBe("settings");
    expect(result.current.isKnownRoute).toBe(true);
  });

  test("returns movie detail state", () => {
    const { result } = renderHook(() => useAppRouteState(), { wrapper: wrapper("/movie/the-matrix-1999") });
    expect(result.current.activeView).toBe("discover");
    expect(result.current.isKnownRoute).toBe(true);
    expect(result.current.selectedMovieId).toBe("the-matrix-1999");
  });
});
