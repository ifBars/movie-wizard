import {
  ArrowLeft,
  ArrowSquareOut,
  BookmarkSimple,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  FilmSlate,
  GlobeHemisphereWest,
  Prohibit,
  Star,
  WarningCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { MovieImagePoster } from "@/components/MovieImagePoster";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { fadeSlide, quickSpring, softSpring } from "@/lib/motion";
import { ratingFromPointerPosition, starRatings } from "@/lib/ratings";
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
  onToggleIgnored: (movieId: string) => void;
  onToggleWatched: (movieId: string) => void;
  onToggleWatchlist: (movieId: string) => void;
};

const tmdbImageBaseUrl = "https://image.tmdb.org/t/p";
type DetailTab = "overview" | "credits" | "parents-guide";

export function MovieDetailsPage({
  movie,
  movies,
  state,
  states,
  onBack,
  onOpenMovie,
  onRate,
  onToggleIgnored,
  onToggleWatched,
  onToggleWatchlist,
}: MovieDetailsPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const posterUrl = movie.posterPath ? `${tmdbImageBaseUrl}/w500${movie.posterPath}` : undefined;
  const backdropUrl = movie.backdropPath ? `${tmdbImageBaseUrl}/w1280${movie.backdropPath}` : posterUrl;
  const similarMovies = useMemo(() => getSimilarMovies(movie, movies, states), [movie, movies, states]);
  const releaseDate = formatReleaseDate(movie.releaseDate);
  const originalLanguage = formatLanguageName(movie.originalLanguage);
  const parentsGuideUrl = movie.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/parentalguide/` : undefined;
  const crewCredits = getCrewCredits(movie);
  const sourceRatings = getSourceRatings(movie);
  const ratingValue = state?.rating ?? 0;
  const [previewRating, setPreviewRating] = useState<Rating | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const displayedRating = previewRating ?? ratingValue;
  const {
    canScrollLeft,
    canScrollRight,
    isDragging,
    onClickCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onScroll,
    ref: similarRowRef,
    scrollByPage,
  } = useHorizontalScroll({
    edgeTolerance: 8,
    itemCount: similarMovies.length,
    shouldReduceMotion,
  });

  function previewRatingFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPreviewRating(ratingFromPointerPosition(event.clientX - rect.left, rect.width));
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
            <motion.button
              type="button"
              className={cn("detail-action-button detail-action-button--muted", state?.ignored && "is-muted-selected")}
              onClick={() => onToggleIgnored(movie.id)}
              aria-label={state?.ignored ? `Undo not interested for ${movie.title}` : `Mark ${movie.title} not interested`}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={quickSpring}
            >
              <Prohibit weight={state?.ignored ? "fill" : "regular"} />
              {state?.ignored ? "Undo not interested" : "Not interested"}
            </motion.button>
          </div>
        </div>
      </section>

      <motion.section className="detail-panel detail-panel--details" layout {...fadeSlide(shouldReduceMotion, 12)}>
        <div className="detail-panel-tabs" role="tablist" aria-label="Movie detail sections">
          <button
            type="button"
            className={cn(activeTab === "overview" && "is-active")}
            onClick={() => setActiveTab("overview")}
            role="tab"
            aria-selected={activeTab === "overview"}
          >
            Overview
          </button>
          <button
            type="button"
            className={cn(activeTab === "credits" && "is-active")}
            onClick={() => setActiveTab("credits")}
            role="tab"
            aria-selected={activeTab === "credits"}
          >
            Credits
          </button>
          <button
            type="button"
            className={cn(activeTab === "parents-guide" && "is-active")}
            onClick={() => setActiveTab("parents-guide")}
            role="tab"
            aria-selected={activeTab === "parents-guide"}
          >
            Parents guide
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "overview" ? (
            <motion.div key="overview" className="detail-tab-layout" role="tabpanel" {...fadeSlide(shouldReduceMotion, 8)}>
              <div className="detail-overview-column">
                <div className="detail-overview-head">
                  <div>
                    <h2>Storyline</h2>
                    <p>{movie.synopsis}</p>
                  </div>
                  <DetailRatingControl
                    displayedRating={displayedRating}
                    movie={movie}
                    onPointerLeave={() => setPreviewRating(null)}
                    onPreviewRating={previewRatingFromPointer}
                    onRate={onRate}
                    onSetPreviewRating={setPreviewRating}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                </div>

                {movie.trailerUrl ? (
                  <section className="detail-trailer" aria-label="Movie trailer">
                    <h3>Trailer</h3>
                    <div className="detail-trailer__frame">
                      <iframe
                        src={movie.trailerUrl}
                        title={`${movie.title} trailer`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  </section>
                ) : null}

                <section className="detail-facts-strip" aria-label="Movie facts">
                  <DetailFact icon={<FilmSlate weight="fill" />} label="Runtime" value={movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : "Not listed"} />
                  <DetailFact icon={<CalendarBlank weight="fill" />} label="Release" value={releaseDate ?? String(movie.year)} />
                  <DetailFact icon={<GlobeHemisphereWest weight="fill" />} label="Original language" value={originalLanguage} />
                </section>

                <div className="detail-tags detail-tags--overview">
                  {movie.genres.slice(0, 6).map((genre) => (
                    <span key={genre}>{genre}</span>
                  ))}
                </div>

                {similarMovies.length > 0 ? (
                  <section className="detail-tab-similar">
                    <h2>More like this</h2>
                    <div className="movie-row-frame">
                      <AnimatePresence initial={false}>
                        {canScrollLeft ? (
                          <motion.button
                            key="left"
                            type="button"
                            className="row-edge row-edge--left"
                            onClick={() => scrollByPage("left")}
                            aria-label="Scroll similar picks left"
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
                        className={cn("movie-row detail-similar-row", isDragging && "is-dragging")}
                        ref={similarRowRef}
                        layout
                        transition={softSpring}
                        onScroll={onScroll}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerCancel}
                        onClickCapture={onClickCapture}
                      >
                        {similarMovies.map((similarMovie) => (
                          <MovieImagePoster key={similarMovie.id} movie={similarMovie} onOpen={onOpenMovie} />
                        ))}
                      </motion.div>
                      <AnimatePresence initial={false}>
                        {canScrollRight ? (
                          <motion.button
                            key="right"
                            type="button"
                            className="row-edge row-edge--right"
                            onClick={() => scrollByPage("right")}
                            aria-label="Scroll similar picks right"
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
                  </section>
                ) : null}
              </div>

              <aside className="detail-info-rail" aria-label="Movie source information">
                <DetailSourceRail
                  movie={movie}
                  parentsGuideUrl={parentsGuideUrl}
                  sourceRatings={sourceRatings}
                  onOpenParentsGuide={() => setActiveTab("parents-guide")}
                />
              </aside>
            </motion.div>
          ) : null}

          {activeTab === "credits" ? (
            <motion.div key="credits" className="detail-credits-tab" role="tabpanel" {...fadeSlide(shouldReduceMotion, 8)}>
              <div className="detail-section-title">
                <h2>Cast and crew</h2>
                <p>{movie.title}</p>
              </div>
              <div className="detail-credit-groups">
                <DetailList label="Director" values={movie.directors} />
                <DetailPeopleList label="Top cast" values={movie.cast} />
                <DetailCrewList credits={crewCredits} />
              </div>
            </motion.div>
          ) : null}

          {activeTab === "parents-guide" ? (
            <motion.div key="parents-guide" className="detail-parents-tab" role="tabpanel" {...fadeSlide(shouldReduceMotion, 8)}>
              <div className="detail-section-title">
                <h2>IMDb Parents Guide</h2>
                <p>{movie.imdbId ?? "IMDb ID unavailable"}</p>
              </div>
              <div className="detail-parents-layout">
                <div className="detail-parent-preview">
                  <WarningCircle weight="fill" />
                  <h3>Content guide opens on IMDb</h3>
                  <p>
                    IMDb guide pages are challenge-protected and are not a reliable embedded surface for a browser-only
                    local app.
                  </p>
                  {parentsGuideUrl ? (
                    <a href={parentsGuideUrl} target="_blank" rel="noreferrer">
                      Open IMDb Parents Guide
                      <ArrowSquareOut weight="bold" />
                    </a>
                  ) : (
                    <span>IMDb guide unavailable</span>
                  )}
                </div>
                <div className="detail-parent-categories">
                  {["Sex & Nudity", "Violence & Gore", "Profanity", "Alcohol, Drugs & Smoking", "Frightening & Intense Scenes"].map((category) => (
                    <div key={category}>
                      <span>{category}</span>
                      <p>View category details on IMDb.</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>
    </motion.section>
  );
}

function DetailRatingControl({
  displayedRating,
  movie,
  onPointerLeave,
  onPreviewRating,
  onRate,
  onSetPreviewRating,
  shouldReduceMotion,
}: {
  displayedRating: Rating | 0;
  movie: Movie;
  onPointerLeave: () => void;
  onPreviewRating: (event: PointerEvent<HTMLDivElement>) => void;
  onRate: (movieId: string, rating: Rating) => void;
  onSetPreviewRating: (rating: Rating | null) => void;
  shouldReduceMotion: boolean | null;
}) {
  return (
    <motion.div className="detail-rating-block" layout="position" transition={softSpring}>
      <span>Rate this movie</span>
      <div className="detail-rating-inline" aria-label={`Rate ${movie.title}`} onPointerLeave={onPointerLeave}>
        <div className="detail-rating-stars" onPointerMove={onPreviewRating}>
          {starRatings.map((rating) => (
            <motion.button
              key={rating}
              type="button"
              onClick={() => onRate(movie.id, rating)}
              onFocus={() => onSetPreviewRating(rating)}
              onBlur={() => onSetPreviewRating(null)}
              aria-label={`Rate ${rating} stars`}
              className={cn(rating <= displayedRating && "is-filled", displayedRating === rating && "is-preview-target")}
              whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.12 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.82 }}
              animate={
                displayedRating === rating && !shouldReduceMotion
                  ? { scale: [1, 1.2, 1], rotate: [0, -8, 0] }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.18 }}
            >
              <Star weight={rating <= displayedRating ? "fill" : "regular"} />
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function DetailSourceRail({
  movie,
  parentsGuideUrl,
  sourceRatings,
  onOpenParentsGuide,
}: {
  movie: Movie;
  parentsGuideUrl?: string;
  sourceRatings: Array<{ label: string; value: string; meta?: string }>;
  onOpenParentsGuide: () => void;
}) {
  return (
    <>
      <section className="detail-rail-panel">
        <h2>Source ratings</h2>
        <div className="detail-rating-summary">
          {sourceRatings.length > 0 ? (
            sourceRatings.map((rating) => (
              <div key={rating.label}>
                <span>{rating.label}</span>
                <strong>
                  <Star weight="fill" />
                  {rating.value}
                </strong>
                {rating.meta ? <p>{rating.meta}</p> : null}
              </div>
            ))
          ) : (
            <p>No source ratings are listed yet.</p>
          )}
        </div>
      </section>

      <section className="detail-rail-panel detail-rail-panel--guide">
        <div className="detail-mini-heading">
          <UsersThree weight="fill" />
          <span>IMDb Parents Guide</span>
        </div>
        <p>Check content categories like violence, profanity, alcohol, nudity, and frightening scenes.</p>
        <div className="detail-rail-actions">
          <button type="button" onClick={onOpenParentsGuide}>Preview tab</button>
          {parentsGuideUrl ? (
            <a href={parentsGuideUrl} target="_blank" rel="noreferrer">
              Open guide
              <ArrowSquareOut weight="bold" />
            </a>
          ) : null}
        </div>
      </section>

      <section className="detail-rail-panel detail-rail-panel--source">
        <h2>About this data</h2>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB. IMDb links open externally.</p>
        <div className="detail-source-logos" aria-label="Data providers">
          <span>TMDB</span>
          <span>IMDb</span>
        </div>
        {movie.imdbId ? <p className="detail-source-id">{movie.imdbId}</p> : null}
      </section>
    </>
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

function DetailPeopleList({ label, values }: { label: string; values: string[] }) {
  return (
    <section className="detail-people-list" aria-label={label}>
      <h3>{label}</h3>
      {values.length > 0 ? (
        <div className="detail-people-grid">
          {values.map((name) => (
            <div key={name}>
              <strong>{name}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p>Not listed</p>
      )}
    </section>
  );
}

function DetailCrewList({ credits }: { credits: Array<{ name: string; job: string }> }) {
  return (
    <div className="detail-list">
      <span>Crew</span>
      {credits.length > 0 ? (
        <dl className="detail-crew-list">
          {credits.map((credit) => (
            <div key={`${credit.job}-${credit.name}`}>
              <dt>{credit.job}</dt>
              <dd>{credit.name}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Not listed</p>
      )}
    </div>
  );
}

function DetailFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="detail-fact">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function getCrewCredits(movie: Movie) {
  if (movie.crew && movie.crew.length > 0) {
    return movie.crew;
  }

  return movie.directors.map((name) => ({ name, job: "Director" }));
}

function getSourceRatings(movie: Movie): Array<{ label: string; value: string; meta?: string }> {
  const ratings: Array<{ label: string; value: string; meta?: string }> = [];

  if (movie.source?.tmdbVoteAverage) {
    ratings.push({
      label: "TMDB",
      value: `${movie.source.tmdbVoteAverage.toFixed(1)}/10`,
      meta: movie.source.tmdbVoteCount ? `${movie.source.tmdbVoteCount.toLocaleString()} votes` : undefined,
    });
  }

  return ratings;
}

function formatReleaseDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatLanguageName(value: string) {
  try {
    return new Intl.DisplayNames(undefined, { type: "language" }).of(value) ?? value.toUpperCase();
  } catch {
    return value.toUpperCase();
  }
}

function getSimilarMovies(movie: Movie, movies: Movie[], states: MovieStateMap) {
  const genres = new Set(movie.genres);
  const tags = new Set(movie.tags);

  return movies
    .filter((candidate) => candidate.id !== movie.id && !states[candidate.id]?.ignored)
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
