import type { CatalogBrowseFilters } from "@/lib/catalogBrowse";

type SearchCatalogOptions = CatalogBrowseFilters & {
  query: string;
  languageCodes: string[];
  showAdultMovies: boolean;
  excludedMovieIds: string[];
  limit: number;
};

type SearchResult = {
  movieIds: string[];
  total: number;
};

type WorkerResponse = SearchResult & {
  requestId: number;
  error?: string;
};

let nextRequestId = 1;
let searchWorker: Worker | undefined;
const pendingRequests = new Map<number, { resolve: (result: SearchResult) => void; reject: (error: Error) => void }>();

export function searchCatalog(options: SearchCatalogOptions) {
  const worker = getSearchWorker();
  const requestId = nextRequestId;
  nextRequestId += 1;

  return new Promise<SearchResult>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
    worker.postMessage({ requestId, ...options });
  });
}

function getSearchWorker() {
  if (searchWorker) {
    return searchWorker;
  }

  searchWorker = new Worker(new URL("../workers/catalogSearch.worker.ts", import.meta.url), { type: "module" });
  searchWorker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
    const request = pendingRequests.get(event.data.requestId);
    if (!request) {
      return;
    }

    pendingRequests.delete(event.data.requestId);
    if (event.data.error) {
      request.reject(new Error(event.data.error));
      return;
    }

    request.resolve({ movieIds: event.data.movieIds, total: event.data.total });
  });
  searchWorker.addEventListener("error", () => {
    const error = new Error("Movie search worker failed");
    for (const request of pendingRequests.values()) {
      request.reject(error);
    }
    pendingRequests.clear();
  });

  return searchWorker;
}
