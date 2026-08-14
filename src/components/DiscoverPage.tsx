import { ArrowLeft, ArrowRight, ListBullets, SquaresFour } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";
import type { PointerEvent } from "react";
import { useSearchParams } from "react-router";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import { useExternalSyncEffect } from "@/hooks/useExternalSyncEffect";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { findDiscoverSection } from "@/lib/discoverSections";
import type { DiscoverSection } from "@/lib/discoverSections";
import { fadeSlide } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

const initialCategoryResultLimit = 48;
const categoryResultPageSize = 48;
const searchResultPageSize = 24;
const topPicksRowChunkSize = 14;

type DiscoverPageProps = {
  search: string;
  filteredCatalog: Movie[];
  discoverSections: DiscoverSection[];
  isSearchLoading: boolean;
  library: MovieLibrary;
  onLoadMoreSearch: () => void;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
  searchResultTotal: number;
};

export function DiscoverPage({
  search,
  filteredCatalog,
  discoverSections,
  isSearchLoading,
  library,
  onLoadMoreSearch,
  onOpenMovie,
  onPreloadMovieDetails,
  searchResultTotal,
}: DiscoverPageProps) {
  const [searchLayout, setSearchLayout] = useState<"grid" | "row">("grid");
  const [topPicksRowLimit, setTopPicksRowLimit] = useState(topPicksRowChunkSize);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSection = findDiscoverSection(discoverSections, searchParams.get("category"));

  function openSection(section: DiscoverSection) {
    setSearchParams({ category: section.key });
  }

  function closeSection() {
    setSearchParams({});
  }

  if (search) {
    return (
      <SearchResults
        key={search}
        filteredCatalog={filteredCatalog}
        isLoading={isSearchLoading}
        layout={searchLayout}
        library={library}
        onLoadMore={onLoadMoreSearch}
        onLayoutChange={setSearchLayout}
        onOpenMovie={onOpenMovie}
        onPreloadMovieDetails={onPreloadMovieDetails}
        totalResults={searchResultTotal}
      />
    );
  }

  if (selectedSection) {
    return (
      <DiscoverCategoryGrid
        key={selectedSection.key}
        section={selectedSection}
        library={library}
        onBack={closeSection}
        onOpenMovie={onOpenMovie}
        onPreloadMovieDetails={onPreloadMovieDetails}
      />
    );
  }

  return (
    <>
      {discoverSections.map((section) => {
        const isTopPicks = section.key === "top-picks";
        const rowLimit = isTopPicks ? topPicksRowLimit : section.rowLimit;
        const visibleMovies = section.movies.slice(0, rowLimit);
        const canLoadMore = isTopPicks && visibleMovies.length < section.movies.length;

        return (
          <MovieRow
            key={section.key}
            title={section.title}
            subtitle={section.subtitle}
            movies={visibleMovies}
            library={library}
            onOpenMovie={onOpenMovie}
            onMovieIntent={onPreloadMovieDetails}
            onReachEnd={
              canLoadMore
                ? () => setTopPicksRowLimit((currentLimit) => Math.min(currentLimit + topPicksRowChunkSize, section.movies.length))
                : undefined
            }
            headerAction={<ViewAllButton section={section} onClick={openSection} />}
          />
        );
      })}
      <PrivacyNote />
    </>
  );
}

function DiscoverCategoryGrid({
  section,
  library,
  onBack,
  onOpenMovie,
  onPreloadMovieDetails,
}: {
  section: DiscoverSection;
  library: MovieLibrary;
  onBack: () => void;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
}) {
  const [resultLimit, setResultLimit] = useState(initialCategoryResultLimit);
  const shouldReduceMotion = useReducedMotion();
  const visibleMovies = section.movies.slice(0, resultLimit);
  const hiddenCount = Math.max(0, section.movies.length - visibleMovies.length);
  const autoLoadMore = section.key === "top-picks";
  const loadMore = useCallback(() => {
    setResultLimit((currentLimit) => Math.min(currentLimit + categoryResultPageSize, section.movies.length));
  }, [section.movies.length]);
  const subtitle =
    hiddenCount > 0 ? `Showing ${visibleMovies.length} of ${section.movies.length} movies` : `${section.movies.length} movies in this shelf`;

  useAutoLoadMoreOnPageEnd(autoLoadMore && hiddenCount > 0, loadMore);

  return (
    <>
      <MovieGrid
        title={section.title}
        subtitle={subtitle}
        movies={visibleMovies}
        library={library}
        animateCardsOnMount={false}
        enableLayoutAnimation={false}
        onOpenMovie={onOpenMovie}
        onMovieIntent={onPreloadMovieDetails}
        headerAction={<BackToDiscoverButton onClick={onBack} />}
      />
      {hiddenCount > 0 && !autoLoadMore ? (
        <motion.button
          type="button"
          className="search-results-more"
          onClick={loadMore}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        >
          Show {Math.min(categoryResultPageSize, hiddenCount)} more
        </motion.button>
      ) : null}
    </>
  );
}

function ViewAllButton({ section, onClick }: { section: DiscoverSection; onClick: (section: DiscoverSection) => void }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      className="section-link-action"
      onClick={() => onClick(section)}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
    >
      <span>View all</span>
      <ArrowRight weight="bold" />
    </motion.button>
  );
}

function BackToDiscoverButton({ onClick }: { onClick: () => void }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      className="section-link-action"
      onClick={onClick}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
    >
      <ArrowLeft weight="bold" />
      <span>Discover</span>
    </motion.button>
  );
}

export function SearchResults({
  filteredCatalog,
  isLoading,
  layout,
  library,
  onLoadMore,
  onLayoutChange,
  onOpenMovie,
  onPreloadMovieDetails,
  totalResults,
}: {
  filteredCatalog: Movie[];
  isLoading: boolean;
  layout: "grid" | "row";
  library: MovieLibrary;
  onLoadMore: () => void;
  onLayoutChange: (layout: "grid" | "row") => void;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
  totalResults: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const hiddenCount = Math.max(0, totalResults - filteredCatalog.length);
  const headerAction = <SearchResultsLayoutToggle layout={layout} onLayoutChange={onLayoutChange} />;
  const subtitle =
    isLoading && filteredCatalog.length === 0
      ? "Searching the local catalog…"
      : hiddenCount > 0
        ? `Showing ${filteredCatalog.length} of ${totalResults} matches`
        : `${filteredCatalog.length} matches in the local catalog`;
  const sharedProps = {
    title: "search results",
    subtitle,
    movies: filteredCatalog,
    library,
    onOpenMovie,
    onMovieIntent: onPreloadMovieDetails,
    headerAction,
  };

  return (
    <>
      {layout === "row" ? (
        <MovieRow {...sharedProps} />
      ) : (
        <MovieGrid {...sharedProps} animateCardsOnMount={false} enableLayoutAnimation={false} />
      )}
      {hiddenCount > 0 ? (
        <motion.button
          type="button"
          className="search-results-more"
          disabled={isLoading}
          onClick={onLoadMore}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        >
          {isLoading ? "Loading…" : `Show ${Math.min(searchResultPageSize, hiddenCount)} more`}
        </motion.button>
      ) : null}
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

function useAutoLoadMoreOnPageEnd(enabled: boolean, onLoadMore: () => void) {
  useExternalSyncEffect(() => {
    if (!enabled) {
      return;
    }

    function handleScroll() {
      const scrollBottom = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollBottom >= documentHeight - 320) {
        onLoadMore();
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [enabled, onLoadMore]);
}
