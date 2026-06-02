import type { Movie, MovieStateMap, Recommendation, TasteProfile } from "@/types";

type WeightedMap = Map<string, number>;

const POSITIVE_BASELINE = 3.5;

export function buildTasteProfile(movies: Movie[], states: MovieStateMap): TasteProfile {
  const genreWeights: WeightedMap = new Map();
  const tagWeights: WeightedMap = new Map();
  let ratingTotal = 0;
  let ratedCount = 0;
  let watchedCount = 0;

  for (const movie of movies) {
    const state = states[movie.id];
    if (!state) {
      continue;
    }

    if (state.watched) {
      watchedCount += 1;
    }

    if (state.rating === null || state.rating === undefined) {
      continue;
    }

    ratedCount += 1;
    ratingTotal += state.rating;
    const weight = state.rating - POSITIVE_BASELINE;

    addWeights(genreWeights, movie.genres, weight * 1.5);
    addWeights(tagWeights, movie.tags, weight);
  }

  return {
    ratedCount,
    watchedCount,
    averageRating: ratedCount > 0 ? ratingTotal / ratedCount : 0,
    topGenres: topWeights(genreWeights, 4),
    topTags: topWeights(tagWeights, 6),
  };
}

export function getRecommendations(movies: Movie[], states: MovieStateMap): Recommendation[] {
  const profile = buildTasteProfile(movies, states);
  const likedMovies = movies.filter((movie) => {
    const rating = states[movie.id]?.rating;
    return rating !== null && rating !== undefined && rating >= 4;
  });

  return movies
    .flatMap((movie) => {
      const state = states[movie.id];
      if (state?.ignored || state?.watched || state?.rating) {
        return [];
      }

      const scored = scoreMovie(movie, profile, likedMovies);
      return [scored];
    })
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function scoreMovie(movie: Movie, profile: TasteProfile, likedMovies: Movie[]): Recommendation {
  let score = movie.criticalScore * 0.22 + movie.popularity * 0.12;
  const reasons: string[] = [];

  const genreScore = sumMatches(movie.genres, profile.topGenres);
  if (genreScore > 0) {
    score += genreScore * 18;
    reasons.push(`leans into your ${movie.genres.find((genre) => hasName(profile.topGenres, genre))} streak`);
  }

  const tagScore = sumMatches(movie.tags, profile.topTags);
  if (tagScore > 0) {
    score += tagScore * 12;
    const matchedTags = movie.tags.filter((tag) => hasName(profile.topTags, tag)).slice(0, 2);
    reasons.push(`matches ${matchedTags.join(" and ")} taste signals`);
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

  return {
    movie,
    score: Math.min(99, Math.max(1, Math.round(score))),
    confidence: profile.ratedCount >= 8 ? "high" : profile.ratedCount >= 3 ? "medium" : "low",
    reasons: reasons.slice(0, 3),
  };
}

function addWeights(target: WeightedMap, values: string[], weight: number) {
  for (const value of values) {
    target.set(value, (target.get(value) ?? 0) + weight);
  }
}

function topWeights(weights: WeightedMap, count: number) {
  return Array.from(weights.entries())
    .filter(([, weight]) => weight > 0)
    .map(([name, weight]) => ({ name, weight }))
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count);
}

function sumMatches(values: string[], weights: Array<{ name: string; weight: number }>) {
  return values.reduce((total, value) => total + (weights.find((item) => item.name === value)?.weight ?? 0), 0);
}

function hasName(values: Array<{ name: string }>, name: string) {
  return values.some((value) => value.name === name);
}

function intersects(a: string[], b: string[]) {
  const bSet = new Set(b);
  return a.some((value) => bSet.has(value));
}
