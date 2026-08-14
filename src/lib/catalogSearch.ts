import { normalizeSearchText } from "@/lib/movieSearch";
import type { CatalogSearchEntry } from "@/types";

export type CatalogSearchOptions = {
  query: string;
  languageCodes: string[];
  showAdultMovies: boolean;
  excludedMovieIds: string[];
  limit: number;
};

export type CatalogSearchResult = {
  movieIds: string[];
  total: number;
};

export function searchCatalogEntries(entries: CatalogSearchEntry[], options: CatalogSearchOptions): CatalogSearchResult {
  const query = normalizeSearchText(options.query);
  const allowedLanguages = new Set(options.languageCodes);
  const excludedMovieIds = new Set(options.excludedMovieIds);
  const movieIds: string[] = [];
  let total = 0;

  if (!query) {
    return { movieIds, total };
  }

  for (const [movieId, searchableText, originalLanguage, isAdult] of entries) {
    if (
      !allowedLanguages.has(originalLanguage) ||
      (!options.showAdultMovies && isAdult === 1) ||
      excludedMovieIds.has(movieId) ||
      !searchableText.includes(query)
    ) {
      continue;
    }

    total += 1;
    if (movieIds.length < options.limit) {
      movieIds.push(movieId);
    }
  }

  return { movieIds, total };
}
