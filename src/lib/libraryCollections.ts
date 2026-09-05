import type { Movie, MovieStateMap } from "@/types";

export function buildLibraryCollections(movies: Movie[], states: MovieStateMap) {
  const ratedMovies: Movie[] = [];
  const history: Array<{ movie: Movie; updatedAt: number }> = [];
  const watchlistMovies: Movie[] = [];
  for (const movie of movies) {
    const state = states[movie.id];
    if (!state) continue;
    if (state.rating) ratedMovies.push(movie);
    if (state.watched || state.rating) {
      const updatedAt = Date.parse(state.updatedAt);
      history.push({ movie, updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt });
    }
    if (state.watchlist && !state.watched) watchlistMovies.push(movie);
  }
  ratedMovies.sort((a, b) => (states[b.id]?.rating ?? 0) - (states[a.id]?.rating ?? 0));
  history.sort((a, b) => b.updatedAt - a.updatedAt);
  return { ratedMovies, historyMovies: history.map(({ movie }) => movie), watchlistMovies };
}
