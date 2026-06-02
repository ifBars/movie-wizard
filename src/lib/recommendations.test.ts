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
});

function createStates(ratings: Array<[string, Rating]>): MovieStateMap {
  return Object.fromEntries(
    ratings.map(([movieId, rating]) => [
      movieId,
      {
        movieId,
        watched: true,
        watchlist: false,
        ignored: false,
        rating,
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]),
  );
}
