import { describe, expect, test } from "vitest";
import { isAdultMovie } from "@/lib/adultMovies";
import { filterCatalogMovies, getCatalogFilterCounts } from "@/lib/catalogFilters";
import type { Movie } from "@/types";

function createMovie(overrides: Partial<Movie> & Pick<Movie, "id">): Movie {
  return {
    title: overrides.id,
    originalLanguage: "en",
    year: 2024,
    runtimeMinutes: 100,
    genres: ["Drama"],
    tags: [],
    directors: ["Director"],
    cast: ["Actor"],
    synopsis: "A movie.",
    posterTone: "stone",
    popularity: 50,
    criticalScore: 70,
    plexFit: "",
    ...overrides,
  };
}

describe("filterCatalogMovies", () => {
  test("applies adult and language filters in sequence", () => {
    const movies = [
      createMovie({ id: "en-safe", originalLanguage: "en", synopsis: "Safe." }),
      createMovie({ id: "hi-safe", originalLanguage: "hi", synopsis: "Safe." }),
      createMovie({ id: "en-adult", originalLanguage: "en", tags: ["sexy"] }),
      createMovie({ id: "fr-safe", originalLanguage: "fr", synopsis: "Safe." }),
    ];

    const result = filterCatalogMovies(movies, {
      languageCodes: ["en", "hi"],
      showAdultMovies: false,
      minimumRecommendationYear: null,
    });

    expect(result.map((movie) => movie.id)).toEqual(["en-safe", "hi-safe"]);
  });

  test("allows adult movies when enabled", () => {
    const movies = [createMovie({ id: "en-adult", originalLanguage: "en", tags: ["sexy"] })];

    const result = filterCatalogMovies(movies, {
      languageCodes: ["en"],
      showAdultMovies: true,
      minimumRecommendationYear: null,
    });

    expect(result.map((movie) => movie.id)).toEqual(["en-adult"]);
  });
});

describe("getCatalogFilterCounts", () => {
  test("counts hidden adult and language-filtered movies", () => {
    const movies = [
      createMovie({ id: "en-safe", originalLanguage: "en" }),
      createMovie({ id: "hi-safe", originalLanguage: "hi" }),
      createMovie({ id: "en-adult", originalLanguage: "en", tags: ["sexy"] }),
      createMovie({ id: "fr-safe", originalLanguage: "fr" }),
    ];

    const counts = getCatalogFilterCounts(movies, {
      languageCodes: ["en"],
      showAdultMovies: false,
      minimumRecommendationYear: null,
    });

    const expectedHiddenAdult = movies.filter(isAdultMovie).length;

    expect(counts.hiddenAdultMovieCount).toBe(expectedHiddenAdult);
    expect(counts.hiddenLanguageMovieCount).toBe(2);
  });
});
