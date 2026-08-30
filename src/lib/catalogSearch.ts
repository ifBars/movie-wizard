import { normalizeSearchText } from "@/lib/movieSearch";
import type { CatalogBrowseFilters } from "@/lib/catalogBrowse";
import type { CatalogSearchEntry } from "@/types";

export type CatalogSearchOptions = CatalogBrowseFilters & {
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
  const matches: CatalogSearchEntry[] = [];

  if (!query && !hasCatalogConstraints(options)) {
    return { movieIds: [], total: 0 };
  }

  for (const entry of entries) {
    const [movieId, searchableText, originalLanguage, isAdult, year, runtimeMinutes, normalizedGenres] = entry;
    if (
      !allowedLanguages.has(originalLanguage) ||
      (!options.showAdultMovies && isAdult === 1) ||
      excludedMovieIds.has(movieId) ||
      (query && !searchableText.includes(query)) ||
      (options.genre && !normalizedGenres.split("|").includes(options.genre.toLowerCase())) ||
      !matchesEra(year, options.era) ||
      !matchesRuntime(runtimeMinutes, options.runtime)
    ) {
      continue;
    }

    matches.push(entry);
  }

  sortMatches(matches, options.sort);
  return { movieIds: matches.slice(0, options.limit).map(([movieId]) => movieId), total: matches.length };
}

function hasCatalogConstraints(options: CatalogSearchOptions) {
  return options.genre !== "" || options.era !== "" || options.runtime !== "" || options.sort !== "relevance";
}

function matchesEra(year: number, era: CatalogBrowseFilters["era"]) {
  if (era === "2020s") return year >= 2020;
  if (era === "2010s") return year >= 2010 && year <= 2019;
  if (era === "2000s") return year >= 2000 && year <= 2009;
  if (era === "classics") return year < 2000;
  return true;
}

function matchesRuntime(runtimeMinutes: number, runtime: CatalogBrowseFilters["runtime"]) {
  if (runtime === "short") return runtimeMinutes > 0 && runtimeMinutes < 90;
  if (runtime === "standard") return runtimeMinutes >= 90 && runtimeMinutes <= 120;
  if (runtime === "long") return runtimeMinutes > 120;
  return true;
}

function sortMatches(matches: CatalogSearchEntry[], sort: CatalogBrowseFilters["sort"]) {
  if (sort === "newest") {
    matches.sort((a, b) => b[4] - a[4] || b[8] - a[8]);
  } else if (sort === "top-rated") {
    matches.sort((a, b) => b[7] - a[7] || b[8] - a[8]);
  } else if (sort === "shortest") {
    matches.sort((a, b) => a[5] - b[5] || b[7] - a[7]);
  }
}
