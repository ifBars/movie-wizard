import { ArrowRight, CaretRight, Star, TrendUp } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeSlide, quickSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { TasteProfile } from "@/types";

type ProfileSummaryProps = {
  profile: TasteProfile;
  watchlistCount: number;
  catalogCount: number;
  className?: string;
  onCollapse?: () => void;
};

export function ProfileSummary({ profile, watchlistCount, catalogCount, className, onCollapse }: ProfileSummaryProps) {
  const shouldReduceMotion = useReducedMotion();
  const topGenres = profile.topGenres.length > 0 ? profile.topGenres : [{ name: "Rate movies to begin", weight: 1 }];
  const maxGenreWeight = Math.max(...topGenres.map((genre) => genre.weight), 1);

  return (
    <motion.aside className={cn("taste-panel", className)} layout {...fadeSlide(shouldReduceMotion, 12)}>
      <motion.div className="taste-panel__header" layout="position">
        <div>
          <h2>Taste profile</h2>
          <p>Rate more movies to improve recommendations</p>
        </div>
        <div className="taste-panel__actions">
          <button type="button">View all</button>
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
        <div className="genre-bars">
          {topGenres.slice(0, 5).map((genre) => (
            <div key={genre.name} className="genre-bar">
              <div>
                <span>{genre.name}</span>
                <span>{Math.max(8, Math.round((genre.weight / maxGenreWeight) * 32))}%</span>
              </div>
              <motion.i
                initial={{ width: shouldReduceMotion ? `${Math.max(12, Math.round((genre.weight / maxGenreWeight) * 100))}%` : "12%" }}
                animate={{ width: `${Math.max(12, Math.round((genre.weight / maxGenreWeight) * 100))}%` }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.38, ease: "easeOut" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="taste-divider" />

      <div>
        <h3>Top tags</h3>
        <div className="tag-cloud">
          {(profile.topTags.length > 0 ? profile.topTags.slice(0, 6) : [{ name: "mind-bending", weight: 1 }]).map((tag) => (
            <span key={tag.name}>{tag.name}</span>
          ))}
        </div>
      </div>

      <div className="taste-divider" />

      <motion.button type="button" className="taste-link" whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }} transition={quickSpring}>
        <TrendUp weight="bold" />
        <span>{catalogCount} catalog movies</span>
        <ArrowRight />
      </motion.button>
      <motion.button type="button" className="taste-link" whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }} transition={quickSpring}>
        <Star weight="bold" />
        <span>{watchlistCount} in watchlist</span>
        <ArrowRight />
      </motion.button>
    </motion.aside>
  );
}
