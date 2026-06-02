import { useMemo } from "react";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { buildDiscoverSections } from "@/lib/discoverSections";
import { buildMovieSearchIndex, searchMovieIndex } from "@/lib/movieSearch";

export type CatalogViewData = ReturnType<typeof useCatalogViewData>;

export function useCatalogViewData(library: MovieLibrary, search: string) {
  const discoverSections = useMemo(
    () =>
      buildDiscoverSections({
        visibleMovies: library.visibleMovies,
        states: library.states,
        recommendations: library.recommendations,
      }),
    [library.recommendations, library.states, library.visibleMovies],
  );

  const searchIndex = useMemo(() => buildMovieSearchIndex(library.visibleMovies), [library.visibleMovies]);

  const filteredCatalog = useMemo(() => {
    return searchMovieIndex(searchIndex, search);
  }, [search, searchIndex]);

  return {
    discoverSections,
    filteredCatalog,
  };
}
