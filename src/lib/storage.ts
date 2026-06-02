import type { MovieStateMap } from "@/types";

const STORAGE_KEY = "movie-wizard:user-library:v1";

type StoredLibrary = {
  version: 1;
  movies: MovieStateMap;
};

export function loadMovieState(): MovieStateMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<StoredLibrary>;
    return parsed.version === 1 && parsed.movies ? parsed.movies : {};
  } catch {
    return {};
  }
}

export function saveMovieState(movies: MovieStateMap) {
  const payload: StoredLibrary = {
    version: 1,
    movies,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function exportMovieState(movies: MovieStateMap) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "movie-wizard",
      version: 1,
      movies,
    },
    null,
    2,
  );
}
