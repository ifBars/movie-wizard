import type { Movie } from "@/types";

const tmdbImageBase = "https://image.tmdb.org/t/p/w500";
const tmdbBackdropBase = "https://image.tmdb.org/t/p/w780";

export function getPosterUri(movie: Movie) {
  return movie.posterPath ? `${tmdbImageBase}${movie.posterPath}` : null;
}

export function getBackdropUri(movie: Movie) {
  return movie.backdropPath ? `${tmdbBackdropBase}${movie.backdropPath}` : getPosterUri(movie);
}
