import { describe, expect, test } from "vitest";
import { getAppRouteState } from "@/lib/routeState";

describe("getAppRouteState", () => {
  test("recognizes the discover view at root", () => {
    expect(getAppRouteState("/")).toEqual({
      activeView: "discover",
      isKnownRoute: true,
      selectedMovieId: null,
    });
  });

  test("recognizes the watchlist view", () => {
    expect(getAppRouteState("/watchlist")).toEqual({
      activeView: "watchlist",
      isKnownRoute: true,
      selectedMovieId: null,
    });
  });

  test("recognizes the history view", () => {
    expect(getAppRouteState("/history")).toEqual({
      activeView: "history",
      isKnownRoute: true,
      selectedMovieId: null,
    });
  });

  test("maps /rated to history", () => {
    expect(getAppRouteState("/rated")).toEqual({
      activeView: "history",
      isKnownRoute: false,
      selectedMovieId: null,
    });
  });

  test("recognizes the settings view", () => {
    expect(getAppRouteState("/settings")).toEqual({
      activeView: "settings",
      isKnownRoute: true,
      selectedMovieId: null,
    });
  });

  test("treats unknown routes as discover with isKnownRoute false", () => {
    expect(getAppRouteState("/unknown")).toEqual({
      activeView: "discover",
      isKnownRoute: false,
      selectedMovieId: null,
    });
  });

  test("extracts movie ID from detail paths", () => {
    expect(getAppRouteState("/movie/the-matrix-1999")).toEqual({
      activeView: "discover",
      isKnownRoute: true,
      selectedMovieId: "the-matrix-1999",
    });
  });

  test("handles encoded movie IDs", () => {
    expect(getAppRouteState("/movie/dune%20part%20two")).toEqual({
      activeView: "discover",
      isKnownRoute: true,
      selectedMovieId: "dune%20part%20two",
    });
  });
});
