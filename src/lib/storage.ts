import { isRating } from "@/lib/ratings";
import { defaultLanguageCodes, normalizeLanguageCodes } from "@/lib/languagePreferences";
import type { LibrarySettings, MovieStateMap, UserMovieState } from "@/types";

const STORAGE_KEY = "movie-wizard:user-library:v1";
const SETTINGS_STORAGE_KEY = "movie-wizard:settings:v1";

export const defaultLibrarySettings: LibrarySettings = {
  languageCodes: defaultLanguageCodes,
  showAdultMovies: false,
};

type StoredLibrary = {
  version: 1;
  movies: MovieStateMap;
};

type StoredSettings = {
  version: 1;
  settings: LibrarySettings;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserMovieState(value: unknown): value is UserMovieState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.movieId === "string" &&
    typeof value.watched === "boolean" &&
    typeof value.watchlist === "boolean" &&
    typeof value.ignored === "boolean" &&
    (value.rating === null || isRating(value.rating)) &&
    typeof value.updatedAt === "string"
  );
}

function parseMovieStateMap(value: unknown): MovieStateMap {
  if (!isRecord(value)) {
    return {};
  }

  const states: MovieStateMap = {};

  for (const [movieId, state] of Object.entries(value)) {
    if (isUserMovieState(state) && state.movieId === movieId) {
      states[movieId] = state;
    }
  }

  return states;
}

function parseStoredLibrary(value: unknown): MovieStateMap {
  if (!isRecord(value) || value.version !== 1) {
    return {};
  }

  return parseMovieStateMap(value.movies);
}

function parseStoredSettings(value: unknown): LibrarySettings {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.settings)) {
    return defaultLibrarySettings;
  }

  return {
    languageCodes: Array.isArray(value.settings.languageCodes)
      ? normalizeLanguageCodes(value.settings.languageCodes.filter((code) => typeof code === "string"))
      : defaultLibrarySettings.languageCodes,
    showAdultMovies:
      typeof value.settings.showAdultMovies === "boolean" ? value.settings.showAdultMovies : defaultLibrarySettings.showAdultMovies,
  };
}

export function loadMovieState(): MovieStateMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return parseStoredLibrary(JSON.parse(raw));
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

export function loadLibrarySettings(): LibrarySettings {
  if (typeof window === "undefined") {
    return defaultLibrarySettings;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaultLibrarySettings;
    }

    return parseStoredSettings(JSON.parse(raw));
  } catch {
    return defaultLibrarySettings;
  }
}

export function saveLibrarySettings(settings: LibrarySettings) {
  const payload: StoredSettings = {
    version: 1,
    settings,
  };

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
}

export function exportMovieState(movies: MovieStateMap, settings: LibrarySettings) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "movie-wizard",
      version: 1,
      settings,
      movies,
    },
    null,
    2,
  );
}
