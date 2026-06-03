import type { Movie, MovieStateMap } from "@/types";

export function isAvailableMovieCandidate(movie: Movie, states: MovieStateMap) {
  const state = states[movie.id];

  return !state?.ignored && !state?.watched && (state?.rating === null || state?.rating === undefined) && !state?.watchlist;
}
