import { useCallback, useEffect, useMemo, useState } from "react";
import moviesJson from "@/data/generated/movies.json";
import { filterCatalogMovies, getCatalogFilterCounts } from "@/lib/catalogFilters";
import { parseMovieCatalog } from "@/lib/movieCatalog";
import { buildTasteProfile, getRecommendations } from "@/lib/recommendations";
import type { LibrarySettings, MovieStateMap, Rating, UserMovieState } from "@/types";
import {
  exportMobileLibrary,
  loadMobileMovieState,
  loadMobileSettings,
  parseMobileLibraryImport,
  saveMobileMovieState,
  saveMobileSettings,
} from "~/mobile-storage";

const catalogMovies = parseMovieCatalog(moviesJson);
const fallbackSettings: LibrarySettings = {
  languageCodes: ["en"],
  showAdultMovies: false,
  minimumRecommendationYear: null,
};

function createDefaultState(movieId: string): UserMovieState {
  return {
    movieId,
    watched: false,
    watchlist: false,
    ignored: false,
    rating: null,
    updatedAt: new Date().toISOString(),
  };
}

function updateMovieState(
  states: MovieStateMap,
  movieId: string,
  update: (state: UserMovieState) => UserMovieState,
) {
  return {
    ...states,
    [movieId]: update(states[movieId] ?? createDefaultState(movieId)),
  };
}

export function useMobileLibrary() {
  const [states, setStates] = useState<MovieStateMap>({});
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([loadMobileMovieState(), loadMobileSettings()])
      .then(([loadedStates, loadedSettings]) => {
        if (!isMounted) {
          return;
        }

        setStates(loadedStates);
        setSettings(loadedSettings);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeSettings = settings ?? fallbackSettings;

  const visibleMovies = useMemo(() => filterCatalogMovies(catalogMovies, activeSettings), [activeSettings]);
  const filterCounts = useMemo(() => getCatalogFilterCounts(catalogMovies, activeSettings), [activeSettings]);
  const profile = useMemo(() => buildTasteProfile(visibleMovies, states), [states, visibleMovies]);
  const recommendations = useMemo(
    () => getRecommendations(visibleMovies, states, { minimumMovieYear: activeSettings.minimumRecommendationYear }),
    [activeSettings.minimumRecommendationYear, states, visibleMovies],
  );
  const historyMovies = useMemo(
    () =>
      visibleMovies
        .filter((movie) => {
          const state = states[movie.id];
          return Boolean(state?.watched || state?.rating);
        })
        .slice()
        .sort((a, b) => Date.parse(states[b.id]?.updatedAt ?? "") - Date.parse(states[a.id]?.updatedAt ?? "")),
    [states, visibleMovies],
  );
  const watchlistMovies = useMemo(
    () => visibleMovies.filter((movie) => states[movie.id]?.watchlist && !states[movie.id]?.watched),
    [states, visibleMovies],
  );

  const persistStates = useCallback((nextStates: MovieStateMap) => {
    setStates(nextStates);
    void saveMobileMovieState(nextStates);
  }, []);

  const rateMovie = useCallback(
    (movieId: string, rating: Rating) => {
      persistStates(
        updateMovieState(states, movieId, (state) => ({
          ...state,
          rating,
          watched: true,
          ignored: false,
          updatedAt: new Date().toISOString(),
        })),
      );
    },
    [persistStates, states],
  );

  const toggleWatched = useCallback(
    (movieId: string) => {
      persistStates(
        updateMovieState(states, movieId, (state) => ({
          ...state,
          watched: !state.watched,
          ignored: !state.watched ? false : state.ignored,
          updatedAt: new Date().toISOString(),
        })),
      );
    },
    [persistStates, states],
  );

  const toggleWatchlist = useCallback(
    (movieId: string) => {
      persistStates(
        updateMovieState(states, movieId, (state) => ({
          ...state,
          watchlist: !state.watchlist,
          ignored: !state.watchlist ? false : state.ignored,
          updatedAt: new Date().toISOString(),
        })),
      );
    },
    [persistStates, states],
  );

  const toggleIgnored = useCallback(
    (movieId: string) => {
      persistStates(
        updateMovieState(states, movieId, (state) => ({
          ...state,
          ignored: !state.ignored,
          watchlist: !state.ignored ? false : state.watchlist,
          updatedAt: new Date().toISOString(),
        })),
      );
    },
    [persistStates, states],
  );

  const updateSettings = useCallback((nextSettings: LibrarySettings) => {
    setSettings(nextSettings);
    void saveMobileSettings(nextSettings);
  }, []);

  const resetLibrary = useCallback(() => {
    persistStates({});
  }, [persistStates]);

  const importLibrary = useCallback((rawJson: string) => {
    const importedLibrary = parseMobileLibraryImport(rawJson);

    if (!importedLibrary) {
      return false;
    }

    setStates(importedLibrary.movies);
    setSettings(importedLibrary.settings);
    void saveMobileMovieState(importedLibrary.movies);
    void saveMobileSettings(importedLibrary.settings);

    return true;
  }, []);

  return {
    movies: catalogMovies,
    visibleMovies,
    states,
    settings: activeSettings,
    isLoading,
    hiddenAdultMovieCount: filterCounts.hiddenAdultMovieCount,
    hiddenLanguageMovieCount: filterCounts.hiddenLanguageMovieCount,
    profile,
    recommendations,
    historyMovies,
    watchlistMovies,
    rateMovie,
    toggleWatched,
    toggleWatchlist,
    toggleIgnored,
    updateSettings,
    resetLibrary,
    importLibrary,
    exportLibrary: () => exportMobileLibrary(states, activeSettings),
  };
}

export type MobileLibrary = ReturnType<typeof useMobileLibrary>;
