import { useMemo } from "react";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { buildDiscoverSections } from "@/lib/discoverSections";
import { isAvailableMovieCandidate } from "@/lib/movieEligibility";
import { buildLinearMovieSearchCorpus, linearSearchMovieCorpus } from "@/lib/movieSearch";

export type CatalogViewData = ReturnType<typeof useCatalogViewData>;

export function useCatalogViewData(library: MovieLibrary, search: string) {
  const hasSearch = search.trim().length > 0;
  const discoverSections = useMemo(
    () =>
      buildDiscoverSections({
        visibleMovies: library.visibleMovies,
        states: library.states,
        recommendations: library.recommendations,
        minimumRecommendationYear: library.settings.minimumRecommendationYear,
      }),
    [library.recommendations, library.settings.minimumRecommendationYear, library.states, library.visibleMovies],
  );

  const searchCorpus = useMemo(
    () => (hasSearch ? buildLinearMovieSearchCorpus(library.visibleMovies) : undefined),
    [hasSearch, library.visibleMovies],
  );

  const filteredCatalog = useMemo(() => {
    if (!searchCorpus) {
      return [];
    }

    return linearSearchMovieCorpus(searchCorpus, search).filter((movie) => isAvailableMovieCandidate(movie, library.states));
  }, [library.states, search, searchCorpus]);

  return {
    discoverSections,
    filteredCatalog,
  };
}
