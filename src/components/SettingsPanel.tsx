import { BookmarkSimple, Database, DownloadSimple, Star, Trash } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeSlide, quickSpring, softSpring } from "@/lib/motion";

const tmdbLogoUrl =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

type SettingsPanelProps = {
  onExport: () => string;
  onReset: () => void;
  ratedCount: number;
  watchlistCount: number;
  catalogCount: number;
};

export function SettingsPanel({ onExport, onReset, ratedCount, watchlistCount, catalogCount }: SettingsPanelProps) {
  const shouldReduceMotion = useReducedMotion();

  function handleExport() {
    const blob = new Blob([onExport()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `movie-wizard-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.section className="settings-page" layout transition={softSpring}>
      <motion.div className="settings-page__header" {...fadeSlide(shouldReduceMotion, 12)}>
        <p>Settings</p>
        <h1>Your Movie Wizard data</h1>
        <span>Everything is stored locally in this browser. Export a backup before clearing site data or moving devices.</span>
      </motion.div>

      <motion.div className="settings-grid" layout transition={softSpring}>
        <motion.article className="settings-card settings-card--primary" layout {...fadeSlide(shouldReduceMotion, 10)}>
          <div>
            <Database weight="fill" />
            <h2>Local storage</h2>
            <p>Ratings, watched flags, and watchlist picks stay on this device until you export or clear them.</p>
          </div>
          <div className="settings-card__actions">
            <motion.button
              type="button"
              className="outline-action"
              onClick={handleExport}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={quickSpring}
            >
              <DownloadSimple />
              Export backup
            </motion.button>
            <motion.button
              type="button"
              className="quiet-action"
              onClick={onReset}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={quickSpring}
            >
              <Trash />
              Clear ratings
            </motion.button>
          </div>
        </motion.article>

        <motion.article className="settings-card" layout {...fadeSlide(shouldReduceMotion, 12)}>
          <Star weight="fill" />
          <h2>Rated movies</h2>
          <strong>{ratedCount}</strong>
          <p>Used to tune recommendation weights for genres, tags, directors, and cast.</p>
        </motion.article>

        <motion.article className="settings-card" layout {...fadeSlide(shouldReduceMotion, 14)}>
          <BookmarkSimple weight="fill" />
          <h2>Watchlist</h2>
          <strong>{watchlistCount}</strong>
          <p>Movies you are considering for Plex or future viewing.</p>
        </motion.article>

        <motion.article className="settings-card" layout {...fadeSlide(shouldReduceMotion, 16)}>
          <Database weight="fill" />
          <h2>Catalog</h2>
          <strong>{catalogCount}</strong>
          <p>Static movie records bundled with the app. No server request is needed.</p>
        </motion.article>

        <motion.article className="settings-card settings-card--source" layout {...fadeSlide(shouldReduceMotion, 10)}>
          <Database weight="fill" />
          <h2>Data source</h2>
          <a className="tmdb-attribution" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            <img src={tmdbLogoUrl} alt="The Movie Database (TMDB)" />
          </a>
          <p>This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.</p>
        </motion.article>
      </motion.div>
    </motion.section>
  );
}
