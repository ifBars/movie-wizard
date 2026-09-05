import { useCallback, useState } from "react";
import { useExternalSyncEffect } from "@/hooks/useExternalSyncEffect";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { hasActiveCatalogBrowseFilters } from "@/lib/catalogBrowse";
import type { CatalogBrowseFilters } from "@/lib/catalogBrowse";
import { loadMoviesByIds } from "@/lib/catalogRepository";
import { searchCatalog } from "@/lib/catalogSearchClient";
import type { Movie } from "@/types";

export type CatalogViewData = ReturnType<typeof useCatalogViewData>;

const searchPageSize = 24;

type SearchResultState = {
  requestKey: string;
  movies: Movie[];
  total: number;
  limit: number;
};

export function useCatalogViewData(library: MovieLibrary, search: string, browseFilters: CatalogBrowseFilters) {
  const normalizedSearch = search.trim();
  const requestKey = `${normalizedSearch}|${browseFilters.genre}|${browseFilters.era}|${browseFilters.runtime}|${browseFilters.sort}`;
  const [searchResults, setSearchResults] = useState<SearchResultState>({ requestKey: "", movies: [], total: 0, limit: searchPageSize });
  const requestedLimit = searchResults.requestKey === requestKey ? searchResults.limit : searchPageSize;

  useExternalSyncEffect(() => {
    if (!normalizedSearch && !hasActiveCatalogBrowseFilters(browseFilters)) {
      return;
    }

    let isCurrent = true;
    const excludedMovieIds: string[] = [];
    for (const state of Object.values(library.states)) {
      if (state.ignored || state.watched || state.watchlist || state.rating !== null) {
        excludedMovieIds.push(state.movieId);
      }
    }

    void searchCatalog({
      query: normalizedSearch,
      ...browseFilters,
      languageCodes: library.settings.languageCodes,
      showAdultMovies: library.settings.showAdultMovies,
      excludedMovieIds,
      limit: requestedLimit,
    })
      .then(async (result) => isCurrent ? { ...result, movies: await loadMoviesByIds(result.movieIds) } : undefined)
      .then((result) => {
        if (isCurrent && result) {
          setSearchResults({ requestKey, movies: result.movies, total: result.total, limit: requestedLimit });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setSearchResults({ requestKey, movies: [], total: 0, limit: requestedLimit });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [browseFilters, library.settings.languageCodes, library.settings.showAdultMovies, library.states, normalizedSearch, requestKey, requestedLimit]);

  const loadMoreSearchResults = useCallback(() => {
    setSearchResults((current) => ({
      ...current,
      requestKey,
      limit: (current.requestKey === requestKey ? current.limit : searchPageSize) + searchPageSize,
    }));
  }, [requestKey]);

  const hasCurrentSearchResults = searchResults.requestKey === requestKey;
  const isCatalogBrowseMode = normalizedSearch.length > 0 || hasActiveCatalogBrowseFilters(browseFilters);

  return {
    discoverSections: library.discoverSections,
    filteredCatalog: hasCurrentSearchResults ? searchResults.movies : [],
    isCatalogBrowseMode,
    isSearchLoading: isCatalogBrowseMode && !hasCurrentSearchResults,
    searchResultTotal: hasCurrentSearchResults ? searchResults.total : 0,
    loadMoreSearchResults,
  };
}
