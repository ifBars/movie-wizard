import { useCallback, useEffect, useMemo, useState } from "react";
import moviesUrl from "@/data/generated/movies.json?url";
import { buildTasteProfile, getRecommendations } from "@/lib/recommendations";
import { exportMovieState, loadMovieState, saveMovieState } from "@/lib/storage";
import type { Movie, MovieStateMap, Rating, UserMovieState } from "@/types";

const moviesPromise = fetch(moviesUrl).then((response) => {
  if (!response.ok) {
    throw new Error(`Failed to load movie catalog (${response.status})`);
  }

  return response.json() as Promise<Movie[]>;
});

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

export function useMovieLibrary() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [states, setStates] = useState<MovieStateMap>(() => loadMovieState());

  useEffect(() => {
    let isMounted = true;

    moviesPromise
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

    return () => {
      isMounted = false;
    };
  }, []);

  const profile = useMemo(() => buildTasteProfile(movies, states), [movies, states]);
  const recommendations = useMemo(() => getRecommendations(movies, states), [movies, states]);

  const ratedMovies = useMemo(
    () =>
      movies
        .filter((movie) => states[movie.id]?.rating)
        .slice()
        .sort((a, b) => (states[b.id]?.rating ?? 0) - (states[a.id]?.rating ?? 0)),
    [movies, states],
  );

  const watchlistMovies = useMemo(
    () => movies.filter((movie) => states[movie.id]?.watchlist && !states[movie.id]?.watched),
    [movies, states],
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
      updateMovieState(current, movieId, (state) => ({
        ...state,
        watched: !state.watched,
        updatedAt: new Date().toISOString(),
      })),
    );
  }, []);

  const toggleWatchlist = useCallback((movieId: string) => {
    setStates((current) =>
      updateMovieState(current, movieId, (state) => ({
        ...state,
        watchlist: !state.watchlist,
        updatedAt: new Date().toISOString(),
      })),
    );
  }, []);

  const ignoreMovie = useCallback((movieId: string) => {
    setStates((current) =>
      updateMovieState(current, movieId, (state) => ({
        ...state,
        ignored: true,
        watchlist: false,
        updatedAt: new Date().toISOString(),
      })),
    );
  }, []);

  const resetLibrary = useCallback(() => {
    saveMovieState({});
    setStates({});
  }, []);

  return {
    movies,
    isCatalogLoading,
    catalogError,
    states,
    profile,
    recommendations,
    ratedMovies,
    watchlistMovies,
    rateMovie,
    toggleWatched,
    toggleWatchlist,
    ignoreMovie,
    resetLibrary,
    exportLibrary: () => exportMovieState(states),
  };
}

export type MovieLibrary = ReturnType<typeof useMovieLibrary>;
