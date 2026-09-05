import type { Movie, MovieStateMap, Recommendation, TasteProfile } from "@/types";
import { isAvailableMovieCandidate } from "@/lib/movieEligibility";
import type { CollaborativeModel } from "@/lib/collaborativeRecommendations";

type WeightedMap = Map<string, WeightedSignal>;
type WeightedSignal = {
  total: number;
  evidence: number;
};

const POSITIVE_BASELINE = 3.5;
const BASELINE_PRIOR_RATINGS = 4;
const MIN_POSITIVE_RATING = 4;
const MAX_RECOMMENDATIONS = 240;
const WATCHLIST_INTENT_WEIGHT = 0.35;
const MAX_FEATURE_MATCHES = 3;
const MAX_SOURCE_VOTE_COUNT = 10_000;
const MIN_RELATED_SIGNAL = 0.08;

type TasteModel = {
  profile: TasteProfile;
  genreWeights: WeightedMap;
  tagWeights: WeightedMap;
  directorWeights: WeightedMap;
  castWeights: WeightedMap;
  likedMovies: Movie[];
  watchlistedMovieIds: Set<string>;
  personalBaseline: number;
  featureRarity: {
    genres: Map<string, number>;
    tags: Map<string, number>;
    directors: Map<string, number>;
    cast: Map<string, number>;
  };
};

type RecommendationCandidate = Recommendation & {
  rawScore: number;
  diversityKeys: string[];
};

type RecommendationOptions = {
  minimumMovieYear?: number | null;
  candidateFilter?: (movie: Movie) => boolean;
};

export type RecommendationSelector = (options?: RecommendationOptions) => Recommendation[];

export type TasteSnapshot = {
  profile: TasteProfile;
  recommendations: Recommendation[];
  selectRecommendations: RecommendationSelector;
};

type CollaborativeSignal = { score: number; sourceMovieTitle: string | undefined };
type RelatedMovieIndex = Record<"directors" | "cast" | "tags" | "genres", Map<string, number[]>>;
type ScoringContext = {
  collaborativeSignals: Map<string, CollaborativeSignal>;
  relatedMovies: RelatedMovieIndex;
};

export function buildTasteProfile(movies: Movie[], states: MovieStateMap): TasteProfile {
  return buildTasteModel(movies, states).profile;
}

export function buildTasteSnapshot(
  movies: Movie[],
  states: MovieStateMap,
  recommendationOptions: RecommendationOptions = {},
  collaborativeModel?: CollaborativeModel,
): TasteSnapshot {
  const tasteModel = buildTasteModel(movies, states);
  const selectRecommendations = createRecommendationSelectorForTasteModel(movies, states, tasteModel, collaborativeModel);

  return {
    profile: tasteModel.profile,
    recommendations: selectRecommendations(recommendationOptions),
    selectRecommendations,
  };
}

function buildTasteModel(movies: Movie[], states: MovieStateMap): TasteModel {
  const genreWeights: WeightedMap = new Map();
  const tagWeights: WeightedMap = new Map();
  const directorWeights: WeightedMap = new Map();
  const castWeights: WeightedMap = new Map();
  const likedMovies: Movie[] = [];
  const watchlistedMovieIds = new Set<string>();
  const latestRatedAt = getLatestRatedAt(movies, states);
  let ratingTotal = 0;
  let ratedCount = 0;
  let watchedCount = 0;
  const ratedMovies: Array<{ movie: Movie; rating: number; updatedAt: string }> = [];

  for (const movie of movies) {
    const state = states[movie.id];
    if (!state) {
      continue;
    }

    if (state.watched) {
      watchedCount += 1;
    }

    if (state.watchlist && !state.watched) {
      watchlistedMovieIds.add(movie.id);
      addWeights(genreWeights, movie.genres, WATCHLIST_INTENT_WEIGHT * 1.5, 0.5);
      addWeights(tagWeights, movie.tags, WATCHLIST_INTENT_WEIGHT, 0.5);
      addWeights(directorWeights, movie.directors, WATCHLIST_INTENT_WEIGHT * 1.25, 0.5);
      addWeights(castWeights, movie.cast, WATCHLIST_INTENT_WEIGHT * 0.8, 0.5);
    }

    if (state.rating === null || state.rating === undefined) {
      continue;
    }

    ratedCount += 1;
    ratingTotal += state.rating;
    ratedMovies.push({ movie, rating: state.rating, updatedAt: state.updatedAt });
  }

  const averageRating = ratedCount > 0 ? ratingTotal / ratedCount : 0;
  const personalBaseline = getPersonalBaseline(ratingTotal, ratedCount);

  for (const { movie, rating, updatedAt } of ratedMovies) {
    const weight = (rating - personalBaseline) * getRecencyMultiplier(updatedAt, latestRatedAt);

    addWeights(genreWeights, movie.genres, weight * 1.5);
    addWeights(tagWeights, movie.tags, weight);
    addWeights(directorWeights, movie.directors, weight * 1.25);
    addWeights(castWeights, movie.cast, weight * 0.8);

    if (rating >= MIN_POSITIVE_RATING) {
      likedMovies.push(movie);
    }
  }

  return {
    profile: {
      ratedCount,
      watchedCount,
      averageRating,
      topGenres: topWeights(genreWeights, 4),
      topTags: topWeights(tagWeights, 6),
    },
    genreWeights,
    tagWeights,
    directorWeights,
    castWeights,
    likedMovies,
    watchlistedMovieIds,
    personalBaseline,
    featureRarity: {
      genres: buildFeatureRarity(movies, (movie) => movie.genres),
      tags: buildFeatureRarity(movies, (movie) => movie.tags),
      directors: buildFeatureRarity(movies, (movie) => movie.directors),
      cast: buildFeatureRarity(movies, (movie) => movie.cast),
    },
  };
}

export function getRecommendations(
  movies: Movie[],
  states: MovieStateMap,
  options: RecommendationOptions = {},
  collaborativeModel?: CollaborativeModel,
): Recommendation[] {
  return createRecommendationSelector(movies, states, collaborativeModel)(options);
}

export function createRecommendationSelector(
  movies: Movie[],
  states: MovieStateMap,
  collaborativeModel?: CollaborativeModel,
): RecommendationSelector {
  const tasteModel = buildTasteModel(movies, states);

  return createRecommendationSelectorForTasteModel(movies, states, tasteModel, collaborativeModel);
}

function createRecommendationSelectorForTasteModel(
  movies: Movie[],
  states: MovieStateMap,
  tasteModel: TasteModel,
  collaborativeModel?: CollaborativeModel,
): RecommendationSelector {
  const candidateCache = new Map<string, RecommendationCandidate>();
  const scoringContext: ScoringContext = {
    collaborativeSignals: buildCollaborativeSignals(states, tasteModel, collaborativeModel),
    relatedMovies: buildRelatedMovieIndex(tasteModel),
  };

  return (options: RecommendationOptions = {}) =>
    getRecommendationsForTasteModel(movies, states, tasteModel, candidateCache, options, scoringContext);
}

function getRecommendationsForTasteModel(
  movies: Movie[],
  states: MovieStateMap,
  tasteModel: TasteModel,
  candidateCache: Map<string, RecommendationCandidate>,
  options: RecommendationOptions,
  scoringContext: ScoringContext,
) {
  const candidates = movies
    .flatMap((movie) => {
      if (options.minimumMovieYear !== null && options.minimumMovieYear !== undefined && movie.year < options.minimumMovieYear) {
        return [];
      }

      if (options.candidateFilter !== undefined && !options.candidateFilter(movie)) {
        return [];
      }

      if (!isAvailableMovieCandidate(movie, states)) {
        return [];
      }

      const scored = candidateCache.get(movie.id) ?? scoreMovie(movie, tasteModel, scoringContext);
      candidateCache.set(movie.id, scored);
      return [scored];
    })
    .slice()
    .sort((a, b) => b.rawScore - a.rawScore);

  return diversifyRecommendations(candidates, MAX_RECOMMENDATIONS).map(toRecommendation);
}

function scoreMovie(
  movie: Movie,
  tasteModel: TasteModel,
  scoringContext: ScoringContext,
): RecommendationCandidate {
  const { likedMovies, profile } = tasteModel;
  let score = getQualityScore(movie) * 0.2 + getPopularityScore(movie.popularity) * 0.07;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const genreScore = sumMapMatches(movie.genres, tasteModel.genreWeights, tasteModel.featureRarity.genres);
  if (genreScore > 0) {
    score += genreScore * 18;
    reasons.push(`leans into your ${bestWeightedMatch(movie.genres, tasteModel.genreWeights)} streak`);
  } else if (genreScore < 0) {
    score += genreScore * 18;
    penalties.push(bestWeightedMatch(movie.genres, tasteModel.genreWeights, "negative"));
  }

  const tagScore = sumMapMatches(movie.tags, tasteModel.tagWeights, tasteModel.featureRarity.tags);
  if (tagScore > 0) {
    score += tagScore * 13;
    const matchedTags = topMatchingValues(movie.tags, tasteModel.tagWeights, 2);
    reasons.push(`matches ${matchedTags.join(" and ")} taste signals`);
  } else if (tagScore < 0) {
    score += tagScore * 14;
    penalties.push(...topMatchingValues(movie.tags, tasteModel.tagWeights, 2, "negative"));
  }

  const creatorScore =
    sumMapMatches(movie.directors, tasteModel.directorWeights, tasteModel.featureRarity.directors) +
    sumMapMatches(movie.cast, tasteModel.castWeights, tasteModel.featureRarity.cast);
  if (creatorScore > 0) {
    score += creatorScore * 9;
    const matchedCreators = [...topMatchingValues(movie.directors, tasteModel.directorWeights, 1), ...topMatchingValues(movie.cast, tasteModel.castWeights, 1)];
    reasons.push(`keeps close to ${matchedCreators[0]} in your ratings`);
  } else if (creatorScore < 0) {
    score += creatorScore * 9;
  }

  if (genreScore + tagScore > 0) {
    const related = getRelatedMovies(movie, scoringContext.relatedMovies);
    if (related.count > 0) {
      score += Math.min(18, related.count * 6);
      reasons.push(`shares creative DNA with ${likedMovies[related.firstIndex].title}`);
    }
  }

  const collaborativeSignal = scoringContext.collaborativeSignals.get(movie.id);
  if (collaborativeSignal && collaborativeSignal.score !== 0) {
    score += collaborativeSignal.score * 24;
    if (collaborativeSignal.score > 0 && collaborativeSignal.sourceMovieTitle) {
      reasons.unshift(`connects with viewers who also liked ${collaborativeSignal.sourceMovieTitle}`);
    }
  }

  if (movie.runtimeMinutes <= 115) {
    const runtimeBonus = profile.ratedCount >= 3 && genreScore + tagScore < 0 ? 2 : 5;
    score += runtimeBonus;
    reasons.push("easy runtime for a weeknight watch");
  }

  if (movie.criticalScore >= 92 && movie.popularity < 80) {
    score += 6;
    reasons.push("high critical signal without being too obvious");
  }

  if (profile.ratedCount < 3) {
    reasons.push("rate a few more movies to sharpen this pick");
  }

  if (penalties.length > 0 && reasons.length < 3) {
    reasons.push(`keeps distance from lower-rated ${penalties[0]} picks`);
  }

  const rawScore = Math.min(100, Math.max(1, score));

  return {
    movie,
    score: Math.round(rawScore),
    rawScore,
    confidence: profile.ratedCount >= 8 ? "high" : profile.ratedCount >= 3 ? "medium" : "low",
    reasons: reasons.slice(0, 3),
    diversityKeys: [movie.genres[0], movie.directors[0], movie.tags[0]].filter((value) => value !== undefined),
  };
}

function addWeights(target: WeightedMap, values: string[], weight: number, evidence = 1) {
  for (const value of values) {
    const current = target.get(value) ?? { total: 0, evidence: 0 };
    target.set(value, {
      total: current.total + weight,
      evidence: current.evidence + evidence,
    });
  }
}

function getPersonalBaseline(ratingTotal: number, ratedCount: number) {
  if (ratedCount <= 0) {
    return POSITIVE_BASELINE;
  }

  return (ratingTotal + POSITIVE_BASELINE * BASELINE_PRIOR_RATINGS) / (ratedCount + BASELINE_PRIOR_RATINGS);
}

function getQualityScore(movie: Movie) {
  const source = movie.source;
  const scores: Array<{ score: number; weight: number }> = [
    { score: movie.criticalScore, weight: 1 },
  ];

  if (source?.tmdbVoteAverage !== undefined) {
    scores.push({
      score: source.tmdbVoteAverage * 10,
      weight: 1.25 * getVoteConfidence(source.tmdbVoteCount),
    });
  }

  const weightedScore = scores.reduce(
    (total, item) => ({
      score: total.score + clampScore(item.score) * item.weight,
      weight: total.weight + item.weight,
    }),
    { score: 0, weight: 0 },
  );

  return weightedScore.weight > 0 ? weightedScore.score / weightedScore.weight : clampScore(movie.criticalScore);
}

function getVoteConfidence(voteCount?: number) {
  if (voteCount === undefined || !Number.isFinite(voteCount) || voteCount <= 0) {
    return 0.2;
  }

  return Math.max(0.2, Math.min(1, Math.log10(voteCount + 1) / Math.log10(MAX_SOURCE_VOTE_COUNT + 1)));
}

function getPopularityScore(popularity: number) {
  if (!Number.isFinite(popularity) || popularity <= 0) {
    return 0;
  }

  return Math.min(100, Math.log1p(popularity) / Math.log1p(100) * 100);
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(100, Math.max(0, score));
}

function topWeights(weights: WeightedMap, count: number) {
  const items: Array<{ name: string; weight: number }> = [];

  for (const [name, signal] of weights) {
    const weight = signalStrength(signal);
    if (weight > 0) {
      items.push({ name, weight });
    }
  }

  items.sort((a, b) => b.weight - a.weight);
  return items.slice(0, count);
}

function sumMapMatches(values: string[], weights: WeightedMap, rarity: Map<string, number>) {
  const strongest: number[] = [];

  for (const value of values) {
    const weight = signalStrength(weights.get(value)) * (rarity.get(value) ?? 1);
    insertRanked(strongest, weight, MAX_FEATURE_MATCHES, (candidate, current) => Math.abs(candidate) > Math.abs(current));
  }

  let total = 0;
  for (const weight of strongest) {
    total += weight;
  }

  return total;
}

function buildFeatureRarity(movies: Movie[], selectValues: (movie: Movie) => string[]) {
  const documentFrequency = new Map<string, number>();
  for (const movie of movies) {
    for (const value of new Set(selectValues(movie))) {
      documentFrequency.set(value, (documentFrequency.get(value) ?? 0) + 1);
    }
  }

  const normalizer = Math.log(movies.length + 1) || 1;
  return new Map(
    [...documentFrequency.entries()].map(([value, count]) => [
      value,
      1 + Math.log((movies.length + 1) / (count + 1)) / normalizer,
    ]),
  );
}

function buildCollaborativeSignals(
  states: MovieStateMap,
  tasteModel: TasteModel,
  collaborativeModel?: CollaborativeModel,
) {
  const signals = new Map<string, CollaborativeSignal>();
  if (!collaborativeModel) {
    return signals;
  }

  const totals = new Map<string, {
    numerator: number;
    denominator: number;
    strongestPositiveSignal: number;
    sourceMovieTitle: string | undefined;
  }>();
  const likedMoviesById = new Map(tasteModel.likedMovies.map((movie) => [movie.id, movie.title]));

  for (const [sourceMovieId, state] of Object.entries(states)) {
    if (state.rating === null) {
      continue;
    }

    // Match the previous first-neighbor semantics even for duplicate model edges.
    const seen = new Set<string>();
    for (const neighbor of collaborativeModel.get(sourceMovieId) ?? []) {
      if (seen.has(neighbor.movieId)) continue;
      seen.add(neighbor.movieId);
      const total = totals.get(neighbor.movieId) ?? {
        numerator: 0, denominator: 0, strongestPositiveSignal: 0, sourceMovieTitle: undefined,
      };
      const signal = neighbor.similarity * (state.rating - tasteModel.personalBaseline);
      total.numerator += signal;
      total.denominator += Math.abs(neighbor.similarity);
      if (signal > total.strongestPositiveSignal) {
        total.strongestPositiveSignal = signal;
        total.sourceMovieTitle = likedMoviesById.get(sourceMovieId);
      }
      totals.set(neighbor.movieId, total);
    }
  }

  for (const [movieId, total] of totals) {
    if (total.denominator === 0) continue;
    const confidence = Math.min(1, total.denominator * 2.5);
    signals.set(movieId, {
      score: Math.max(-1, Math.min(1, total.numerator / total.denominator / 2)) * confidence,
      sourceMovieTitle: total.sourceMovieTitle,
    });
  }
  return signals;
}

function topMatchingValues(values: string[], weights: WeightedMap, count: number, direction: "positive" | "negative" = "positive") {
  const matches: Array<{ value: string; weight: number }> = [];

  for (const value of values) {
    const weight = signalStrength(weights.get(value));
    if (direction === "positive" ? weight <= 0 : weight >= 0) {
      continue;
    }

    const match = { value, weight };
    insertRanked(matches, match, count, (candidate, current) =>
      direction === "positive" ? candidate.weight > current.weight : candidate.weight < current.weight,
    );
  }

  return matches.map((match) => match.value);
}

function insertRanked<T>(
  items: T[],
  candidate: T,
  limit: number,
  ranksBefore: (candidate: T, current: T) => boolean,
) {
  let insertAt = items.length;
  for (let index = 0; index < items.length; index += 1) {
    if (ranksBefore(candidate, items[index])) {
      insertAt = index;
      break;
    }
  }

  items.splice(insertAt, 0, candidate);
  if (items.length > limit) {
    items.pop();
  }
}

function bestWeightedMatch(values: string[], weights: WeightedMap, direction: "positive" | "negative" = "positive") {
  return topMatchingValues(values, weights, 1, direction)[0] ?? values[0] ?? "movie";
}

function signalStrength(signal?: WeightedSignal) {
  if (!signal || signal.evidence <= 0) {
    return 0;
  }

  const average = signal.total / signal.evidence;
  const confidence = Math.min(1, Math.sqrt(signal.evidence) / 3);
  return Math.tanh(average) * confidence;
}

function diversifyRecommendations(candidates: RecommendationCandidate[], count: number) {
  const selected: RecommendationCandidate[] = [];
  const keyUses = new Map<string, number>();

  for (const candidate of candidates) {
    if (selected.length >= count) {
      break;
    }

    const hasDominantDuplicate = candidate.diversityKeys.some((key) => (keyUses.get(key) ?? 0) >= 2);
    if (hasDominantDuplicate && selected.length < Math.min(count, 4)) {
      continue;
    }

    selected.push(candidate);
    for (const key of candidate.diversityKeys) {
      keyUses.set(key, (keyUses.get(key) ?? 0) + 1);
    }
  }

  if (selected.length >= count) {
    return selected;
  }

  const selectedIds = new Set(selected.map((candidate) => candidate.movie.id));
  for (const candidate of candidates) {
    if (selectedIds.has(candidate.movie.id)) {
      continue;
    }

    selected.push(candidate);
    selectedIds.add(candidate.movie.id);
    if (selected.length >= count) {
      break;
    }
  }

  return selected;
}

function toRecommendation(candidate: RecommendationCandidate): Recommendation {
  return {
    movie: candidate.movie,
    score: candidate.score,
    confidence: candidate.confidence,
    reasons: candidate.reasons,
  };
}

function buildRelatedMovieIndex(tasteModel: TasteModel): RelatedMovieIndex {
  const index: RelatedMovieIndex = { directors: new Map(), cast: new Map(), tags: new Map(), genres: new Map() };
  const fields: Array<keyof RelatedMovieIndex> = ["directors", "cast", "tags", "genres"];
  tasteModel.likedMovies.forEach((movie, movieIndex) => {
    for (const field of fields) {
      for (const value of new Set(movie[field])) {
        const weights = field === "tags" ? tasteModel.tagWeights : field === "genres" ? tasteModel.genreWeights : undefined;
        if (weights && signalStrength(weights.get(value)) <= MIN_RELATED_SIGNAL) continue;
        const matches = index[field].get(value) ?? [];
        // The bonus saturates at three matches. Keeping the first three per
        // feature preserves both that cap and the earliest explanation source.
        if (matches.length < 3) matches.push(movieIndex);
        index[field].set(value, matches);
      }
    }
  });
  return index;
}

function getRelatedMovies(movie: Movie, index: RelatedMovieIndex) {
  const matches = new Set<number>();
  let firstIndex = Infinity;
  const fields: Array<keyof RelatedMovieIndex> = ["directors", "cast", "tags", "genres"];
  for (const field of fields) {
    for (const value of movie[field]) {
      for (const movieIndex of index[field].get(value) ?? []) {
        matches.add(movieIndex);
        firstIndex = Math.min(firstIndex, movieIndex);
      }
    }
  }
  return { count: matches.size, firstIndex };
}

function getLatestRatedAt(movies: Movie[], states: MovieStateMap) {
  return movies.reduce<number | null>((latest, movie) => {
    const state = states[movie.id];
    if (state?.rating === null || state?.rating === undefined) {
      return latest;
    }

    const updatedAt = Date.parse(state.updatedAt);
    if (Number.isNaN(updatedAt)) {
      return latest;
    }

    return latest === null ? updatedAt : Math.max(latest, updatedAt);
  }, null);
}

function getRecencyMultiplier(updatedAt: string, latestRatedAt: number | null) {
  if (latestRatedAt === null) {
    return 1;
  }

  const ratedAt = Date.parse(updatedAt);
  if (Number.isNaN(ratedAt)) {
    return 1;
  }

  const ageDays = Math.max(0, (latestRatedAt - ratedAt) / 86_400_000);
  return Math.max(0.7, 1.25 - ageDays * 0.002);
}
