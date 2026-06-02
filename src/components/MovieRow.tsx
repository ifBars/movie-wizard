import { BookmarkSimple, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { MoviePosterCard } from "@/components/MoviePosterCard";
import { SectionHeader } from "@/components/SectionHeader";
import type { MovieLibrary } from "@/hooks/useMovieLibrary";
import { fadeScale, fadeSlide, quickSpring, softSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type MovieRowProps = {
  title: string;
  subtitle: string;
  movies: Movie[];
  library: MovieLibrary;
  onOpenMovie: (movieId: string) => void;
  onMovieIntent?: () => void;
};

export function MovieRow({ title, subtitle, movies, library, onOpenMovie, onMovieIntent }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({
    didDrag: false,
    isDragging: false,
    pointerId: -1,
    startScrollLeft: 0,
    startX: 0,
  });
  const shouldReduceMotion = useReducedMotion();
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [isDraggingRow, setIsDraggingRow] = useState(false);

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;

    if (!row) {
      return;
    }

    const maxScrollLeft = row.scrollWidth - row.clientWidth;
    const canScrollLeft = row.scrollLeft > 1;
    const canScrollRight = row.scrollLeft < maxScrollLeft - 1;

    setScrollState((current) =>
      current.canScrollLeft === canScrollLeft && current.canScrollRight === canScrollRight
        ? current
        : { canScrollLeft, canScrollRight },
    );
  }, []);

  useLayoutEffect(() => {
    updateScrollState();

    const row = rowRef.current;
    if (!row) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(row);

    return () => {
      resizeObserver.disconnect();
    };
  }, [movies.length, updateScrollState]);

  function scrollRow(direction: "left" | "right") {
    rowRef.current?.scrollBy({
      left: direction === "left" ? -rowRef.current.clientWidth * 0.78 : rowRef.current.clientWidth * 0.78,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  }

  function beginDragScroll(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || rowRef.current?.scrollWidth === rowRef.current?.clientWidth) {
      return;
    }

    dragStateRef.current = {
      didDrag: false,
      isDragging: true,
      pointerId: event.pointerId,
      startScrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
  }

  function updateDragScroll(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;

    if (!dragState.didDrag && Math.abs(deltaX) < 6) {
      return;
    }

    dragState.didDrag = true;
    setIsDraggingRow(true);
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = dragState.startScrollLeft - deltaX;
    updateScrollState();
  }

  function endDragScroll(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (dragState.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragState.isDragging = false;
    setIsDraggingRow(false);
    updateScrollState();
  }

  function suppressClickAfterDrag(event: MouseEvent<HTMLDivElement>) {
    if (!dragStateRef.current.didDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current.didDrag = false;
  }

  if (movies.length === 0) {
    return (
      <motion.section className="movie-section" layout {...fadeSlide(shouldReduceMotion, 10)}>
        <SectionHeader title={title} subtitle={subtitle} />
        <motion.div className="empty-catalog" layout {...fadeScale(shouldReduceMotion)}>
          <BookmarkSimple />
          <h3>No movies here yet</h3>
          <p>Rate movies or add titles to your watchlist to fill this row.</p>
        </motion.div>
      </motion.section>
    );
  }

  return (
    <motion.section className="movie-section" layout {...fadeSlide(shouldReduceMotion, 10)}>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="movie-row-frame">
        <AnimatePresence initial={false}>
          {scrollState.canScrollLeft ? (
            <motion.button
              key="left"
              type="button"
              className="row-edge row-edge--left"
              onClick={() => scrollRow("left")}
              aria-label={`Scroll ${title} left`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              transition={quickSpring}
            >
              <CaretLeft weight="bold" />
            </motion.button>
          ) : null}
        </AnimatePresence>
        <motion.div
          className={cn("movie-row", isDraggingRow && "is-dragging")}
          ref={rowRef}
          layout
          transition={softSpring}
          onScroll={updateScrollState}
          onPointerDown={beginDragScroll}
          onPointerMove={updateDragScroll}
          onPointerUp={endDragScroll}
          onPointerCancel={endDragScroll}
          onClickCapture={suppressClickAfterDrag}
        >
          {movies.map((movie) => (
            <MoviePosterCard
              key={movie.id}
              movie={movie}
              state={library.states[movie.id]}
              onRate={library.rateMovie}
              onToggleWatched={library.toggleWatched}
              onToggleWatchlist={library.toggleWatchlist}
              onOpen={onOpenMovie}
              onPreviewIntent={onMovieIntent}
            />
          ))}
        </motion.div>
        <AnimatePresence initial={false}>
          {scrollState.canScrollRight ? (
            <motion.button
              key="right"
              type="button"
              className="row-edge row-edge--right"
              onClick={() => scrollRow("right")}
              aria-label={`Scroll ${title} right`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              transition={quickSpring}
            >
              <CaretRight weight="bold" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
