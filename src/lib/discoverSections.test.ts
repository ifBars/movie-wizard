import { describe, expect, test } from "vitest";
import generatedMovies from "@/data/generated/movies.json";
import { buildDiscoverSections, findDiscoverSection } from "@/lib/discoverSections";
import { getRecommendations } from "@/lib/recommendations";
import type { Movie, MovieStateMap } from "@/types";

const realCatalog: Movie[] = generatedMovies;
const emptyStates: MovieStateMap = {};

describe("discover sections", () => {
  test("builds expanded discover shelves from the visible catalog", () => {
    const sections = buildDiscoverSections({
      visibleMovies: realCatalog,
      states: emptyStates,
      recommendations: getRecommendations(realCatalog, emptyStates),
    });

    expect(sections.map((section) => section.key)).toContain("top-picks");
    expect(sections.map((section) => section.key)).toContain("recent-releases");
    expect(sections.map((section) => section.key)).toContain("comedy");
    expect(sections.map((section) => section.key)).toContain("nostalgic");
    expect(sections.length).toBeGreaterThan(4);
  });

  test("keeps category sections specific and discoverable by key", () => {
    const sections = buildDiscoverSections({
      visibleMovies: realCatalog,
      states: emptyStates,
      recommendations: getRecommendations(realCatalog, emptyStates),
    });
    const comedy = findDiscoverSection(sections, "comedy");
    const nostalgic = findDiscoverSection(sections, "nostalgic");

    expect(comedy?.movies.length).toBeGreaterThan(10);
    expect(comedy?.movies.every((movie) => movie.genres.includes("Comedy"))).toBe(true);
    expect(nostalgic?.movies.some((movie) => movie.year <= 2005)).toBe(true);
  });

  test("sorts recent releases newest first", () => {
    const sections = buildDiscoverSections({
      visibleMovies: realCatalog,
      states: emptyStates,
      recommendations: getRecommendations(realCatalog, emptyStates),
    });
    const recentReleases = findDiscoverSection(sections, "recent-releases");
    const years = recentReleases?.movies.slice(0, 12).map((movie) => movie.year) ?? [];

    expect(years.length).toBeGreaterThan(2);
    expect(years).toEqual(years.slice().sort((a, b) => b - a));
  });

  test("keeps ignored movies out of passive discover shelves", () => {
    const ignoredMovie = realCatalog.find((movie) => movie.genres.includes("Comedy"));

    if (!ignoredMovie) {
      throw new Error("Expected the real catalog to include a comedy movie");
    }

    const states: MovieStateMap = {
      [ignoredMovie.id]: {
        movieId: ignoredMovie.id,
        watched: false,
        watchlist: false,
        ignored: true,
        rating: null,
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    };

    const sections = buildDiscoverSections({
      visibleMovies: realCatalog,
      states,
      recommendations: getRecommendations(realCatalog, states),
    });

    expect(sections.flatMap((section) => section.movies).some((movie) => movie.id === ignoredMovie.id)).toBe(false);
  });
});
