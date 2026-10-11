import { describe, expect, test } from "vitest";
import { isLibrarySortOrder, sortLibraryMovies } from "@/lib/librarySort";
import type { Movie, MovieStateMap, Rating } from "@/types";

const movie = (id: string, title: string, year: number, voteAverage: number): Movie => ({
  id,
  title,
  year,
  originalLanguage: "en",
  runtimeMinutes: 100,
  genres: [],
  tags: [],
  directors: [],
  cast: [],
  synopsis: "",
  posterTone: "",
  popularity: 10,
  criticalScore: 50,
  plexFit: "",
  source: { tmdbVoteAverage: voteAverage, tmdbVoteCount: 5000 },
});

const movies = [movie("a", "Alien", 1979, 8.2), movie("b", "brick", 2005, 7.1), movie("c", "Casablanca", 1942, 8.5), movie("d", "Dune", 2021, 7.8)];

const state = (movieId: string, rating: Rating | null, day: number) => ({
  movieId,
  watched: true,
  watchlist: false,
  ignored: false,
  rating,
  updatedAt: `2026-10-0${day}T00:00:00.000Z`,
});

const states: MovieStateMap = { a: state("a", 3.5, 1), b: state("b", 5, 2), c: state("c", null, 3), d: state("d", 0.5, 4) };
const ids = (sorted: Movie[]) => sorted.map((item) => item.id);

describe("sortLibraryMovies", () => {
  test("orders by most recent update by default", () => {
    expect(ids(sortLibraryMovies(movies, states, "recent"))).toEqual(["d", "c", "b", "a"]);
  });

  test("sorts by your rating in both directions, keeping unrated movies last", () => {
    expect(ids(sortLibraryMovies(movies, states, "rating-desc"))).toEqual(["b", "a", "d", "c"]);
    expect(ids(sortLibraryMovies(movies, states, "rating-asc"))).toEqual(["d", "a", "b", "c"]);
  });

  test("sorts by audience score, release year, and title", () => {
    expect(ids(sortLibraryMovies(movies, states, "audience-desc"))).toEqual(["c", "a", "d", "b"]);
    expect(ids(sortLibraryMovies(movies, states, "year-desc"))).toEqual(["d", "b", "a", "c"]);
    expect(ids(sortLibraryMovies(movies, states, "year-asc"))).toEqual(["c", "a", "b", "d"]);
    expect(ids(sortLibraryMovies(movies, states, "title"))).toEqual(["a", "b", "c", "d"]);
  });

  test("does not mutate the input list", () => {
    const input = [...movies];
    sortLibraryMovies(input, states, "title");
    expect(input).toEqual(movies);
  });
});

describe("isLibrarySortOrder", () => {
  test("accepts known orders only", () => {
    expect(isLibrarySortOrder("rating-desc")).toBe(true);
    expect(isLibrarySortOrder("relevance")).toBe(false);
    expect(isLibrarySortOrder(null)).toBe(false);
  });
});
