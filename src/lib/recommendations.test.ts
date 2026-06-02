import { describe, expect, test } from "vitest";
import generatedMovies from "@/data/generated/movies.json";
import { filterAdultMovies } from "@/lib/adultMovies";
import { buildTasteProfile, getRecommendations } from "@/lib/recommendations";
import type { Movie, MovieStateMap, Rating } from "@/types";

const realCatalog: Movie[] = generatedMovies;

describe("movie recommendations", () => {
  test("builds a taste profile from explicit ratings", () => {
    const states = createStates([
      ["dune-part-two-2024", 5],
      ["blade-runner-2049-2017", 4.5],
    ]);

    const profile = buildTasteProfile(realCatalog, states);

    expect(profile.ratedCount).toBe(2);
    expect(profile.averageRating).toBeGreaterThan(4);
    expect(profile.topGenres.length).toBeGreaterThan(0);
  });

  test("recommends unseen candidates with explanations and confidence", () => {
    const states = createStates([
      ["dune-part-two-2024", 5],
      ["blade-runner-2049-2017", 4.5],
      ["interstellar-2014", 4],
    ]);

    const recommendations = getRecommendations(filterAdultMovies(realCatalog, false), states);

    expect(recommendations).toHaveLength(48);
    expect(recommendations.every((recommendation) => recommendation.movie.id in states)).toBe(false);
    expect(recommendations.every((recommendation) => recommendation.reasons.length > 0)).toBe(true);
    expect(recommendations[0].confidence).toBe("medium");
  });

  test("does not recommend adult-tagged movies when the catalog is filtered", () => {
    const states = createStates([["money-shot-the-pornhub-story-2023", 5]]);
    const recommendations = getRecommendations(filterAdultMovies(realCatalog, false), states);

    expect(recommendations.some((recommendation) => recommendation.movie.id === "monika-1974")).toBe(false);
    expect(recommendations.some((recommendation) => recommendation.movie.id === "money-shot-the-pornhub-story-2023")).toBe(false);
  });

  test("suppresses candidates that match low-rated taste signals", () => {
    const catalog = [
      createMovie({ id: "liked-sci-fi", genres: ["Science Fiction"], tags: ["space"], criticalScore: 80, popularity: 50 }),
      createMovie({ id: "disliked-horror", genres: ["Horror"], tags: ["slasher"], criticalScore: 80, popularity: 50 }),
      createMovie({ id: "space-candidate", genres: ["Science Fiction"], tags: ["space"], criticalScore: 70, popularity: 40 }),
      createMovie({ id: "horror-candidate", genres: ["Horror"], tags: ["slasher"], criticalScore: 99, popularity: 100 }),
    ];
    const states = createStates([
      ["liked-sci-fi", 5],
      ["disliked-horror", 1],
    ]);

    const recommendations = getRecommendations(catalog, states);

    expect(recommendations[0].movie.id).toBe("space-candidate");
    expect(recommendations.findIndex((recommendation) => recommendation.movie.id === "space-candidate")).toBeLessThan(
      recommendations.findIndex((recommendation) => recommendation.movie.id === "horror-candidate"),
    );
  });

  test("uses recent ratings more strongly than stale ratings", () => {
    const catalog = [
      createMovie({ id: "old-action-like", genres: ["Action"], tags: ["chase"], directors: ["Old Director"], cast: ["Old Actor"], criticalScore: 40, popularity: 20 }),
      createMovie({ id: "recent-drama-like", genres: ["Drama"], tags: ["intimate"], directors: ["Recent Director"], cast: ["Recent Actor"], criticalScore: 40, popularity: 20 }),
      createMovie({ id: "action-candidate", genres: ["Action"], tags: ["chase"], directors: ["Old Director"], cast: ["Old Actor"], criticalScore: 35, popularity: 15 }),
      createMovie({ id: "drama-candidate", genres: ["Drama"], tags: ["intimate"], directors: ["Recent Director"], cast: ["Recent Actor"], criticalScore: 35, popularity: 15 }),
    ];
    const states: MovieStateMap = {
      "old-action-like": createMovieState("old-action-like", { rating: 5, updatedAt: "2024-01-01T00:00:00.000Z" }),
      "recent-drama-like": createMovieState("recent-drama-like", { rating: 5, updatedAt: "2026-06-01T00:00:00.000Z" }),
    };

    const recommendations = getRecommendations(catalog, states);

    expect(recommendations[0].movie.id).toBe("drama-candidate");
  });

  test("treats watchlist entries as weak intent and boosts the saved candidate", () => {
    const catalog = [
      createMovie({ id: "watchlisted", genres: ["Mystery"], tags: ["detective"], criticalScore: 70, popularity: 40 }),
      createMovie({ id: "mystery-candidate", genres: ["Mystery"], tags: ["detective"], criticalScore: 70, popularity: 40 }),
      createMovie({ id: "neutral-candidate", genres: ["Comedy"], tags: ["banter"], criticalScore: 72, popularity: 42 }),
    ];
    const states: MovieStateMap = {
      watchlisted: createMovieState("watchlisted", { watchlist: true }),
    };

    const recommendations = getRecommendations(catalog, states);

    expect(recommendations[0].movie.id).toBe("watchlisted");
    expect(recommendations[0].reasons).toContain("already waiting on your watchlist");
    expect(recommendations.findIndex((recommendation) => recommendation.movie.id === "mystery-candidate")).toBeLessThan(
      recommendations.findIndex((recommendation) => recommendation.movie.id === "neutral-candidate"),
    );
  });

});

function createStates(ratings: Array<[string, Rating]>): MovieStateMap {
  return Object.fromEntries(
    ratings.map(([movieId, rating]) => [movieId, createMovieState(movieId, { rating, watched: true })]),
  );
}

function createMovieState(
  movieId: string,
  overrides: Partial<MovieStateMap[string]> = {},
): MovieStateMap[string] {
  return {
    movieId,
    watched: false,
    watchlist: false,
    ignored: false,
    rating: null,
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function createMovie(overrides: Partial<Movie> & Pick<Movie, "id" | "genres" | "tags">): Movie {
  return {
    id: overrides.id,
    title: overrides.id,
    originalLanguage: "en",
    year: 2026,
    runtimeMinutes: 100,
    genres: overrides.genres,
    tags: overrides.tags,
    directors: overrides.directors ?? ["Director"],
    cast: overrides.cast ?? ["Actor"],
    synopsis: "",
    posterTone: "stone",
    popularity: overrides.popularity ?? 50,
    criticalScore: overrides.criticalScore ?? 75,
    plexFit: "",
  };
}
