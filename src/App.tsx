import { useCallback, useDeferredValue, useMemo } from "react";
import { Navigate, useSearchParams } from "react-router";
import { AppHeader } from "@/components/AppHeader";
import { AppMainContent } from "@/components/AppMainContent";
import { useAppRouteState } from "@/hooks/useAppRouteState";
import { useCatalogViewData } from "@/hooks/useCatalogViewData";
import { useMovieNavigation } from "@/hooks/useMovieNavigation";
import { useMovieLibrary } from "@/hooks/useMovieLibrary";
import { usePageScrollRestoration } from "@/hooks/usePageScrollRestoration";
import { useRoutePreloading } from "@/hooks/useRoutePreloading";
import { useThemeMode } from "@/hooks/useThemeMode";
import { viewPath } from "@/lib/navigation";

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const deferredSearch = useDeferredValue(search);
  const { activeView, isKnownRoute, locationKey, selectedMovieId } = useAppRouteState();
  const { closeMovie, openMovie } = useMovieNavigation();
  const { themeMode, setThemeMode, toggleTheme } = useThemeMode();
  const library = useMovieLibrary(selectedMovieId ?? undefined);
  const { includeMovie } = library;
  const catalogData = useCatalogViewData(library, deferredSearch);
  const selectedMovie = useMemo(
    () =>
      library.visibleMovies.find((movie) => movie.id === selectedMovieId) ??
      catalogData.filteredCatalog.find((movie) => movie.id === selectedMovieId),
    [catalogData.filteredCatalog, library.visibleMovies, selectedMovieId],
  );

  const handleSearchChange = useCallback(
    (nextSearch: string) => {
      const normalizedSearch = nextSearch.trim();
      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);

          if (normalizedSearch) {
            nextParams.set("q", nextSearch);
            nextParams.delete("category");
          } else {
            nextParams.delete("q");
          }

          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleOpenMovie = useCallback(
    (movieId: string) => {
      const searchMovie = catalogData.filteredCatalog.find((movie) => movie.id === movieId);
      if (searchMovie) {
        includeMovie(searchMovie);
      }
      openMovie(movieId);
    },
    [catalogData.filteredCatalog, includeMovie, openMovie],
  );

  const averageRatingLabel = library.profile.averageRating > 0 ? library.profile.averageRating.toFixed(1) : "0.0";
  const isResolvingDetail = Boolean(selectedMovieId && !selectedMovie && library.isCatalogLoading);
  const isDetailView = Boolean(selectedMovie) || isResolvingDetail;
  const isInitialCatalogLoading = library.visibleMovies.length === 0 && activeView !== "settings" && !selectedMovie && !isResolvingDetail;

  usePageScrollRestoration(locationKey);
  useRoutePreloading({
    activeView,
    catalogError: library.catalogError,
    isCatalogLoading: library.isCatalogLoading,
  });

  if (!isKnownRoute) {
    return <Navigate to={viewPath(activeView)} replace />;
  }

  if (selectedMovieId && !selectedMovie && !library.isCatalogLoading) {
    return <Navigate to={viewPath("discover")} replace />;
  }

  return (
    <div className="app-shell">
      <AppHeader
        activeView={activeView}
        isDetailView={isDetailView}
        search={search}
        ratingLabel={averageRatingLabel}
        themeMode={themeMode}
        profile={library.profile}
        historyCount={library.historyMovies.length}
        watchlistCount={library.watchlistMovies.length}
        catalogCount={library.catalogMovieCount}
        onSearchChange={handleSearchChange}
        onToggleTheme={toggleTheme}
      />

      <AppMainContent
        activeView={activeView}
        catalogData={catalogData}
        isDetailView={isDetailView}
        isInitialCatalogLoading={isInitialCatalogLoading}
        isResolvingDetail={isResolvingDetail}
        library={library}
        onCloseMovie={closeMovie}
        onOpenMovie={handleOpenMovie}
        search={deferredSearch}
        selectedMovie={selectedMovie}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />
    </div>
  );
}

export default App;
