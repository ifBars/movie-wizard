import type { Movie, MovieStateMap, Recommendation, TasteProfile } from "@/types";

type WeightedMap = Map<string, WeightedSignal>;
type WeightedSignal = {
  total: number;
  evidence: number;
};

const POSITIVE_BASELINE = 3.5;
const MIN_POSITIVE_RATING = 4;
const MAX_RECOMMENDATIONS = 240;
const WATCHLIST_INTENT_WEIGHT = 0.35;
const WATCHLIST_CANDIDATE_BOOST = 7;
const MAX_FEATURE_MATCHES = 3;

type TasteModel = {
  profile: TasteProfile;
  genreWeights: WeightedMap;
  tagWeights: WeightedMap;
  directorWeights: WeightedMap;
  castWeights: WeightedMap;
  likedMovies: Movie[];
  watchlistedMovieIds: Set<string>;
};

type RecommendationCandidate = Recommendation & {
  diversityKeys: string[];
};

type RecommendationOptions = {
  minimumMovieYear?: number | null;
};

export function buildTasteProfile(movies: Movie[], states: MovieStateMap): TasteProfile {
  return buildTasteModel(movies, states).profile;
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
  const personalBaseline = ratedCount > 0 ? averageRating : POSITIVE_BASELINE;

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
  };
}

export function getRecommendations(movies: Movie[], states: MovieStateMap, options: RecommendationOptions = {}): Recommendation[] {
  const tasteModel = buildTasteModel(movies, states);

  const candidates = movies
    .flatMap((movie) => {
      if (options.minimumMovieYear !== null && options.minimumMovieYear !== undefined && movie.year < options.minimumMovieYear) {
        return [];
      }

      const state = states[movie.id];
      if (state?.ignored || state?.watched || state?.rating) {
        return [];
      }

      const scored = scoreMovie(movie, tasteModel);
      return [scored];
    })
    .slice()
    .sort((a, b) => b.score - a.score);

  return diversifyRecommendations(candidates, MAX_RECOMMENDATIONS).map(toRecommendation);
}

function scoreMovie(movie: Movie, tasteModel: TasteModel): RecommendationCandidate {
  const { likedMovies, profile } = tasteModel;
  let score = movie.criticalScore * 0.18 + movie.popularity * 0.08;
  const reasons: string[] = [];
  const penalties: string[] = [];
  const isWatchlisted = tasteModel.watchlistedMovieIds.has(movie.id);

  if (isWatchlisted) {
    score += WATCHLIST_CANDIDATE_BOOST;
    reasons.push("already waiting on your watchlist");
  }

  const genreScore = sumMapMatches(movie.genres, tasteModel.genreWeights);
  if (genreScore > 0) {
    score += genreScore * 18;
    reasons.push(`leans into your ${bestWeightedMatch(movie.genres, tasteModel.genreWeights)} streak`);
  } else if (genreScore < 0) {
    score += genreScore * 12;
    penalties.push(bestWeightedMatch(movie.genres, tasteModel.genreWeights, "negative"));
  }

  const tagScore = sumMapMatches(movie.tags, tasteModel.tagWeights);
  if (tagScore > 0) {
    score += tagScore * 13;
    const matchedTags = topMatchingValues(movie.tags, tasteModel.tagWeights, 2);
    reasons.push(`matches ${matchedTags.join(" and ")} taste signals`);
  } else if (tagScore < 0) {
    score += tagScore * 9;
    penalties.push(...topMatchingValues(movie.tags, tasteModel.tagWeights, 2, "negative"));
  }

  const creatorScore = sumMapMatches(movie.directors, tasteModel.directorWeights) + sumMapMatches(movie.cast, tasteModel.castWeights);
  if (creatorScore > 0) {
    score += creatorScore * 9;
    const matchedCreators = [...topMatchingValues(movie.directors, tasteModel.directorWeights, 1), ...topMatchingValues(movie.cast, tasteModel.castWeights, 1)];
    reasons.push(`keeps close to ${matchedCreators[0]} in your ratings`);
  } else if (creatorScore < 0) {
    score += creatorScore * 6;
  }

  const relatedCreators = likedMovies.filter(
    (liked) =>
      intersects(liked.directors, movie.directors) ||
      intersects(liked.cast, movie.cast) ||
      intersects(liked.tags, movie.tags),
  );

  if (relatedCreators.length > 0) {
    score += Math.min(18, relatedCreators.length * 6);
    reasons.push(`shares creative DNA with ${relatedCreators[0].title}`);
  }

  if (movie.runtimeMinutes <= 115) {
    score += 5;
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

  return {
    movie,
    score: Math.min(100, Math.max(1, Math.round(score))),
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

function topWeights(weights: WeightedMap, count: number) {
  return Array.from(weights.entries())
    .map(([name, signal]) => ({ name, weight: signalStrength(signal) }))
    .filter((item) => item.weight > 0)
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count);
}

function sumMapMatches(values: string[], weights: WeightedMap) {
  return values
    .map((value) => signalStrength(weights.get(value)))
    .sort((a, b) => Math.abs(b) - Math.abs(a))
    .slice(0, MAX_FEATURE_MATCHES)
    .reduce((total, value) => total + value, 0);
}

function topMatchingValues(values: string[], weights: WeightedMap, count: number, direction: "positive" | "negative" = "positive") {
  return values
    .map((value) => ({ value, weight: signalStrength(weights.get(value)) }))
    .filter((item) => (direction === "positive" ? item.weight > 0 : item.weight < 0))
    .sort((a, b) => (direction === "positive" ? b.weight - a.weight : a.weight - b.weight))
    .slice(0, count)
    .map((item) => item.value);
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

  for (const candidate of candidates) {
    if (selected.includes(candidate)) {
      continue;
    }

    selected.push(candidate);
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

function intersects(a: string[], b: string[]) {
  const bSet = new Set(b);
  return a.some((value) => bSet.has(value));
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
