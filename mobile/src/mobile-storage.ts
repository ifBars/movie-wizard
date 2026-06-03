import Storage from "expo-sqlite/kv-store";
import { defaultLibrarySettings, exportMovieState, importMovieState } from "@/lib/storage";
import type { ImportedLibrary } from "@/lib/storage";
import type { LibrarySettings, MovieStateMap } from "@/types";

const movieStateKey = "movie-wizard:user-library:v1";
const settingsKey = "movie-wizard:settings:v1";

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

export async function loadMobileMovieState() {
  try {
    const raw = await Storage.getItem(movieStateKey);
    if (!raw) {
      return {};
    }

    const imported = importMovieState(
      JSON.stringify({
        app: "movie-wizard",
        version: 1,
        movies: JSON.parse(raw).movies,
        settings: defaultLibrarySettings,
      }),
    );

    return imported?.movies ?? {};
  } catch {
    return {};
  }
}

export async function saveMobileMovieState(movies: MovieStateMap) {
  const payload: StoredLibrary = { version: 1, movies };
  await Storage.setItem(movieStateKey, JSON.stringify(payload));
}

export async function loadMobileSettings() {
  try {
    const raw = await Storage.getItem(settingsKey);
    if (!raw) {
      return defaultLibrarySettings;
    }

    const parsed: unknown = JSON.parse(raw);
    const storedSettings = isRecord(parsed) ? parsed.settings : undefined;
    const imported = importMovieState(
      JSON.stringify({
        app: "movie-wizard",
        version: 1,
        movies: {},
        settings: storedSettings,
      }),
    );

    return imported?.settings ?? defaultLibrarySettings;
  } catch {
    return defaultLibrarySettings;
  }
}

export async function saveMobileSettings(settings: LibrarySettings) {
  const payload: StoredSettings = { version: 1, settings };
  await Storage.setItem(settingsKey, JSON.stringify(payload));
}

export function exportMobileLibrary(movies: MovieStateMap, settings: LibrarySettings) {
  return exportMovieState(movies, settings);
}

export function parseMobileLibraryImport(rawJson: string): ImportedLibrary | null {
  return importMovieState(rawJson);
}
