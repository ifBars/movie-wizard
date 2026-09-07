import type { Movie } from "@/types";

const PRIOR_SCORE = 65;
const PRIOR_VOTES = 100;

export function getAudienceScore(movie: Movie) {
  const source = movie.source;
  if (source?.tmdbVoteAverage === undefined || !Number.isFinite(source.tmdbVoteAverage)) {
    return clampScore(movie.criticalScore);
  }
  // criticalScore is also derived from TMDB, not an independent critic vote.
  // Shrink small samples toward a neutral prior instead of counting twice.
  const votes = Number.isFinite(source.tmdbVoteCount) ? Math.max(0, source.tmdbVoteCount ?? 0) : 0;
  const confidence = votes / (votes + PRIOR_VOTES);
  return clampScore(source.tmdbVoteAverage * 10) * confidence + PRIOR_SCORE * (1 - confidence);
}

function clampScore(score: number) {
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
}
