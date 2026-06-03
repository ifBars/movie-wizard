import { describe, expect, test } from "vitest";
import { isAvailableMovieCandidate } from "@/lib/movieEligibility";
import type { Movie, MovieStateMap } from "@/types";

function createMovie(id: string): Movie {
  return {
    id,
    title: id,
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
  };
}

describe("isAvailableMovieCandidate", () => {
  test("returns true for movies with no state", () => {
    expect(isAvailableMovieCandidate(createMovie("new-movie"), {})).toBe(true);
  });

  test("returns false for ignored movies", () => {
    const states: MovieStateMap = {
      "ignored-movie": { movieId: "ignored-movie", watched: false, watchlist: false, ignored: true, rating: null, updatedAt: "" },
    };
    expect(isAvailableMovieCandidate(createMovie("ignored-movie"), states)).toBe(false);
  });

  test("returns false for watched movies", () => {
    const states: MovieStateMap = {
      "watched-movie": { movieId: "watched-movie", watched: true, watchlist: false, ignored: false, rating: null, updatedAt: "" },
    };
    expect(isAvailableMovieCandidate(createMovie("watched-movie"), states)).toBe(false);
  });

  test("returns false for rated movies", () => {
    const states: MovieStateMap = {
      "rated-movie": { movieId: "rated-movie", watched: false, watchlist: false, ignored: false, rating: 4, updatedAt: "" },
    };
    expect(isAvailableMovieCandidate(createMovie("rated-movie"), states)).toBe(false);
  });

  test("returns false for watchlisted movies", () => {
    const states: MovieStateMap = {
      "watchlisted-movie": { movieId: "watchlisted-movie", watched: false, watchlist: true, ignored: false, rating: null, updatedAt: "" },
    };
    expect(isAvailableMovieCandidate(createMovie("watchlisted-movie"), states)).toBe(false);
  });

  test("returns true for movies with only a null rating and no other flags", () => {
    const states: MovieStateMap = {
      "neutral-movie": { movieId: "neutral-movie", watched: false, watchlist: false, ignored: false, rating: null, updatedAt: "" },
    };
    expect(isAvailableMovieCandidate(createMovie("neutral-movie"), states)).toBe(true);
  });
});
