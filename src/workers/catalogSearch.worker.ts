import catalogSearchUrl from "@/data/generated/catalog-search.json?url";
import { searchCatalogEntries } from "@/lib/catalogSearch";
import type { CatalogSearchPayload } from "@/types";

type SearchRequest = {
  requestId: number;
  query: string;
  languageCodes: string[];
  showAdultMovies: boolean;
  excludedMovieIds: string[];
  limit: number;
};

type SearchResponse = {
  requestId: number;
  movieIds: string[];
  total: number;
  error?: string;
};

let searchPayloadPromise: Promise<CatalogSearchPayload> | undefined;

self.onmessage = (event: MessageEvent<SearchRequest>) => {
  void searchCatalog(event.data)
    .then((result) => self.postMessage(result))
    .catch((error: unknown) => {
      self.postMessage({
        requestId: event.data.requestId,
        movieIds: [],
        total: 0,
        error: error instanceof Error ? error.message : "Movie search failed",
      } satisfies SearchResponse);
    });
};

async function searchCatalog(request: SearchRequest): Promise<SearchResponse> {
  const payload = await loadSearchPayload();
  const { movieIds, total } = searchCatalogEntries(payload.movies, request);

  return { requestId: request.requestId, movieIds, total };
}

function loadSearchPayload() {
  searchPayloadPromise ??= fetch(catalogSearchUrl).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load movie search index (${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!isCatalogSearchPayload(payload)) {
      throw new Error("Movie search index is invalid");
    }

    return payload;
  });

  return searchPayloadPromise;
}

function isCatalogSearchPayload(value: unknown): value is CatalogSearchPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 1 &&
    "movies" in value &&
    Array.isArray(value.movies)
  );
}
