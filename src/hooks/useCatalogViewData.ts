import { useMemo } from "react";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { buildMovieSearchIndex, searchMovieIndex } from "@/lib/movieSearch";

export type CatalogViewData = ReturnType<typeof useCatalogViewData>;

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

  const searchIndex = useMemo(() => buildMovieSearchIndex(library.movies), [library.movies]);

  const filteredCatalog = useMemo(() => {
    return searchMovieIndex(searchIndex, search);
  }, [search, searchIndex]);

  return {
    topPicks,
    recentReleases,
    filteredCatalog,
  };
}
