import { ListBullets, SquaresFour } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { PointerEvent } from "react";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import type { ViewId } from "@/lib/navigation";
import { fadeSlide, pageFade } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type CatalogViewProps = {
  activeView: ViewId;
  search: string;
  topPicks: Movie[];
  recentReleases: Movie[];
  filteredCatalog: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: () => void;
};

export function CatalogView({
  activeView,
  search,
  topPicks,
  recentReleases,
  filteredCatalog,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: CatalogViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const trimmedSearch = search.trim();

  return (
    <div className="catalog-motion-grid">
      <section className="catalog-main">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={`${activeView}-${trimmedSearch ? "search" : "default"}`} className="catalog-view-panel" {...pageFade(shouldReduceMotion)}>
            {activeView === "discover" ? (
              <DiscoverRows
                search={trimmedSearch}
                filteredCatalog={filteredCatalog}
                topPicks={topPicks}
                recentReleases={recentReleases}
                library={library}
                onOpenMovie={onOpenMovie}
                onPreloadMovieDetails={onPreloadMovieDetails}
              />
            ) : activeView === "rated" || activeView === "history" ? (
              <MovieRow
                title="rated movies"
                subtitle="Your watched history"
                movies={library.ratedMovies}
                library={library}
                onOpenMovie={onOpenMovie}
                onMovieIntent={onPreloadMovieDetails}
              />
            ) : (
              <MovieRow
                title="watchlist"
                subtitle="Candidates for your Plex server"
                movies={library.watchlistMovies}
                library={library}
                onOpenMovie={onOpenMovie}
                onMovieIntent={onPreloadMovieDetails}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function DiscoverRows({
  search,
  filteredCatalog,
  topPicks,
  recentReleases,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: {
  search: string;
  filteredCatalog: Movie[];
  topPicks: Movie[];
  recentReleases: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: () => void;
}) {
  const [searchLayout, setSearchLayout] = useState<"grid" | "row">("grid");

  if (search) {
    const headerAction = <SearchResultsLayoutToggle layout={searchLayout} onLayoutChange={setSearchLayout} />;
    const sharedProps = {
      title: "search results",
      subtitle: `${filteredCatalog.length} matches in the local catalog`,
      movies: filteredCatalog,
      library,
      onOpenMovie,
      onMovieIntent: onPreloadMovieDetails,
      headerAction,
    };

    if (searchLayout === "row") {
      return <MovieRow {...sharedProps} />;
    }

    return (
      <MovieGrid {...sharedProps} />
    );
  }

  return (
    <>
      <MovieRow
        title="top picks"
        subtitle="Recommended for you"
        movies={topPicks}
        library={library}
        onOpenMovie={onOpenMovie}
        onMovieIntent={onPreloadMovieDetails}
      />
      <MovieRow
        title="recent releases"
        subtitle="New and noteworthy"
        movies={recentReleases}
        library={library}
        onOpenMovie={onOpenMovie}
        onMovieIntent={onPreloadMovieDetails}
      />
      <PrivacyNote />
    </>
  );
}

function SearchResultsLayoutToggle({
  layout,
  onLayoutChange,
}: {
  layout: "grid" | "row";
  onLayoutChange: (layout: "grid" | "row") => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, nextLayout: "grid" | "row") {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      onLayoutChange(nextLayout);
    }
  }

  return (
    <div className="view-toggle search-results-view-toggle" role="group" aria-label="Search results layout">
      <motion.button
        type="button"
        className={cn(layout === "grid" && "is-selected")}
        aria-pressed={layout === "grid"}
        onPointerDown={(event) => handlePointerDown(event, "grid")}
        onClick={() => onLayoutChange("grid")}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      >
        <SquaresFour weight="bold" />
        <span>Grid</span>
      </motion.button>
      <motion.button
        type="button"
        className={cn(layout === "row" && "is-selected")}
        aria-pressed={layout === "row"}
        onPointerDown={(event) => handlePointerDown(event, "row")}
        onClick={() => onLayoutChange("row")}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      >
        <ListBullets weight="bold" />
        <span>Row</span>
      </motion.button>
    </div>
  );
}

function PrivacyNote() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.p className="privacy-note" {...fadeSlide(shouldReduceMotion, 6)}>
      Your ratings stay private on this device. Movie data and images from TMDB. <button type="button">Learn more</button>
    </motion.p>
  );
}
