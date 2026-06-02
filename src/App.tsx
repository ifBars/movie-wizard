import { useDeferredValue, useMemo, useState } from "react";
import { Navigate } from "react-router";
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
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { activeView, isKnownRoute, pathname, selectedMovieId } = useAppRouteState();
  const { closeMovie, openMovie } = useMovieNavigation();
  const { themeMode, setThemeMode, toggleTheme } = useThemeMode();
  const library = useMovieLibrary();
  const selectedMovie = useMemo(
    () => library.visibleMovies.find((movie) => movie.id === selectedMovieId),
    [library.visibleMovies, selectedMovieId],
  );

  const catalogData = useCatalogViewData(library, deferredSearch);

  const averageRatingLabel = library.profile.averageRating > 0 ? library.profile.averageRating.toFixed(1) : "0.0";
  const isResolvingDetail = Boolean(selectedMovieId && library.isCatalogLoading);
  const isDetailView = Boolean(selectedMovie) || isResolvingDetail;
  const isInitialCatalogLoading = library.isCatalogLoading && activeView !== "settings" && !selectedMovie && !isResolvingDetail;

  usePageScrollRestoration(pathname);
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
        catalogCount={library.visibleMovies.length}
        onSearchChange={setSearch}
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
        onOpenMovie={openMovie}
        search={deferredSearch}
        selectedMovie={selectedMovie}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />
    </div>
  );
}

export default App;
