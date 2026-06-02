import { useMemo, useState } from "react";
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
  const { activeView, isKnownRoute, pathname, selectedMovieId } = useAppRouteState();
  const { closeMovie, openMovie } = useMovieNavigation();
  const { themeMode, toggleTheme } = useThemeMode();
  const library = useMovieLibrary();
  const selectedMovie = useMemo(
    () => library.movies.find((movie) => movie.id === selectedMovieId),
    [library.movies, selectedMovieId],
  );

  const catalogData = useCatalogViewData(library, search);

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
        ratedCount={library.ratedMovies.length}
        watchlistCount={library.watchlistMovies.length}
        catalogCount={library.movies.length}
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
        search={search}
        selectedMovie={selectedMovie}
      />
    </div>
  );
}

export default App;
