import { describe, expect, test, vi } from "vitest";
import { buildLibraryCollections } from "@/lib/libraryCollections";
import { createPerformanceFixture } from "../../scripts/performance/fixtures";

describe("library collection scaling", () => {
  test("parses each history timestamp once and preserves existing ordering", () => {
    const { movies, states } = createPerformanceFixture(10_000, 5000);
    states["synthetic-1"].updatedAt = "invalid";
    const expected = movies.filter((movie) => states[movie.id]?.watched || states[movie.id]?.rating)
      .sort((a, b) => (Date.parse(states[b.id].updatedAt) || 0) - (Date.parse(states[a.id].updatedAt) || 0));
    const parse = vi.spyOn(Date, "parse");
    try {
      const result = buildLibraryCollections(movies, states);
      expect(parse).toHaveBeenCalledTimes(expected.length);
      expect(result.historyMovies).toEqual(expected);
      expect(result.watchlistMovies).toEqual(movies.filter((movie) => states[movie.id]?.watchlist && !states[movie.id]?.watched));
      expect(result.ratedMovies).toEqual(movies.filter((movie) => states[movie.id]?.rating).sort((a, b) => (states[b.id].rating ?? 0) - (states[a.id].rating ?? 0)));
    } finally {
      parse.mockRestore();
    }
  });
});
