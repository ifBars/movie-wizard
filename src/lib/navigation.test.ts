import { describe, expect, test } from "vitest";
import { viewPath, viewFromPath, movieDetailPath, views } from "@/lib/navigation";

describe("viewPath", () => {
  test("returns the correct path for each view", () => {
    expect(viewPath("discover")).toBe("/");
    expect(viewPath("watchlist")).toBe("/watchlist");
    expect(viewPath("history")).toBe("/history");
    expect(viewPath("settings")).toBe("/settings");
  });

  test("defaults to root for unknown view IDs", () => {
    expect(viewPath("unknown" as ReturnType<typeof viewFromPath>)).toBe("/");
  });
});

describe("viewFromPath", () => {
  test("maps known paths to view IDs", () => {
    expect(viewFromPath("/")).toBe("discover");
    expect(viewFromPath("/watchlist")).toBe("watchlist");
    expect(viewFromPath("/history")).toBe("history");
    expect(viewFromPath("/settings")).toBe("settings");
    expect(viewFromPath("/rated")).toBe("history");
  });

  test("defaults to discover for unknown paths", () => {
    expect(viewFromPath("/unknown")).toBe("discover");
    expect(viewFromPath("/movie/123")).toBe("discover");
  });
});

describe("movieDetailPath", () => {
  test("returns a movie detail path with encoded ID", () => {
    expect(movieDetailPath("the-matrix-1999")).toBe("/movie/the-matrix-1999");
    expect(movieDetailPath("dune part two")).toBe("/movie/dune%20part%20two");
  });
});

describe("views", () => {
  test("contains the expected views", () => {
    const viewIds = views.map((view) => view.id);
    expect(viewIds).toContain("discover");
    expect(viewIds).toContain("watchlist");
    expect(viewIds).toContain("history");
  });
});
