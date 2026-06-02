import { useMemo } from "react";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";

export function useCatalogViewData(library: MovieLibrary, search: string) {
  const topPicks = useMemo(() => library.recommendations.map((recommendation) => recommendation.movie), [library.recommendations]);

  const recentReleases = useMemo(
    () =>
      library.movies
        .filter((movie) => !library.states[movie.id]?.watched)
        .slice()
        .sort((a, b) => b.year - a.year || b.criticalScore - a.criticalScore)
        .slice(0, 8),
    [library.movies, library.states],
  );

  const searchableMovies = useMemo(
    () =>
      library.movies.map((movie) => ({
        movie,
        text: [movie.title, movie.year.toString(), ...movie.genres, ...movie.tags, ...movie.directors, ...movie.cast]
          .join(" ")
          .toLowerCase(),
      })),
    [library.movies],
  );

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return library.movies.slice(0, 12);
    }

    return searchableMovies.filter((entry) => entry.text.includes(term)).map((entry) => entry.movie);
  }, [library.movies, search, searchableMovies]);

  return {
    topPicks,
    recentReleases,
    filteredCatalog,
  };
}
