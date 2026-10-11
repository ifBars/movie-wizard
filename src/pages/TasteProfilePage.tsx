import { ArrowRight, FilmSlate, MaskHappy, ProhibitInset, Star, UserFocus, UsersThree } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router";
import { movieDetailPath, viewPath } from "@/lib/navigation";
import { fadeSlide } from "@/lib/motion";
import { formatRating, halfStarRatings } from "@/lib/ratings";
import { catalogSearchPath, describeRatingStyle, getMostCommonRating, toSignalShares } from "@/lib/tasteProfile";
import { cn } from "@/lib/utils";
import type { Movie, MovieStateMap, TasteProfile, TasteSignal } from "@/types";

type TasteProfilePageProps = {
  profile: TasteProfile;
  ratedMovies: Movie[];
  states: MovieStateMap;
  watchlistCount: number;
  onOpenMovie: (movieId: string) => void;
};

const topRatedLimit = 8;

export function TasteProfilePage({ profile, ratedMovies, states, watchlistCount, onOpenMovie }: TasteProfilePageProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasRatings = profile.ratedCount > 0;
  const mostCommonRating = getMostCommonRating(profile);

  return (
    <motion.section className="settings-page taste-profile-page" {...fadeSlide(shouldReduceMotion, 10)}>
      <header className="settings-page__header">
        <p>Taste profile</p>
        <h1>What you're into</h1>
        <span>
          {hasRatings
            ? `Built from ${pluralize(profile.ratedCount, "rating")}${watchlistCount > 0 ? ` and ${pluralize(watchlistCount, "watchlist pick")}` : ""}. These are the signals your recommendations lean on. Tap any tag or name to find movies you haven't rated yet.`
            : "Rate movies you've seen and your favorite genres, moods, and people will show up here."}
        </span>
      </header>

      <section className="settings-overview taste-profile-overview" aria-label="Profile summary">
        <dl className="settings-overview__stats">
          <div>
            <dt>Rated</dt>
            <dd>{profile.ratedCount}</dd>
          </div>
          <div>
            <dt>Average</dt>
            <dd>{hasRatings ? formatRating(profile.averageRating) : "–"}</dd>
          </div>
          <div>
            <dt>Watched</dt>
            <dd>{profile.watchedCount}</dd>
          </div>
          <div>
            <dt>Watchlist</dt>
            <dd>{watchlistCount}</dd>
          </div>
        </dl>
      </section>

      {!hasRatings ? (
        <div className="taste-profile-empty">
          <Star weight="fill" />
          <p>Your profile fills in as you rate. Even five ratings make a visible difference.</p>
          <Link className="taste-profile-empty__action" to={viewPath("discover")}>
            Start rating
            <ArrowRight weight="bold" />
          </Link>
        </div>
      ) : (
        <div className="taste-profile-grid">
          <ProfileSection icon={Star} title="Rating habits" description={describeRatingStyle(profile)}>
            <RatingHistogram counts={profile.ratingCounts} />
            {mostCommonRating !== null ? (
              <p className="taste-profile-note">
                Most common rating: <strong>{formatRating(mostCommonRating)}</strong>
              </p>
            ) : null}
          </ProfileSection>

          <ProfileSection icon={FilmSlate} title="Favorite genres" description="Share of your positive genre signal.">
            <SignalBars signals={profile.topGenres} emptyText="Rate a few movies 4 stars or higher to surface favorite genres." />
          </ProfileSection>

          <ProfileSection
            icon={MaskHappy}
            title="Moods & themes"
            description="Community tags and keywords from movies you rated highly."
            wide
          >
            <SignalChips signals={profile.topTags} emptyText="Moods and themes appear as you rate more movies." />
          </ProfileSection>

          <ProfileSection icon={UserFocus} title="Directors you return to" description="From two or more movies you rated.">
            <SignalChips signals={profile.topDirectors} emptyText="Rate more than one movie by the same director to see them here." />
          </ProfileSection>

          <ProfileSection icon={UsersThree} title="Actors you return to" description="From two or more movies you rated.">
            <SignalChips signals={profile.topCast} emptyText="Rate more than one movie with the same actor to see them here." />
          </ProfileSection>

          <ProfileSection
            icon={ProhibitInset}
            title="Less your thing"
            description="From low ratings and “Not interested”. Recommendations steer away from these."
          >
            <SignalChips
              signals={[...profile.avoidedGenres, ...profile.avoidedTags]}
              emptyText="Nothing yet. Low ratings and “Not interested” marks will show up here."
              tone="muted"
            />
          </ProfileSection>

          <ProfileSection icon={Star} title="Your top rated" description="Highest rated first.">
            <ol className="taste-profile-top-rated">
              {ratedMovies.slice(0, topRatedLimit).map((movie) => (
                <li key={movie.id}>
                  <a href={movieDetailPath(movie.id)} onClick={(event) => openMovie(event, movie.id, onOpenMovie)}>
                    <span>{movie.title}</span>
                    <small>{movie.year}</small>
                  </a>
                  <strong>
                    <Star weight="fill" />
                    {formatRating(states[movie.id]?.rating ?? 0)}
                  </strong>
                </li>
              ))}
            </ol>
            {ratedMovies.length > topRatedLimit ? (
              <Link className="taste-profile-more" to={viewPath("history")}>
                See all {ratedMovies.length} in history
                <ArrowRight weight="bold" />
              </Link>
            ) : null}
          </ProfileSection>
        </div>
      )}
    </motion.section>
  );
}

function ProfileSection({
  icon: IconComponent,
  title,
  description,
  wide = false,
  children,
}: {
  icon: Icon;
  title: string;
  description: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("taste-profile-section", wide && "taste-profile-section--wide")}>
      <div className="taste-profile-section__head">
        <span aria-hidden="true">
          <IconComponent weight="bold" />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RatingHistogram({ counts }: { counts: number[] }) {
  const highestCount = Math.max(1, ...counts);

  return (
    <div className="taste-profile-histogram" role="img" aria-label={describeHistogram(counts)}>
      {halfStarRatings.map((rating, index) => (
        <div key={rating} className="taste-profile-histogram__column">
          <span className="taste-profile-histogram__count">{counts[index] > 0 ? counts[index] : ""}</span>
          <i style={{ height: `${Math.max(counts[index] > 0 ? 6 : 2, (counts[index] / highestCount) * 100)}%` }} />
          <span className="taste-profile-histogram__label">{Number.isInteger(rating) ? rating : ""}</span>
        </div>
      ))}
    </div>
  );
}

function SignalBars({ signals, emptyText }: { signals: TasteSignal[]; emptyText: string }) {
  if (signals.length === 0) return <p className="taste-panel__empty">{emptyText}</p>;

  return (
    <div className="genre-bars">
      {toSignalShares(signals).map((signal) => (
        <Link key={signal.name} className="genre-bar taste-profile-bar" to={catalogSearchPath(signal.name)}>
          <div>
            <span>{signal.name}</span>
            <span>{signal.share}%</span>
          </div>
          <i style={{ width: `${Math.max(6, signal.relative * 100)}%` }} />
        </Link>
      ))}
    </div>
  );
}

function SignalChips({ signals, emptyText, tone }: { signals: TasteSignal[]; emptyText: string; tone?: "muted" }) {
  if (signals.length === 0) return <p className="taste-panel__empty">{emptyText}</p>;

  return (
    <div className={cn("tag-cloud", tone === "muted" && "tag-cloud--muted")}>
      {signals.map((signal) => (
        <Link key={signal.name} to={catalogSearchPath(signal.name)}>
          {signal.name}
        </Link>
      ))}
    </div>
  );
}

function openMovie(event: MouseEvent<HTMLAnchorElement>, movieId: string, onOpenMovie: (movieId: string) => void) {
  if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  onOpenMovie(movieId);
}

function describeHistogram(counts: number[]) {
  const parts = halfStarRatings.flatMap((rating, index) => (counts[index] > 0 ? [`${counts[index]} at ${formatRating(rating)}`] : []));
  return `Rating distribution: ${parts.join(", ")}`;
}

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
