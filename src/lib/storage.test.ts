import { describe, expect, test } from "vitest";
import { defaultLibrarySettings, exportMovieState, importMovieState } from "@/lib/storage";
import type { MovieStateMap } from "@/types";

describe("importMovieState", () => {
  test("imports exported Movie Wizard library data", () => {
    const movies: MovieStateMap = {
      "the-matrix-1999": {
        movieId: "the-matrix-1999",
        watched: true,
        watchlist: false,
        ignored: false,
        rating: 5,
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    };
    const settings = {
      ...defaultLibrarySettings,
      languageCodes: ["en", "ja"],
      minimumRecommendationYear: 1990,
    };

    expect(importMovieState(exportMovieState(movies, settings))).toEqual({
      movies,
      settings,
    });
  });

  test("rejects non-Movie Wizard json", () => {
    expect(importMovieState(JSON.stringify({ version: 1, movies: {} }))).toBeNull();
    expect(importMovieState("not json")).toBeNull();
  });

  test("drops invalid movie states while preserving valid settings", () => {
    const imported = importMovieState(
      JSON.stringify({
        app: "movie-wizard",
        version: 1,
        settings: {
          languageCodes: ["en"],
          showAdultMovies: true,
          minimumRecommendationYear: 2000,
        },
        movies: {
          valid: {
            movieId: "valid",
            watched: true,
            watchlist: false,
            ignored: false,
            rating: 4,
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
          invalid: {
            movieId: "different-id",
            watched: true,
            watchlist: false,
            ignored: false,
            rating: 4,
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        },
      }),
    );

    expect(imported).toEqual({
      movies: {
        valid: {
          movieId: "valid",
          watched: true,
          watchlist: false,
          ignored: false,
          rating: 4,
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      },
      settings: {
        languageCodes: ["en"],
        showAdultMovies: true,
        minimumRecommendationYear: 2000,
      },
    });
  });
});
