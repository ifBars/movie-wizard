import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Suspense } from "react";
import { CatalogLoadingState } from "@/components/CatalogLoadingState";
import { CatalogView } from "@/components/CatalogView";
import type { CatalogViewData } from "@/hooks/useCatalogViewData";
import type { ThemeMode } from "@/hooks/useThemeMode";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import type { ViewId } from "@/lib/navigation";
import { pageFade } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { LazyMovieDetailsPage, LazySettingsPanel, preloadMovieDetailsPage } from "@/routes/lazyRoutes";
import type { Movie } from "@/types";

type AppMainContentProps = {
  activeView: ViewId;
  catalogData: CatalogViewData;
  isDetailView: boolean;
  isInitialCatalogLoading: boolean;
  isResolvingDetail: boolean;
  library: MovieLibrary;
  onCloseMovie: () => void;
  onOpenMovie: (movieId: string) => void;
  search: string;
  selectedMovie?: Movie;
  themeMode: ThemeMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
};

export function AppMainContent({
  activeView,
  catalogData,
  isDetailView,
  isInitialCatalogLoading,
  isResolvingDetail,
  library,
  onCloseMovie,
  onOpenMovie,
  onThemeModeChange,
  search,
  selectedMovie,
  themeMode,
}: AppMainContentProps) {
  const shouldReduceMotion = useReducedMotion();
  const isSearchMode = search.trim().length > 0;

  return (
    <main
      id="top"
      className={cn("page-grid", activeView === "settings" && !isSearchMode && "page-grid--settings", isDetailView && "page-grid--detail")}
    >
      {isInitialCatalogLoading ? (
        <div className="page-motion-block">
          <CatalogLoadingState />
        </div>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <AppPage
            activeView={activeView}
            catalogData={catalogData}
            isResolvingDetail={isResolvingDetail}
            library={library}
            onCloseMovie={onCloseMovie}
            onOpenMovie={onOpenMovie}
            onThemeModeChange={onThemeModeChange}
            search={search}
            selectedMovie={selectedMovie}
            shouldReduceMotion={shouldReduceMotion}
            themeMode={themeMode}
          />
        </AnimatePresence>
      )}
    </main>
  );
}

type AppPageProps = Omit<AppMainContentProps, "isDetailView" | "isInitialCatalogLoading"> & {
  shouldReduceMotion?: boolean | null;
};

function AppPage({
  activeView,
  catalogData,
  isResolvingDetail,
  library,
  onCloseMovie,
  onOpenMovie,
  onThemeModeChange,
  search,
  selectedMovie,
  shouldReduceMotion,
  themeMode,
}: AppPageProps) {
  if (library.catalogError) {
    return (
      <motion.div key="catalog-error" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
        <CatalogLoadingState title="Catalog unavailable" subtitle="Refresh to try loading your local movie shelf again." />
      </motion.div>
    );
  }

  if (selectedMovie) {
    return (
      <motion.div key={`detail-${selectedMovie.id}`} className="page-motion-block" {...pageFade(shouldReduceMotion)}>
        <Suspense fallback={null}>
          <LazyMovieDetailsPage
            movie={selectedMovie}
            movies={library.visibleMovies}
            state={library.states[selectedMovie.id]}
            states={library.states}
            onBack={onCloseMovie}
            onOpenMovie={onOpenMovie}
            onRate={library.rateMovie}
            onToggleIgnored={library.toggleIgnored}
            onToggleWatched={library.toggleWatched}
            onToggleWatchlist={library.toggleWatchlist}
          />
        </Suspense>
      </motion.div>
    );
  }

  if (isResolvingDetail) {
    return (
      <motion.div key="detail-loading" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
        <CatalogLoadingState title="Loading movie" subtitle="Opening your movie details." />
      </motion.div>
    );
  }

  if (search.trim()) {
    return (
      <motion.div key="catalog-search" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
        <CatalogView
          activeView={activeView}
          search={search}
          discoverSections={catalogData.discoverSections}
          filteredCatalog={catalogData.filteredCatalog}
          library={library}
          onOpenMovie={onOpenMovie}
          onPreloadMovieDetails={preloadMovieDetailsPage}
        />
      </motion.div>
    );
  }

  if (activeView === "settings") {
    return (
      <motion.div key="settings" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
        <Suspense fallback={<CatalogLoadingState title="Loading settings" subtitle="Preparing your local data controls." />}>
          <LazySettingsPanel
            onExport={library.exportLibrary}
            onImport={library.importLibrary}
            onReset={library.resetLibrary}
            ratedCount={library.ratedMovies.length}
            watchlistCount={library.watchlistMovies.length}
            catalogCount={library.visibleMovies.length}
            totalCatalogCount={library.movies.length}
            hiddenAdultMovieCount={library.hiddenAdultMovieCount}
            hiddenLanguageMovieCount={library.hiddenLanguageMovieCount}
            languageCodes={library.settings.languageCodes}
            minimumRecommendationYear={library.settings.minimumRecommendationYear}
            showAdultMovies={library.settings.showAdultMovies}
            themeMode={themeMode}
            onLanguageCodesChange={library.setLanguageCodes}
            onMinimumRecommendationYearChange={library.setMinimumRecommendationYear}
            onShowAdultMoviesChange={library.setShowAdultMovies}
            onThemeModeChange={onThemeModeChange}
          />
        </Suspense>
      </motion.div>
    );
  }

  return (
    <motion.div key="catalog" className="page-motion-block" {...pageFade(shouldReduceMotion)}>
      <CatalogView
        activeView={activeView}
        search={search}
        discoverSections={catalogData.discoverSections}
        filteredCatalog={catalogData.filteredCatalog}
        library={library}
        onOpenMovie={onOpenMovie}
        onPreloadMovieDetails={preloadMovieDetailsPage}
      />
    </motion.div>
  );
}
