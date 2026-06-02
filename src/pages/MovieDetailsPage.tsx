import { ArrowLeft, BookmarkSimple, CaretLeft, CaretRight, CheckCircle, FilmSlate, GearSix, Star } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { MoviePosterCard } from "@/components/MoviePosterCard";
import { fadeSlide, quickSpring, softSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Movie, MovieStateMap, Rating, UserMovieState } from "@/types";

type MovieDetailsPageProps = {
  movie: Movie;
  movies: Movie[];
  state?: UserMovieState;
  states: MovieStateMap;
  onBack: () => void;
  onOpenMovie: (movieId: string) => void;
  onRate: (movieId: string, rating: Rating) => void;
  onToggleWatched: (movieId: string) => void;
  onToggleWatchlist: (movieId: string) => void;
};

const tmdbImageBaseUrl = "https://image.tmdb.org/t/p";
const ratings = [1, 2, 3, 4, 5] as const;

export function MovieDetailsPage({
  movie,
  movies,
  state,
  states,
  onBack,
  onOpenMovie,
  onRate,
  onToggleWatched,
  onToggleWatchlist,
}: MovieDetailsPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const posterUrl = movie.posterPath ? `${tmdbImageBaseUrl}/w500${movie.posterPath}` : undefined;
  const backdropUrl = movie.backdropPath ? `${tmdbImageBaseUrl}/w1280${movie.backdropPath}` : posterUrl;
  const similarMovies = useMemo(() => getSimilarMovies(movie, movies), [movie, movies]);
  const ratingValue = state?.rating ?? 0;
  const [previewRating, setPreviewRating] = useState<Rating | null>(null);
  const displayedRating = previewRating ?? ratingValue;
  const similarRowRef = useRef<HTMLDivElement>(null);

  function scrollSimilar(direction: "left" | "right") {
    similarRowRef.current?.scrollBy({
      left: direction === "left" ? -similarRowRef.current.clientWidth * 0.78 : similarRowRef.current.clientWidth * 0.78,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  }

  function previewRatingFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const nextRating = Math.min(5, Math.max(1, Math.ceil((x / rect.width) * 5))) as Rating;

    setPreviewRating(nextRating);
  }

  return (
    <motion.section className="movie-detail-page">
      <section className="movie-detail-hero">
        <div className="detail-backdrop" aria-hidden="true">
          <div className={cn("detail-backdrop__fallback bg-gradient-to-br", movie.posterTone)} />
          {backdropUrl ? <img src={backdropUrl} alt="" /> : null}
        </div>

        <div className="detail-poster">
          <div className="poster-art">
            <div className={cn("poster-art__wash bg-gradient-to-br", movie.posterTone)} />
            {posterUrl ? <img className="poster-art__image" src={posterUrl} alt={`${movie.title} poster`} /> : null}
            <div className={cn("poster-art__grain", posterUrl && "poster-art__grain--image")} />
            {!posterUrl ? (
              <div className="poster-art__content">
                <p>{movie.title}</p>
              <span>{movie.year}</span>
            </div>
          ) : null}
          </div>
        </div>

        <motion.button
          type="button"
          className="detail-back-button"
          onClick={onBack}
          whileHover={shouldReduceMotion ? undefined : { x: -2 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          transition={quickSpring}
        >
          <ArrowLeft weight="bold" />
          Back
        </motion.button>

        <div className="detail-summary">
          <div className="detail-kicker">
            <FilmSlate weight="fill" />
            <span>{movie.genres[0] ?? "Movie"}</span>
          </div>
          <h1>{movie.title}</h1>
          <div className="detail-facts">
            <span>{movie.year}</span>
            {movie.runtimeMinutes ? <span>{movie.runtimeMinutes} min</span> : null}
            {movie.criticalScore ? <span>{movie.criticalScore}% signal</span> : null}
          </div>
          <div className="detail-genres">
            {movie.genres.slice(0, 4).map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
          <p>{movie.synopsis}</p>

          <div className="detail-actions">
            <motion.button
              type="button"
              className={cn("detail-action-button detail-action-button--primary", state?.watchlist && "is-selected")}
              onClick={() => onToggleWatchlist(movie.id)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={quickSpring}
            >
              <BookmarkSimple weight={state?.watchlist ? "fill" : "regular"} />
              {state?.watchlist ? "In watchlist" : "Watchlist"}
            </motion.button>
            <motion.button
              type="button"
              className={cn("detail-action-button", state?.watched && "is-selected")}
              onClick={() => onToggleWatched(movie.id)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={quickSpring}
            >
              <CheckCircle weight={state?.watched ? "fill" : "regular"} />
              {state?.watched ? "Watched" : "Mark watched"}
            </motion.button>
            <div
              className={cn("detail-rating-inline", previewRating !== null && "is-previewing")}
              aria-label={`Rate ${movie.title}`}
              onPointerLeave={() => setPreviewRating(null)}
            >
              <span>Rate</span>
              <div className="detail-rating-stars" onPointerMove={previewRatingFromPointer}>
                {ratings.map((rating) => (
                  <motion.button
                    key={rating}
                    type="button"
                    onClick={() => onRate(movie.id, rating as Rating)}
                    onFocus={() => setPreviewRating(rating)}
                    onBlur={() => setPreviewRating(null)}
                    aria-label={`Rate ${rating} stars`}
                    className={cn(rating <= displayedRating && "is-filled", previewRating === rating && "is-preview-target")}
                    whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.12 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.82 }}
                    animate={
                      displayedRating === rating && !shouldReduceMotion
                        ? { scale: [1, 1.2, 1], rotate: previewRating ? 0 : [0, -8, 0] }
                        : { scale: 1, rotate: 0 }
                    }
                    transition={{ duration: 0.18 }}
                  >
                    <Star weight={rating <= displayedRating ? "fill" : "regular"} />
                  </motion.button>
                ))}
              </div>
              <strong>{previewRating ? `${previewRating}/5` : ratingValue ? `${ratingValue}/5` : "Not rated"}</strong>
            </div>
          </div>
        </div>
      </section>

      <motion.div className="movie-detail-content" layout transition={softSpring}>
        <motion.section className="detail-panel detail-panel--details" layout {...fadeSlide(shouldReduceMotion, 12)}>
          <div className="detail-panel-tabs" aria-label="Movie detail sections">
            <span className="is-active">Details</span>
            <span>Cast</span>
            <span>Crew</span>
          </div>
          <div className="detail-panel-grid">
            <div>
              <h2>Overview</h2>
              <p>{movie.synopsis}</p>
            </div>
            <div>
              <DetailList label="Director" values={movie.directors} />
              <DetailList label="Cast" values={movie.cast.slice(0, 5)} />
            </div>
          </div>
        </motion.section>

        <motion.section className="detail-panel detail-panel--notes" layout {...fadeSlide(shouldReduceMotion, 16)}>
          <h2>Catalog notes</h2>
          <p>{movie.plexFit}</p>
          <div className="detail-tags">
            {movie.tags.slice(0, 8).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="detail-source-note">
            <span>Source</span>
            <p>Images and metadata provided by TMDB.</p>
          </div>
        </motion.section>
      </motion.div>

      {similarMovies.length > 0 ? (
        <motion.section className="detail-similar-section" layout {...fadeSlide(shouldReduceMotion, 12)}>
          <DetailSectionHeader title="similar picks" subtitle="Shared genres, tags, and catalog signals" />
          <div className="movie-row-frame">
            <motion.button
              type="button"
              className="row-edge row-edge--left"
              onClick={() => scrollSimilar("left")}
              aria-label="Scroll similar picks left"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              transition={quickSpring}
            >
              <CaretLeft weight="bold" />
            </motion.button>
            <motion.div className="movie-row detail-similar-row" ref={similarRowRef} layout transition={softSpring}>
              {similarMovies.map((similarMovie) => (
                <MoviePosterCard
                  key={similarMovie.id}
                  movie={similarMovie}
                  state={states[similarMovie.id]}
                  onRate={onRate}
                  onToggleWatched={onToggleWatched}
                  onToggleWatchlist={onToggleWatchlist}
                  onOpen={onOpenMovie}
                />
              ))}
            </motion.div>
            <motion.button
              type="button"
              className="row-edge row-edge--right"
              onClick={() => scrollSimilar("right")}
              aria-label="Scroll similar picks right"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              transition={quickSpring}
            >
              <CaretRight weight="bold" />
            </motion.button>
          </div>
        </motion.section>
      ) : null}
    </motion.section>
  );
}

function DetailSectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div className="section-header" layout="position" transition={softSpring}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <motion.button
        type="button"
        aria-label={`${title} settings`}
        whileHover={shouldReduceMotion ? undefined : { rotate: 12 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
        transition={quickSpring}
      >
        <GearSix weight="fill" />
      </motion.button>
    </motion.div>
  );
}

function DetailList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="detail-list">
      <span>{label}</span>
      <p>{values.length > 0 ? values.join(", ") : "Not listed"}</p>
    </div>
  );
}

function getSimilarMovies(movie: Movie, movies: Movie[]) {
  const genres = new Set(movie.genres);
  const tags = new Set(movie.tags);

  return movies
    .filter((candidate) => candidate.id !== movie.id)
    .map((candidate) => ({
      movie: candidate,
      score:
        candidate.genres.filter((genre) => genres.has(genre)).length * 4 +
        candidate.tags.filter((tag) => tags.has(tag)).length * 2 +
        (candidate.criticalScore >= movie.criticalScore - 5 ? 1 : 0),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.movie.popularity - a.movie.popularity)
    .slice(0, 8)
    .map((candidate) => candidate.movie);
}
