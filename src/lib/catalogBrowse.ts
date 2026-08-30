export type CatalogGenre = "" | "Action" | "Animation" | "Comedy" | "Documentary" | "Drama" | "Horror" | "Romance" | "Science Fiction" | "Thriller";
export type CatalogEra = "" | "2020s" | "2010s" | "2000s" | "classics";
export type CatalogRuntime = "" | "short" | "standard" | "long";
export type CatalogSort = "relevance" | "newest" | "top-rated" | "shortest";

export type CatalogBrowseFilters = {
  genre: CatalogGenre;
  era: CatalogEra;
  runtime: CatalogRuntime;
  sort: CatalogSort;
};

export const defaultCatalogBrowseFilters: CatalogBrowseFilters = {
  genre: "",
  era: "",
  runtime: "",
  sort: "relevance",
};

export const catalogGenres: CatalogGenre[] = [
  "",
  "Action",
  "Animation",
  "Comedy",
  "Documentary",
  "Drama",
  "Horror",
  "Romance",
  "Science Fiction",
  "Thriller",
];

export function hasActiveCatalogBrowseFilters(filters: CatalogBrowseFilters) {
  return filters.genre !== "" || filters.era !== "" || filters.runtime !== "" || filters.sort !== "relevance";
}

export function describeCatalogBrowseFilters(filters: CatalogBrowseFilters) {
  const labels: string[] = [];
  if (filters.genre) labels.push(filters.genre);
  if (filters.era) labels.push(filters.era === "classics" ? "Before 2000" : filters.era);
  if (filters.runtime === "short") labels.push("Under 90 min");
  if (filters.runtime === "standard") labels.push("90–120 min");
  if (filters.runtime === "long") labels.push("Over 120 min");
  if (filters.sort === "newest") labels.push("Newest first");
  if (filters.sort === "top-rated") labels.push("Top rated first");
  if (filters.sort === "shortest") labels.push("Shortest first");
  return labels.join(" · ");
}

export function readCatalogBrowseFilters(searchParams: URLSearchParams): CatalogBrowseFilters {
  return {
    genre: parseGenre(searchParams.get("genre")),
    era: parseEra(searchParams.get("era")),
    runtime: parseRuntime(searchParams.get("runtime")),
    sort: parseSort(searchParams.get("sort")),
  };
}

export function writeCatalogBrowseFilters(searchParams: URLSearchParams, filters: CatalogBrowseFilters) {
  setOptionalParam(searchParams, "genre", filters.genre);
  setOptionalParam(searchParams, "era", filters.era);
  setOptionalParam(searchParams, "runtime", filters.runtime);
  setOptionalParam(searchParams, "sort", filters.sort === "relevance" ? "" : filters.sort);
}

export function updateCatalogBrowseFilter(filters: CatalogBrowseFilters, key: keyof CatalogBrowseFilters, value: string): CatalogBrowseFilters {
  if (key === "genre") return { ...filters, genre: parseGenre(value) };
  if (key === "era") return { ...filters, era: parseEra(value) };
  if (key === "runtime") return { ...filters, runtime: parseRuntime(value) };
  return { ...filters, sort: parseSort(value) };
}

function parseGenre(value: string | null): CatalogGenre {
  return catalogGenres.find((genre) => genre === value) ?? "";
}

function parseEra(value: string | null): CatalogEra {
  if (value === "2020s" || value === "2010s" || value === "2000s" || value === "classics") return value;
  return "";
}

function parseRuntime(value: string | null): CatalogRuntime {
  if (value === "short" || value === "standard" || value === "long") return value;
  return "";
}

function parseSort(value: string | null): CatalogSort {
  if (value === "newest" || value === "top-rated" || value === "shortest") return value;
  return "relevance";
}

function setOptionalParam(searchParams: URLSearchParams, key: string, value: string) {
  if (value) searchParams.set(key, value);
  else searchParams.delete(key);
}
