import { useCallback, useMemo, useState } from "react";
import { useExternalSyncEffect, useMountEffect } from "@/hooks/useExternalSyncEffect";
import { filterCatalogMovies } from "@/lib/catalogFilters";
import { getCatalogSummary, loadInitialMovieCatalog, loadMoviesByIds } from "@/lib/catalogRepository";
import {
  getCollaborativeMovieIds,
  loadCollaborativeModel,
} from "@/lib/collaborativeRecommendations";
import type { CollaborativeModel } from "@/lib/collaborativeRecommendations";
import { buildTasteSnapshot } from "@/lib/recommendations";
import {
  exportMovieState,
  importMovieState,
  loadLibrarySettings,
  loadMovieState,
  saveLibrarySettings,
  saveMovieState,
} from "@/lib/storage";
import type { LibrarySettings } from "@/types";
import type { Movie, MovieStateMap, Rating, UserMovieState } from "@/types";

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
  const next = {
    ...states,
    [movieId]: update(states[movieId] ?? createDefaultState(movieId)),
  };

  saveMovieState(next);
  return next;
}

export function useMovieLibrary(initialMovieId?: string) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [states, setStates] = useState<MovieStateMap>(() => loadMovieState());
  const [settings, setSettings] = useState<LibrarySettings>(() => loadLibrarySettings());
  const [collaborativeModel, setCollaborativeModel] = useState<CollaborativeModel>();

  useMountEffect(() => {
    let isMounted = true;
    const initialMovieIds = initialMovieId ? [...Object.keys(states), initialMovieId] : Object.keys(states);

    loadInitialMovieCatalog(initialMovieIds)
      .then((loadedMovies) => {
        if (isMounted) {
          setMovies(loadedMovies);
          setIsCatalogLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setCatalogError(error instanceof Error ? error.message : "Failed to load movie catalog");
          setIsCatalogLoading(false);
        }
      });

    loadCollaborativeModel()
      .then((model) => {
        if (isMounted) {
          setCollaborativeModel(model);
        }
      })
      .catch(() => {
        // The content-based model remains a complete offline fallback.
      });

    return () => {
      isMounted = false;
    };
  });

  useExternalSyncEffect(() => {
    if (!collaborativeModel) {
      return;
    }

    let isCurrent = true;
    const neighborMovieIds = getCollaborativeMovieIds(collaborativeModel, states);
    if (neighborMovieIds.length === 0) {
      return;
    }

    loadMoviesByIds(neighborMovieIds)
      .then((neighborMovies) => {
        if (isCurrent) {
          setMovies((currentMovies) => mergeNewMovies(currentMovies, neighborMovies));
        }
      })
      .catch(() => {
        // Recommendation neighbors are opportunistic; the bootstrap catalog remains usable.
      });

    return () => {
      isCurrent = false;
    };
  }, [collaborativeModel, states]);

  const visibleMovies = useMemo(() => filterCatalogMovies(movies, settings), [movies, settings]);
  const catalogSummary = useMemo(() => getCatalogSummary(settings), [settings]);

  const tasteSnapshot = useMemo(
    () =>
      buildTasteSnapshot(visibleMovies, states, {
        minimumMovieYear: settings.minimumRecommendationYear,
      }, collaborativeModel),
    [collaborativeModel, settings.minimumRecommendationYear, states, visibleMovies],
  );
  const { profile, recommendations, selectRecommendations } = tasteSnapshot;

  const ratedMovies = useMemo(
    () =>
      visibleMovies
        .filter((movie) => states[movie.id]?.rating)
        .slice()
        .sort((a, b) => (states[b.id]?.rating ?? 0) - (states[a.id]?.rating ?? 0)),
    [states, visibleMovies],
  );

  const historyMovies = useMemo(
    () =>
      visibleMovies
        .filter((movie) => {
          const state = states[movie.id];

          return Boolean(state?.watched || state?.rating);
        })
        .slice()
        .sort((a, b) => {
          const aUpdatedAt = Date.parse(states[a.id]?.updatedAt ?? "");
          const bUpdatedAt = Date.parse(states[b.id]?.updatedAt ?? "");

          return (Number.isNaN(bUpdatedAt) ? 0 : bUpdatedAt) - (Number.isNaN(aUpdatedAt) ? 0 : aUpdatedAt);
        }),
    [states, visibleMovies],
  );

  const watchlistMovies = useMemo(
    () => visibleMovies.filter((movie) => states[movie.id]?.watchlist && !states[movie.id]?.watched),
    [states, visibleMovies],
  );

  const rateMovie = useCallback((movieId: string, rating: Rating) => {
    setStates((current) =>
      updateMovieState(current, movieId, (state) => ({
        ...state,
        rating,
        watched: true,
        ignored: false,
        updatedAt: new Date().toISOString(),
      })),
    );
  }, []);

  const toggleWatched = useCallback((movieId: string) => {
    setStates((current) =>
      updateMovieState(current, movieId, (state) => {
        const watched = !state.watched;

        return {
          ...state,
          watched,
          ignored: watched ? false : state.ignored,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const toggleWatchlist = useCallback((movieId: string) => {
    setStates((current) =>
      updateMovieState(current, movieId, (state) => {
        const watchlist = !state.watchlist;

        return {
          ...state,
          watchlist,
          ignored: watchlist ? false : state.ignored,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const toggleIgnored = useCallback((movieId: string) => {
    setStates((current) =>
      updateMovieState(current, movieId, (state) => {
        const ignored = !state.ignored;

        return {
          ...state,
          ignored,
          watchlist: ignored ? false : state.watchlist,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const resetLibrary = useCallback(() => {
    saveMovieState({});
    setStates({});
  }, []);

  const updateSettings = useCallback((nextSettings: LibrarySettings) => {
    saveLibrarySettings(nextSettings);
    setSettings(nextSettings);
  }, []);

  const setShowAdultMovies = useCallback(
    (showAdultMovies: boolean) => {
      updateSettings({
        ...settings,
        showAdultMovies,
      });
    },
    [settings, updateSettings],
  );

  const setLanguageCodes = useCallback(
    (languageCodes: string[]) => {
      updateSettings({
        ...settings,
        languageCodes,
      });
    },
    [settings, updateSettings],
  );

  const setMinimumRecommendationYear = useCallback(
    (minimumRecommendationYear: number | null) => {
      updateSettings({
        ...settings,
        minimumRecommendationYear,
      });
    },
    [settings, updateSettings],
  );

  const includeMovie = useCallback((movie: Movie) => {
    setMovies((currentMovies) => (currentMovies.some((currentMovie) => currentMovie.id === movie.id) ? currentMovies : [...currentMovies, movie]));
  }, []);

  const exportLibrary = useCallback(() => exportMovieState(states, settings), [settings, states]);

  const importLibrary = useCallback((rawJson: string) => {
    const importedLibrary = importMovieState(rawJson);

    if (!importedLibrary) {
      return false;
    }

    saveMovieState(importedLibrary.movies);
    saveLibrarySettings(importedLibrary.settings);
    setStates(importedLibrary.movies);
    setSettings(importedLibrary.settings);

    return true;
  }, []);

  return useMemo(
    () => ({
      movies,
      visibleMovies,
      isCatalogLoading,
      catalogError,
      states,
      settings,
      catalogMovieCount: catalogSummary.visibleMovieCount,
      totalCatalogMovieCount: catalogSummary.totalMovieCount,
      hiddenAdultMovieCount: catalogSummary.hiddenAdultMovieCount,
      hiddenLanguageMovieCount: catalogSummary.hiddenLanguageMovieCount,
      profile,
      recommendations,
      selectRecommendations,
      historyMovies,
      ratedMovies,
      watchlistMovies,
      rateMovie,
      toggleWatched,
      toggleWatchlist,
      toggleIgnored,
      resetLibrary,
      setLanguageCodes,
      setMinimumRecommendationYear,
      setShowAdultMovies,
      exportLibrary,
      importLibrary,
      includeMovie,
    }),
    [
      catalogError,
      exportLibrary,
      importLibrary,
      includeMovie,
      catalogSummary.hiddenAdultMovieCount,
      catalogSummary.hiddenLanguageMovieCount,
      catalogSummary.totalMovieCount,
      catalogSummary.visibleMovieCount,
      isCatalogLoading,
      movies,
      profile,
      historyMovies,
      rateMovie,
      ratedMovies,
      recommendations,
      selectRecommendations,
      resetLibrary,
      setLanguageCodes,
      setMinimumRecommendationYear,
      setShowAdultMovies,
      settings,
      states,
      toggleWatched,
      toggleIgnored,
      toggleWatchlist,
      visibleMovies,
      watchlistMovies,
    ],
  );
}

export type MovieLibrary = ReturnType<typeof useMovieLibrary>;

function mergeNewMovies(currentMovies: Movie[], additionalMovies: Movie[]) {
  const knownMovieIds = new Set(currentMovies.map((movie) => movie.id));
  const newMovies = additionalMovies.filter((movie) => !knownMovieIds.has(movie.id));

  return newMovies.length > 0 ? [...currentMovies, ...newMovies] : currentMovies;
}
