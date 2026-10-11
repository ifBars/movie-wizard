import { CaretRight, Star } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router";
import { viewPath } from "@/lib/navigation";
import { fadeSlide, quickSpring } from "@/lib/motion";
import { catalogSearchPath, toSignalShares } from "@/lib/tasteProfile";
import { cn } from "@/lib/utils";
import type { TasteProfile } from "@/types";

type ProfileSummaryProps = {
  profile: TasteProfile;
  watchlistCount: number;
  className?: string;
  onCollapse?: () => void;
  onNavigate?: () => void;
};

// The dial fills toward this many ratings, roughly where recommendations reach high confidence.
const ratingsForFullDial = 25;

export function ProfileSummary({ profile, watchlistCount, className, onCollapse, onNavigate }: ProfileSummaryProps) {
  const shouldReduceMotion = useReducedMotion();
  const topGenres = toSignalShares(profile.topGenres.slice(0, 5));
  const topTags = profile.topTags.slice(0, 6);
  const dialProgress = Math.min(1, profile.ratedCount / ratingsForFullDial);
  const subtitle =
    profile.ratedCount === 0
      ? "Rate movies you've seen to build your profile"
      : profile.ratedCount < ratingsForFullDial
        ? "Rate more movies to improve recommendations"
        : "Your ratings are shaping every pick";

  return (
    <motion.aside className={cn("taste-panel", className)} layout {...fadeSlide(shouldReduceMotion, 12)}>
      <motion.div className="taste-panel__header" layout="position">
        <div>
          <h2>Taste profile</h2>
          <p>{subtitle}</p>
        </div>
        <div className="taste-panel__actions">
          <Link to={viewPath("profile")} onClick={onNavigate}>
            View all
          </Link>
          {onCollapse ? (
            <motion.button
              type="button"
              className="taste-panel__close-button"
              onClick={onCollapse}
              aria-label="Close taste profile"
              title="Close taste profile"
              whileHover={shouldReduceMotion ? undefined : { x: 2 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
              transition={quickSpring}
            >
              <CaretRight weight="bold" />
            </motion.button>
          ) : null}
        </div>
      </motion.div>

      <motion.div className="rating-dial" aria-label={`${profile.ratedCount} rated movies`} layout="position">
        <motion.div
          className="rating-dial__ring"
          style={{
            background: `conic-gradient(var(--brand-orange-2) ${Math.round(dialProgress * 360)}deg, var(--surface-muted) 0deg)`,
          }}
          animate={shouldReduceMotion ? undefined : { scale: profile.ratedCount > 0 ? [1, 1.04, 1] : 1 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
        >
          <Star weight="fill" />
          <strong>{profile.ratedCount}</strong>
        </motion.div>
        <span>rated movies</span>
      </motion.div>

      <div className="taste-divider" />

      <div>
        <h3>Top genres</h3>
        {topGenres.length > 0 ? (
          <div className="genre-bars">
            {topGenres.map((genre) => (
              <div key={genre.name} className="genre-bar">
                <div>
                  <span>{genre.name}</span>
                  <span>{genre.share}%</span>
                </div>
                <motion.i
                  initial={{ width: shouldReduceMotion ? `${Math.max(6, genre.relative * 100)}%` : "6%" }}
                  animate={{ width: `${Math.max(6, genre.relative * 100)}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.38, ease: "easeOut" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="taste-panel__empty">Your favorite genres appear after a few 4-star ratings.</p>
        )}
      </div>

      <div className="taste-divider" />

      <div>
        <h3>Top tags</h3>
        {topTags.length > 0 ? (
          <div className="tag-cloud">
            {topTags.map((tag) => (
              <Link key={tag.name} to={catalogSearchPath(tag.name)} onClick={onNavigate} title={`Find unrated movies tagged ${tag.name}`}>
                {tag.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="taste-panel__empty">Moods and themes you like will show up here.</p>
        )}
      </div>

      <div className="taste-divider" />

      <Link className="taste-link" to={viewPath("history")} onClick={onNavigate}>
        <span>Watched</span>
        <strong>{profile.watchedCount}</strong>
        <CaretRight weight="bold" />
      </Link>
      <Link className="taste-link" to={viewPath("watchlist")} onClick={onNavigate}>
        <span>Watchlist</span>
        <strong>{watchlistCount}</strong>
        <CaretRight weight="bold" />
      </Link>
    </motion.aside>
  );
}
