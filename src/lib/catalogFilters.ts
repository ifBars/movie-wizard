import { filterAdultMovies, isAdultMovie } from "@/lib/adultMovies";
import { countMoviesHiddenByLanguage, filterMoviesByLanguage } from "@/lib/languagePreferences";
import type { LibrarySettings, Movie } from "@/types";

export function filterCatalogMovies(movies: Movie[], settings: LibrarySettings) {
  return filterMoviesByLanguage(filterAdultMovies(movies, settings.showAdultMovies), settings.languageCodes);
}

export function getCatalogFilterCounts(movies: Movie[], settings: LibrarySettings) {
  const adultFilteredMovies = filterAdultMovies(movies, settings.showAdultMovies);

  return {
    hiddenAdultMovieCount: movies.filter(isAdultMovie).length,
    hiddenLanguageMovieCount: countMoviesHiddenByLanguage(adultFilteredMovies, settings.languageCodes),
  };
}
