import { describe, expect, test } from "vitest";
import { parseMovieCatalog } from "@/lib/movieCatalog";
import type { Movie } from "@/types";

function createValidMovie(overrides: Partial<Movie> & Pick<Movie, "id">): Movie {
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

describe("parseMovieCatalog", () => {
  test("parses a valid movie array", () => {
    const movies = [createValidMovie({ id: "movie-1" }), createValidMovie({ id: "movie-2" })];
    expect(parseMovieCatalog(movies)).toEqual(movies);
  });

  test("parses movies with optional fields", () => {
    const movies = [
      createValidMovie({
        id: "movie-1",
        tmdbId: 123,
        imdbId: "tt123",
        originalTitle: "Original Title",
        releaseDate: "2024-01-01",
        posterPath: "/poster.jpg",
        backdropPath: "/backdrop.jpg",
        crew: [{ name: "Crew Member", job: "Editor" }],
        source: { tmdbVoteAverage: 7.5, tmdbVoteCount: 100 },
      }),
    ];
    expect(parseMovieCatalog(movies)).toEqual(movies);
  });

  test("throws for non-array input", () => {
    expect(() => parseMovieCatalog({})).toThrow("Movie catalog data is invalid");
    expect(() => parseMovieCatalog("movies")).toThrow("Movie catalog data is invalid");
    expect(() => parseMovieCatalog(null)).toThrow("Movie catalog data is invalid");
  });

  test("throws for an array with invalid movie objects", () => {
    expect(() => parseMovieCatalog([{ id: "bad" }])).toThrow("Movie catalog data is invalid");
    expect(() => parseMovieCatalog([createValidMovie({ id: "movie-1" }), { id: "bad" }])).toThrow("Movie catalog data is invalid");
  });

  test("throws for movies with wrong types", () => {
    const movie = createValidMovie({ id: "movie-1" });
    expect(() => parseMovieCatalog([{ ...movie, year: "2024" }])).toThrow("Movie catalog data is invalid");
    expect(() => parseMovieCatalog([{ ...movie, genres: "Drama" }])).toThrow("Movie catalog data is invalid");
    expect(() => parseMovieCatalog([{ ...movie, popularity: "50" }])).toThrow("Movie catalog data is invalid");
  });

  test("throws for movies with invalid crew", () => {
    const movie = createValidMovie({ id: "movie-1" });
    expect(() => parseMovieCatalog([{ ...movie, crew: [{ name: "Crew" }] }])).toThrow("Movie catalog data is invalid");
    expect(() => parseMovieCatalog([{ ...movie, crew: "crew" }])).toThrow("Movie catalog data is invalid");
  });
});
