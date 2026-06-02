import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { matchPath, Navigate, useLocation, useNavigate } from "react-router";
import { AppHeader } from "@/components/AppHeader";
import { CatalogLoadingState } from "@/components/CatalogLoadingState";
import { CatalogView } from "@/components/CatalogView";
import { useCatalogViewData } from "@/hooks/useCatalogViewData";
import { useMovieLibrary } from "@/hooks/useMovieLibrary";
import { useThemeMode } from "@/hooks/useThemeMode";
import { movieDetailPath, type ViewId, viewFromPath, viewPath } from "@/lib/navigation";
import { pageFade } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { LazyMovieDetailsPage, LazySettingsPanel, preloadMovieDetailsPage, preloadSettingsPanel } from "@/routes/lazyRoutes";

function getRouteState(pathname: string) {
  const movieMatch = matchPath("/movie/:movieId", pathname);

  if (movieMatch?.params.movieId) {
    return {
      activeView: "discover" as ViewId,
      isKnownRoute: true,
      selectedMovieId: movieMatch.params.movieId,
    };
  }

  const activeView = viewFromPath(pathname);

  return {
    activeView,
    isKnownRoute: pathname === viewPath(activeView),
    selectedMovieId: null,
  };
}

function App() {
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { activeView, isKnownRoute, selectedMovieId } = useMemo(() => getRouteState(location.pathname), [location.pathname]);
  const { themeMode, toggleTheme } = useThemeMode();
  const shouldReduceMotion = useReducedMotion();
  const library = useMovieLibrary();
  const selectedMovie = useMemo(
    () => library.movies.find((movie) => movie.id === selectedMovieId),
    [library.movies, selectedMovieId],
  );

  const { topPicks, recentReleases, filteredCatalog } = useCatalogViewData(library, search);

  const averageRatingLabel = library.profile.averageRating > 0 ? library.profile.averageRating.toFixed(1) : "0.0";
  const isResolvingDetail = Boolean(selectedMovieId && library.isCatalogLoading);
  const isDetailView = Boolean(selectedMovie) || isResolvingDetail;
  const isInitialCatalogLoading = library.isCatalogLoading && activeView !== "settings" && !selectedMovie && !isResolvingDetail;

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  useEffect(() => {
    if (activeView === "settings") {
      preloadSettingsPanel();
    }
  }, [activeView]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    if (!library.isCatalogLoading && !library.catalogError) {
      preloadMovieDetailsPage();
    }
  }, [library.catalogError, library.isCatalogLoading]);

  function openMovie(movieId: string) {
    preloadMovieDetailsPage();
    navigate(movieDetailPath(movieId));
    window.scrollTo({ top: 0 });
  }

  function closeMovie() {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate(viewPath("discover"), { replace: true });
  }

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

      <main
          id="top"
          className={cn(
            "page-grid",
            activeView === "settings" && "page-grid--settings",
            isDetailView && "page-grid--detail",
          )}
        >
          {isInitialCatalogLoading ? (
            <div className="page-motion-block">
              <CatalogLoadingState />
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {library.catalogError ? (
                <motion.div key="catalog-error" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
                  <CatalogLoadingState title="Catalog unavailable" subtitle="Refresh to try loading your local movie shelf again." />
                </motion.div>
              ) : selectedMovie ? (
                <motion.div key={`detail-${selectedMovie.id}`} className="page-motion-block" {...pageFade(shouldReduceMotion)}>
                  <Suspense fallback={null}>
                    <LazyMovieDetailsPage
                      movie={selectedMovie}
                      movies={library.movies}
                      state={library.states[selectedMovie.id]}
                      states={library.states}
                      onBack={closeMovie}
                      onOpenMovie={openMovie}
                      onRate={library.rateMovie}
                      onToggleWatched={library.toggleWatched}
                      onToggleWatchlist={library.toggleWatchlist}
                    />
                  </Suspense>
                </motion.div>
              ) : isResolvingDetail ? (
                <motion.div key="detail-loading" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
                  <CatalogLoadingState title="Loading movie" subtitle="Opening your movie details." />
                </motion.div>
              ) : activeView === "settings" ? (
                <motion.div key="settings" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
                  <Suspense fallback={<CatalogLoadingState title="Loading settings" subtitle="Preparing your local data controls." />}>
                    <LazySettingsPanel
                      onExport={library.exportLibrary}
                      onReset={library.resetLibrary}
                      ratedCount={library.ratedMovies.length}
                      watchlistCount={library.watchlistMovies.length}
                      catalogCount={library.movies.length}
                    />
                  </Suspense>
                </motion.div>
              ) : (
                <motion.div key="catalog" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
                  <CatalogView
                    activeView={activeView}
                    search={search}
                    topPicks={topPicks}
                    recentReleases={recentReleases}
                    filteredCatalog={filteredCatalog}
                    library={library}
                    onOpenMovie={openMovie}
                    onPreloadMovieDetails={preloadMovieDetailsPage}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
      </main>
    </div>
  );
}

export default App;
