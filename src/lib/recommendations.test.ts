import { describe, expect, test, vi } from "vitest";
import generatedMovies from "@/data/generated/movies.json";
import { filterAdultMovies } from "@/lib/adultMovies";
import { buildTasteProfile, createRecommendationSelector, getRecommendations } from "@/lib/recommendations";
import type { CollaborativeModel } from "@/lib/collaborativeRecommendations";
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

    expect(recommendations.length).toBeGreaterThan(48);
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
      "old-action-like": createMovieState("old-action-like", { rating: 4, updatedAt: "2024-01-01T00:00:00.000Z" }),
      "recent-drama-like": createMovieState("recent-drama-like", { rating: 5, updatedAt: "2026-06-01T00:00:00.000Z" }),
    };

    const recommendations = getRecommendations(catalog, states);

    expect(recommendations[0].movie.id).toBe("drama-candidate");
  });

  test("learns useful taste signals from a single strong rating", () => {
    const catalog = [
      createMovie({ id: "liked-space", genres: ["Science Fiction"], tags: ["space"], criticalScore: 60, popularity: 10 }),
      createMovie({ id: "space-candidate", genres: ["Science Fiction"], tags: ["space"], criticalScore: 60, popularity: 10 }),
      createMovie({ id: "generic-hit", genres: ["Action"], tags: ["franchise"], criticalScore: 90, popularity: 100 }),
    ];
    const states = createStates([["liked-space", 5]]);

    const recommendations = getRecommendations(catalog, states);

    expect(recommendations[0].movie.id).toBe("space-candidate");
    expect(recommendations[0].reasons.some((reason) => reason.includes("Science Fiction") || reason.includes("space"))).toBe(true);
  });

  test("dampens public scores backed by tiny vote samples", () => {
    const catalog = [
      createMovie({
        id: "low-evidence-hype",
        genres: ["Drama"],
        tags: ["festival"],
        criticalScore: 70,
        popularity: 50,
        source: { tmdbVoteAverage: 10, tmdbVoteCount: 1 },
      }),
      createMovie({
        id: "stable-consensus",
        genres: ["Drama"],
        tags: ["festival"],
        criticalScore: 80,
        popularity: 50,
        source: { tmdbVoteAverage: 7.5, tmdbVoteCount: 10_000 },
      }),
    ];

    const recommendations = getRecommendations(catalog, {});

    expect(recommendations[0].movie.id).toBe("stable-consensus");
  });

  test("treats watchlist entries as weak intent without recommending the saved candidate", () => {
    const catalog = [
      createMovie({ id: "watchlisted", genres: ["Mystery"], tags: ["detective"], criticalScore: 70, popularity: 40 }),
      createMovie({ id: "mystery-candidate", genres: ["Mystery"], tags: ["detective"], criticalScore: 70, popularity: 40 }),
      createMovie({ id: "neutral-candidate", genres: ["Comedy"], tags: ["banter"], criticalScore: 72, popularity: 42 }),
    ];
    const states: MovieStateMap = {
      watchlisted: createMovieState("watchlisted", { watchlist: true }),
    };

    const recommendations = getRecommendations(catalog, states);

    expect(recommendations.some((recommendation) => recommendation.movie.id === "watchlisted")).toBe(false);
    expect(recommendations[0].movie.id).toBe("mystery-candidate");
    expect(recommendations.findIndex((recommendation) => recommendation.movie.id === "mystery-candidate")).toBeLessThan(
      recommendations.findIndex((recommendation) => recommendation.movie.id === "neutral-candidate"),
    );
  });

  test("filters recommendations by minimum movie year", () => {
    const catalog = [
      createMovie({ id: "liked-newer", genres: ["Drama"], tags: ["intimate"], year: 2026 }),
      createMovie({ id: "old-candidate", genres: ["Drama"], tags: ["intimate"], year: 1999 }),
      createMovie({ id: "new-candidate", genres: ["Drama"], tags: ["intimate"], year: 2018 }),
    ];
    const states = createStates([["liked-newer", 5]]);

    const recommendations = getRecommendations(catalog, states, { minimumMovieYear: 2010 });

    expect(recommendations.map((recommendation) => recommendation.movie.id)).toEqual(["new-candidate"]);
  });

  test("keeps a large rating history focused on unusually strong taste signals", () => {
    const catalog = [
      ...Array.from({ length: 44 }, (_, index) =>
        createMovie({
          id: `ordinary-action-${index}`,
          genres: ["Action"],
          tags: ["franchise"],
          directors: [`Action Director ${index}`],
          cast: [`Action Actor ${index}`],
          criticalScore: 70,
          popularity: 70,
        }),
      ),
      ...Array.from({ length: 44 }, (_, index) =>
        createMovie({
          id: `ordinary-comedy-${index}`,
          genres: ["Comedy"],
          tags: ["banter"],
          directors: [`Comedy Director ${index}`],
          cast: [`Comedy Actor ${index}`],
          criticalScore: 70,
          popularity: 70,
        }),
      ),
      ...Array.from({ length: 9 }, (_, index) =>
        createMovie({
          id: `favorite-mystery-${index}`,
          genres: ["Mystery"],
          tags: ["detective"],
          directors: [`Mystery Director ${index}`],
          cast: [`Mystery Actor ${index}`],
          criticalScore: 70,
          popularity: 70,
        }),
      ),
      createMovie({ id: "personal-fit", genres: ["Mystery"], tags: ["detective"], criticalScore: 75, popularity: 35 }),
      createMovie({ id: "generic-hit", genres: ["Action"], tags: ["franchise"], criticalScore: 98, popularity: 100 }),
    ];
    const states: MovieStateMap = Object.fromEntries([
      ...Array.from({ length: 44 }, (_, index) => [`ordinary-action-${index}`, createMovieState(`ordinary-action-${index}`, { rating: 3.5, watched: true })]),
      ...Array.from({ length: 44 }, (_, index) => [`ordinary-comedy-${index}`, createMovieState(`ordinary-comedy-${index}`, { rating: 3.5, watched: true })]),
      ...Array.from({ length: 9 }, (_, index) => [`favorite-mystery-${index}`, createMovieState(`favorite-mystery-${index}`, { rating: 5, watched: true })]),
    ]);

    const recommendations = getRecommendations(catalog, states);

    expect(recommendations[0].movie.id).toBe("personal-fit");
    expect(recommendations[0].confidence).toBe("high");
  });

  test("keeps lower-rated family animation signals from crowding out stronger rated tastes", () => {
    const catalog = [
      createMovie({ id: "liked-thriller-1", genres: ["Thriller", "Mystery"], tags: ["detective", "tense"], criticalScore: 78, popularity: 45 }),
      createMovie({ id: "liked-thriller-2", genres: ["Thriller", "Crime"], tags: ["detective", "conspiracy"], criticalScore: 78, popularity: 45 }),
      createMovie({ id: "disliked-kids-1", genres: ["Animation", "Family", "Adventure"], tags: ["talking animals", "kids"], criticalScore: 94, popularity: 100 }),
      createMovie({ id: "disliked-kids-2", genres: ["Animation", "Family", "Comedy"], tags: ["kids", "cute"], criticalScore: 94, popularity: 100 }),
      createMovie({ id: "thriller-candidate", genres: ["Thriller", "Mystery"], tags: ["detective", "tense"], criticalScore: 72, popularity: 35 }),
      createMovie({ id: "kids-candidate", genres: ["Animation", "Family", "Adventure"], tags: ["talking animals", "kids"], criticalScore: 99, popularity: 100 }),
    ];
    const states = createStates([
      ["liked-thriller-1", 5],
      ["liked-thriller-2", 4.5],
      ["disliked-kids-1", 2],
      ["disliked-kids-2", 2.5],
    ]);

    const profile = buildTasteProfile(catalog, states);
    const recommendations = getRecommendations(catalog, states);

    expect(profile.topGenres.map((genre) => genre.name)).toContain("Thriller");
    expect(profile.topGenres.map((genre) => genre.name)).not.toContain("Animation");
    expect(profile.topTags.map((tag) => tag.name)).toContain("detective");
    expect(profile.topTags.map((tag) => tag.name)).not.toContain("kids");
    expect(recommendations[0].movie.id).toBe("thriller-candidate");
    expect(recommendations.findIndex((recommendation) => recommendation.movie.id === "thriller-candidate")).toBeLessThan(
      recommendations.findIndex((recommendation) => recommendation.movie.id === "kids-candidate"),
    );
  });

  test("blends MovieLens neighbors into otherwise equivalent recommendations", () => {
    const catalog = [
      createMovie({ id: "rated-source", genres: ["Drama"], tags: ["character study"] }),
      createMovie({ id: "collaborative-pick", genres: ["Drama"], tags: ["character study"] }),
      createMovie({ id: "content-only-pick", genres: ["Drama"], tags: ["character study"] }),
    ];
    const states = createStates([["rated-source", 5]]);
    const collaborativeModel: CollaborativeModel = new Map([
      ["rated-source", [{ movieId: "collaborative-pick", similarity: 0.8, support: 24 }]],
    ]);

    const recommendations = getRecommendations(catalog, states, {}, collaborativeModel);

    expect(recommendations[0].movie.id).toBe("collaborative-pick");
    expect(recommendations[0].reasons[0]).toContain("viewers who also liked rated-source");
  });

  test("reads collaborative neighbors once per rated source across candidates and filtered shelves", () => {
    const sources = Array.from({ length: 20 }, (_, i) => createMovie({ id: `source-${i}`, genres: ["Drama"], tags: [] }));
    const candidates = Array.from({ length: 80 }, (_, i) => createMovie({ id: `candidate-${i}`, genres: ["Drama"], tags: [] }));
    const states = createStates(sources.map((movie) => [movie.id, 5]));
    const model = new Map(sources.map((movie) => [movie.id, candidates.map((candidate) => ({ movieId: candidate.id, similarity: 0.1, support: 5 }))]));
    const getNeighbors = vi.spyOn(model, "get");
    const select = createRecommendationSelector([...sources, ...candidates], states, model);

    expect(select()).toHaveLength(candidates.length);
    expect(select({ candidateFilter: (movie) => movie.id.endsWith("0") })).toHaveLength(8);
    expect(getNeighbors).toHaveBeenCalledTimes(sources.length);
  });

  test("indexes liked features instead of rereading every liked movie for every candidate", () => {
    const source = createMovie({ id: "source", genres: ["Drama"], tags: [] });
    const readDirectors = vi.fn(() => ["Director"]);
    Object.defineProperty(source, "directors", { get: readDirectors });
    const candidates = Array.from({ length: 1000 }, (_, i) => createMovie({ id: `candidate-${i}`, genres: ["Drama"], tags: [] }));
    getRecommendations([source, ...candidates], createStates([[source.id, 5]]));
    expect(readDirectors.mock.calls.length).toBeLessThanOrEqual(4);
  });

  test("keeps the first collaborative edge and first equally strong explanation source", () => {
    const catalog = ["first", "second", "pick"].map((id) => createMovie({ id, genres: ["Drama"], tags: [] }));
    const states = createStates([["first", 5], ["second", 5], ["outside-catalog", 1]]);
    const model = new Map([
      ["first", [{ movieId: "pick", similarity: 0.3, support: 4 }]],
      ["second", [{ movieId: "pick", similarity: 0.3, support: 4 }]],
      ["outside-catalog", [{ movieId: "pick", similarity: 0.1, support: 4 }]],
    ]);
    const expected = getRecommendations(catalog, states, {}, model);
    model.get("first")?.push({ movieId: "pick", similarity: 0.9, support: 5 });

    expect(getRecommendations(catalog, states, {}, model)).toEqual(expected);
    expect(expected[0].reasons[0]).toContain("viewers who also liked first");
  });

  test("deduplicates related movies across features and preserves the earliest source", () => {
    const catalog = [
      createMovie({ id: "earliest", genres: ["Drama"], tags: ["hope"], directors: ["First"], cast: [] }),
      ...Array.from({ length: 5 }, (_, i) => createMovie({ id: `later-${i}`, genres: ["Drama"], tags: ["hope"], directors: ["Later"], cast: [] })),
      createMovie({ id: "pick", genres: ["Drama"], tags: [], directors: ["Later", "First"], cast: [] }),
    ];
    const states = createStates(catalog.slice(0, -1).map((movie) => [movie.id, 5]));
    const [pick] = getRecommendations(catalog, states);

    expect(pick.reasons).toContain("shares creative DNA with earliest");
    // Repeating a matching feature must not add another related movie or bonus.
    const duplicatedFeatures = catalog.map((movie) => ({ ...movie, directors: [...movie.directors, ...movie.directors] }));
    const [duplicatePick] = getRecommendations(duplicatedFeatures, states);
    expect(duplicatePick.reasons).toContain("shares creative DNA with earliest");
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
    year: overrides.year ?? 2026,
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
    source: overrides.source,
  };
}
