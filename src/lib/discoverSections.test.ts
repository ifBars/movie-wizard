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
    expect(sections.map((section) => section.key)).toContain("sad-movies");
    expect(sections.map((section) => section.key)).toContain("action");
    expect(sections.map((section) => section.key)).toContain("science-fiction");
    expect(sections.map((section) => section.key)).toContain("thrillers");
    expect(sections.map((section) => section.key)).toContain("nostalgic");
    expect(sections.length).toBeGreaterThan(9);
  });

  test("keeps category sections specific and discoverable by key", () => {
    const sections = buildDiscoverSections({
      visibleMovies: realCatalog,
      states: emptyStates,
      recommendations: getRecommendations(realCatalog, emptyStates),
    });
    const comedy = findDiscoverSection(sections, "comedy");
    const sadMovies = findDiscoverSection(sections, "sad-movies");
    const nostalgic = findDiscoverSection(sections, "nostalgic");

    expect(comedy?.movies.length).toBeGreaterThan(10);
    expect(comedy?.movies.every((movie) => movie.genres.includes("Comedy"))).toBe(true);
    expect(sadMovies?.movies.length).toBeGreaterThan(10);
    expect(sadMovies?.movies.some((movie) => movie.tags.includes("grief"))).toBe(true);
    expect(nostalgic?.movies.some((movie) => movie.year <= 2005)).toBe(true);
  });

  test("ranks recent releases with the recommendation engine", () => {
    const sections = buildDiscoverSections({
      visibleMovies: realCatalog,
      states: emptyStates,
      recommendations: getRecommendations(realCatalog, emptyStates),
    });
    const recentReleases = findDiscoverSection(sections, "recent-releases");
    const recentReleaseYear = new Date().getFullYear() - 5;
    const expectedRecentReleaseIds = getRecommendations(realCatalog, emptyStates, {
      candidateFilter: (movie) => movie.year >= recentReleaseYear,
    }).map((recommendation) => recommendation.movie.id);
    const recentReleaseIds = recentReleases?.movies.map((movie) => movie.id) ?? [];

    expect(recentReleaseIds.length).toBeGreaterThan(2);
    expect(recentReleaseIds.slice(0, 12)).toEqual(expectedRecentReleaseIds.slice(0, 12));
  });

  test("uses full-library taste signals when ranking category sections", () => {
    const catalog = [
      createMovie({
        id: "liked-drama",
        genres: ["Drama"],
        tags: ["detective"],
        directors: ["Taste Director"],
        cast: ["Taste Lead"],
        criticalScore: 75,
        popularity: 30,
      }),
      createMovie({
        id: "personal-comedy",
        genres: ["Comedy"],
        tags: ["detective"],
        directors: ["Taste Director"],
        cast: ["Taste Lead"],
        criticalScore: 45,
        popularity: 20,
      }),
      createMovie({
        id: "generic-comedy",
        genres: ["Comedy"],
        tags: ["slapstick"],
        directors: ["Other Director"],
        cast: ["Other Lead"],
        criticalScore: 99,
        popularity: 100,
      }),
    ];
    const states: MovieStateMap = {
      "liked-drama": createMovieState("liked-drama", { rating: 5, watched: true }),
    };

    const sections = buildDiscoverSections({
      visibleMovies: catalog,
      states,
      recommendations: getRecommendations(catalog, states),
    });
    const comedy = findDiscoverSection(sections, "comedy");

    expect(comedy?.movies.map((movie) => movie.id)).toEqual(["personal-comedy", "generic-comedy"]);
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

  test("keeps watchlisted movies out of passive discover shelves", () => {
    const watchlistedMovie = realCatalog.find((movie) => movie.genres.includes("Comedy"));

    if (!watchlistedMovie) {
      throw new Error("Expected the real catalog to include a comedy movie");
    }

    const states: MovieStateMap = {
      [watchlistedMovie.id]: {
        movieId: watchlistedMovie.id,
        watched: false,
        watchlist: true,
        ignored: false,
        rating: null,
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    };

    const sections = buildDiscoverSections({
      visibleMovies: realCatalog,
      states,
      recommendations: getRecommendations(realCatalog, states),
    });

    expect(sections.flatMap((section) => section.movies).some((movie) => movie.id === watchlistedMovie.id)).toBe(false);
  });
});

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
    year: overrides.year ?? 2026,
    runtimeMinutes: overrides.runtimeMinutes ?? 100,
    genres: overrides.genres,
    tags: overrides.tags,
    directors: overrides.directors ?? ["Director"],
    cast: overrides.cast ?? ["Actor"],
    synopsis: "",
    posterTone: "stone",
    popularity: overrides.popularity ?? 50,
    criticalScore: overrides.criticalScore ?? 75,
    plexFit: "",
    source: overrides.source,
  };
}
