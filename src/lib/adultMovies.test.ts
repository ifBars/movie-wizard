import { describe, expect, test } from "vitest";
import { isAdultMovie, filterAdultMovies } from "@/lib/adultMovies";
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

describe("isAdultMovie", () => {
  test("flags movies in the adult movie ID list", () => {
    expect(isAdultMovie(createMovie({ id: "american-pie-1999" }))).toBe(true);
    expect(isAdultMovie(createMovie({ id: "lolita-1997" }))).toBe(true);
  });

  test("flags movies with adult tags", () => {
    expect(isAdultMovie(createMovie({ id: "movie-a", tags: ["erotic thriller"] }))).toBe(true);
    expect(isAdultMovie(createMovie({ id: "movie-b", tags: ["nymphomaniac"] }))).toBe(true);
    expect(isAdultMovie(createMovie({ id: "movie-c", tags: ["sexy"] }))).toBe(true);
  });

  test("flags movies with adult text signals in title or synopsis", () => {
    expect(isAdultMovie(createMovie({ id: "movie-d", synopsis: "An erotic romance story about a dominatrix." }))).toBe(true);
    expect(isAdultMovie(createMovie({ id: "movie-e", synopsis: "A nymphomaniac appears in this film." }))).toBe(true);
    expect(isAdultMovie(createMovie({ id: "movie-f", synopsis: "Softcore porn studios operate here." }))).toBe(true);
  });

  test("does not flag ordinary movies", () => {
    expect(isAdultMovie(createMovie({ id: "ordinary-movie", synopsis: "A wholesome family film." }))).toBe(false);
    expect(isAdultMovie(createMovie({ id: "action-movie", tags: ["superhero"], synopsis: "Hero saves the day." }))).toBe(false);
  });

  test("does not flag movies for benign tag overlap", () => {
    expect(isAdultMovie(createMovie({ id: "movie-g", tags: ["romance"] }))).toBe(false);
    expect(isAdultMovie(createMovie({ id: "movie-h", tags: ["drama", "intimate"] }))).toBe(false);
  });
});

describe("filterAdultMovies", () => {
  test("removes adult movies when showAdultMovies is false", () => {
    const movies = [
      createMovie({ id: "ordinary-movie", synopsis: "A wholesome family film." }),
      createMovie({ id: "american-pie-1999" }),
      createMovie({ id: "action-movie", tags: ["superhero"], synopsis: "Hero saves the day." }),
    ];

    const filtered = filterAdultMovies(movies, false);

    expect(filtered.map((movie) => movie.id)).toEqual(["ordinary-movie", "action-movie"]);
  });

  test("keeps all movies when showAdultMovies is true", () => {
    const movies = [
      createMovie({ id: "ordinary-movie", synopsis: "A wholesome family film." }),
      createMovie({ id: "american-pie-1999" }),
    ];

    const filtered = filterAdultMovies(movies, true);

    expect(filtered.map((movie) => movie.id)).toEqual(["ordinary-movie", "american-pie-1999"]);
  });
});
