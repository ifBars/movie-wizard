import { ArrowLeft, ArrowRight, ArrowsClockwise, Info, ListBullets, SquaresFour } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { PointerEvent } from "react";
import { useSearchParams } from "react-router";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieRow } from "@/components/MovieRow";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { describeCatalogBrowseFilters } from "@/lib/catalogBrowse";
import type { CatalogBrowseFilters } from "@/lib/catalogBrowse";
import { findDiscoverSection } from "@/lib/discoverSections";
import type { DiscoverSection } from "@/lib/discoverSections";
import { fadeSlide } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

const searchResultPageSize = 24;

type DiscoverPageProps = {
  discoverSections: DiscoverSection[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
};

export function DiscoverPage({
  discoverSections,
  library,
  onOpenMovie,
  onPreloadMovieDetails,
}: DiscoverPageProps) {
  const [featuredPickIndex, setFeaturedPickIndex] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSection = findDiscoverSection(discoverSections, searchParams.get("category"));
  const featuredMovies = discoverSections.find((section) => section.key === "top-picks")?.movies.filter((movie) => movie.backdropPath).slice(0, 8) ?? [];
  const featuredMovie = featuredMovies[featuredPickIndex % Math.max(featuredMovies.length, 1)];

  function openSection(section: DiscoverSection) {
    setSearchParams({ category: section.key });
  }

  function closeSection() {
    setSearchParams({});
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
      {featuredMovie ? (
        <FeaturedPick
          movie={featuredMovie}
          onNext={() => setFeaturedPickIndex((currentIndex) => (currentIndex + 1) % featuredMovies.length)}
          onOpenMovie={onOpenMovie}
        />
      ) : null}
      {discoverSections.map((section) => {
        const visibleMovies = section.movies.slice(0, section.rowLimit);

        return (
          <MovieRow
            key={section.key}
            title={section.title}
            subtitle={section.subtitle}
            movies={visibleMovies}
            library={library}
            onOpenMovie={onOpenMovie}
            onMovieIntent={onPreloadMovieDetails}
            headerAction={<ViewAllButton section={section} onClick={openSection} />}
          />
        );
      })}
      <PrivacyNote />
    </>
  );
}

function FeaturedPick({ movie, onNext, onOpenMovie }: { movie: Movie; onNext: () => void; onOpenMovie: (movieId: string) => void }) {
  const shouldReduceMotion = useReducedMotion();
  const backdropUrl = `https://image.tmdb.org/t/p/w1280${movie.backdropPath}`;

  return (
    <motion.section className="featured-pick" aria-label="Featured recommendation" {...fadeSlide(shouldReduceMotion, 10)}>
      <img src={backdropUrl} alt="" className="featured-pick__backdrop" />
      <div className="featured-pick__shade" />
      <div className="featured-pick__content">
        <span className="featured-pick__eyebrow">Featured for you</span>
        <h1>{movie.title}</h1>
        <p className="featured-pick__meta">
          {movie.year} <span aria-hidden="true">·</span> {movie.runtimeMinutes} min <span aria-hidden="true">·</span> {movie.genres.slice(0, 2).join(", ")}
        </p>
        <p className="featured-pick__synopsis">{movie.synopsis}</p>
        <div className="featured-pick__actions">
          <motion.button type="button" className="featured-pick__primary" onClick={() => onOpenMovie(movie.id)} whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}>
            <Info weight="fill" />
            <span>See details</span>
          </motion.button>
          <motion.button type="button" className="featured-pick__secondary" onClick={onNext} whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}>
            <ArrowsClockwise weight="bold" />
            <span>Another pick</span>
          </motion.button>
        </div>
      </div>
    </motion.section>
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
  const subtitle = `${section.movies.length} movies in this shelf`;

  return (
    <>
      <MovieGrid
        title={section.title}
        subtitle={subtitle}
        movies={section.movies}
        library={library}
        animateCardsOnMount={false}
        enableLayoutAnimation={false}
        onOpenMovie={onOpenMovie}
        onMovieIntent={onPreloadMovieDetails}
        headerAction={<BackToDiscoverButton onClick={onBack} />}
      />
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
  browseFilters,
  filteredCatalog,
  isLoading,
  layout,
  library,
  onLoadMore,
  onLayoutChange,
  onOpenMovie,
  onPreloadMovieDetails,
  search,
  totalResults,
}: {
  browseFilters: CatalogBrowseFilters;
  filteredCatalog: Movie[];
  isLoading: boolean;
  layout: "grid" | "row";
  library: MovieLibrary;
  onLoadMore: () => void;
  onLayoutChange: (layout: "grid" | "row") => void;
  onOpenMovie: (movieId: string) => void;
  onPreloadMovieDetails?: (movieId: string) => void;
  search: string;
  totalResults: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const hiddenCount = Math.max(0, totalResults - filteredCatalog.length);
  const headerAction = <SearchResultsLayoutToggle layout={layout} onLayoutChange={onLayoutChange} />;
  const filterDescription = describeCatalogBrowseFilters(browseFilters);
  const scopeDescription = [search ? `“${search}”` : "All movies", filterDescription].filter(Boolean).join(" · ");
  const subtitle =
    isLoading && filteredCatalog.length === 0
      ? "Searching the local catalog…"
      : hiddenCount > 0
        ? `${scopeDescription} · Showing ${filteredCatalog.length} of ${totalResults}`
        : `${scopeDescription} · ${filteredCatalog.length} matches`;
  const sharedProps = {
    title: search ? "search results" : "browse movies",
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
