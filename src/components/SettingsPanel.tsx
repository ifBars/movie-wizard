import {
  CalendarBlank,
  CheckCircle,
  Database,
  DownloadSimple,
  EyeSlash,
  FilmSlate,
  Funnel,
  GlobeHemisphereWest,
  HardDrives,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { ThemeMode } from "@/hooks/useThemeMode";
import { supportedLanguages } from "@/lib/languagePreferences";
import { fadeSlide, quickSpring, softSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const tmdbLogoUrl =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

type SettingsPanelProps = {
  onExport: () => string;
  onImport: (rawJson: string) => boolean;
  onReset: () => void;
  ratedCount: number;
  watchlistCount: number;
  catalogCount: number;
  totalCatalogCount: number;
  hiddenAdultMovieCount: number;
  hiddenLanguageMovieCount: number;
  languageCodes: string[];
  minimumRecommendationYear: number | null;
  showAdultMovies: boolean;
  themeMode: ThemeMode;
  onLanguageCodesChange: (languageCodes: string[]) => void;
  onMinimumRecommendationYearChange: (minimumRecommendationYear: number | null) => void;
  onShowAdultMoviesChange: (showAdultMovies: boolean) => void;
  onThemeModeChange: (themeMode: ThemeMode) => void;
};

type SettingsRowProps = {
  icon: Icon;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
};

function SettingsRow({ children, description, icon: IconComponent, title, tone = "default" }: SettingsRowProps) {
  return (
    <div className={cn("settings-row", tone === "danger" && "settings-row--danger")}>
      <span className="settings-row__icon" aria-hidden="true">
        <IconComponent weight="bold" />
      </span>
      <div className="settings-row__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

export function SettingsPanel({
  onExport,
  onImport,
  onReset,
  ratedCount,
  watchlistCount,
  catalogCount,
  totalCatalogCount,
  hiddenAdultMovieCount,
  hiddenLanguageMovieCount,
  languageCodes,
  minimumRecommendationYear,
  showAdultMovies,
  themeMode,
  onLanguageCodesChange,
  onMinimumRecommendationYearChange,
  onShowAdultMoviesChange,
  onThemeModeChange,
}: SettingsPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const hiddenTitleCount = hiddenAdultMovieCount + hiddenLanguageMovieCount;
  const selectedLanguageLabels = supportedLanguages
    .filter((language) => languageCodes.includes(language.code))
    .map((language) => language.label);
  const languageSummary = selectedLanguageLabels.length === 1 ? selectedLanguageLabels[0] : `${selectedLanguageLabels.length} languages`;
  const backupItems = ["Ratings and watched history", "Watchlist", "Recommendation weights", "Catalog filter preferences"];

  function handleExport() {
    const blob = new Blob([onExport()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `movie-wizard-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    importInputRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    try {
      const didImport = onImport(await file.text());
      setImportStatus(didImport ? "success" : "error");
    } catch {
      setImportStatus("error");
    }
  }

  function handleReset() {
    const shouldReset = window.confirm("Clear ratings, watched flags, ignored movies, and watchlist picks from this browser?");

    if (shouldReset) {
      onReset();
    }
  }

  function toggleLanguage(languageCode: string) {
    const isSelected = languageCodes.includes(languageCode);

    if (isSelected && languageCodes.length === 1) {
      return;
    }

    const nextLanguageCodes = isSelected
      ? languageCodes.filter((code) => code !== languageCode)
      : [...languageCodes, languageCode];

    onLanguageCodesChange(nextLanguageCodes);
  }

  function commitMinimumRecommendationYear(value: string) {
    if (value.trim() === "") {
      onMinimumRecommendationYearChange(null);
      return;
    }

    const parsedYear = Number(value);
    if (Number.isInteger(parsedYear) && parsedYear > 0) {
      onMinimumRecommendationYearChange(parsedYear);
    }
  }

  return (
    <motion.section className="settings-page" layout transition={softSpring}>
      <motion.div className="settings-page__header" {...fadeSlide(shouldReduceMotion, 12)}>
        <p>Settings</p>
        <h1>Your Movie Wizard data</h1>
        <span>Everything stays local in this browser. Export a backup before clearing site data or moving devices.</span>
      </motion.div>

      <motion.div className="settings-overview" layout {...fadeSlide(shouldReduceMotion, 10)}>
        <div className="settings-overview__status">
          <span aria-hidden="true">
            <ShieldCheck weight="fill" />
          </span>
          <div>
            <h2>Local and private</h2>
            <p>No account, no sync, no server copy. Your ratings only live in this browser.</p>
          </div>
        </div>
        <dl className="settings-overview__stats" aria-label="Movie Wizard data summary">
          <div>
            <dt>Rated</dt>
            <dd>{ratedCount}</dd>
          </div>
          <div>
            <dt>Watchlist</dt>
            <dd>{watchlistCount}</dd>
          </div>
          <div>
            <dt>Catalog</dt>
            <dd>{catalogCount}</dd>
          </div>
          <div>
            <dt>Hidden</dt>
            <dd>{hiddenTitleCount}</dd>
          </div>
        </dl>
      </motion.div>

      <motion.div className="settings-layout" layout transition={softSpring}>
        <div className="settings-stack">
          <motion.section className="settings-section" layout {...fadeSlide(shouldReduceMotion, 12)}>
            <div className="settings-section__heading">
              <HardDrives weight="fill" />
              <h2>Local storage</h2>
            </div>
            <SettingsRow
              icon={DownloadSimple}
              title="Export backup"
              description="Download a JSON file with ratings, watchlist picks, watched flags, and preferences."
            >
              <motion.button
                type="button"
                className="settings-action settings-action--primary"
                onClick={handleExport}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                transition={quickSpring}
              >
                <DownloadSimple weight="bold" />
                Export backup
              </motion.button>
            </SettingsRow>
            <SettingsRow
              icon={UploadSimple}
              title="Import backup"
              description="Restore ratings, watchlist picks, watched flags, and preferences from an exported JSON file."
            >
              <div className="settings-import-control">
                <input
                  ref={importInputRef}
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                />
                <motion.button
                  type="button"
                  className="settings-action"
                  onClick={handleImportClick}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  transition={quickSpring}
                >
                  <UploadSimple weight="bold" />
                  Import backup
                </motion.button>
                {importStatus !== "idle" ? (
                  <p className={cn("settings-import-status", importStatus === "error" && "settings-import-status--error")} aria-live="polite">
                    {importStatus === "success" ? "Backup imported." : "Choose a valid Movie Wizard export."}
                  </p>
                ) : null}
              </div>
            </SettingsRow>
            <SettingsRow
              icon={Trash}
              title="Clear movie activity"
              description="Remove ratings, watched flags, ignored titles, and watchlist picks. Preferences remain."
              tone="danger"
            >
              <motion.button
                type="button"
                className="settings-action settings-action--danger"
                onClick={handleReset}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                transition={quickSpring}
              >
                <Trash weight="bold" />
                Clear activity
              </motion.button>
            </SettingsRow>
          </motion.section>

          <motion.section className="settings-section" layout {...fadeSlide(shouldReduceMotion, 14)}>
            <div className="settings-section__heading">
              <SlidersHorizontal weight="fill" />
              <h2>Recommendations</h2>
            </div>
            <SettingsRow
              icon={CalendarBlank}
              title="Minimum movie year"
              description="Only recommend movies released from this year onward. Leave blank for any year."
            >
              <label className="settings-year-input">
                <span className="sr-only">Minimum movie year</span>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="Any year"
                  defaultValue={minimumRecommendationYear ?? ""}
                  onBlur={(event) => commitMinimumRecommendationYear(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitMinimumRecommendationYear(event.currentTarget.value);
                    }
                  }}
                />
              </label>
            </SettingsRow>
            <SettingsRow
              icon={EyeSlash}
              title="Hide adult-tagged movies"
              description={`${hiddenAdultMovieCount} titles are currently excluded by this safeguard.`}
            >
              <motion.button
                type="button"
                className="settings-switch"
                role="switch"
                aria-checked={!showAdultMovies}
                onClick={() => onShowAdultMoviesChange(!showAdultMovies)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                transition={quickSpring}
              >
                <span>{showAdultMovies ? "Shown" : "Hidden"}</span>
                <i aria-hidden="true" />
              </motion.button>
            </SettingsRow>
            <div className="settings-language-block">
              <div className="settings-language-block__header">
                <span aria-hidden="true">
                  <GlobeHemisphereWest weight="bold" />
                </span>
                <div>
                  <h3>Language filter</h3>
                  <p>
                    Showing {languageSummary}. {hiddenLanguageMovieCount} titles are hidden by language.
                  </p>
                </div>
              </div>
              <div className="settings-language-grid" role="group" aria-label="Movie language filters">
                {supportedLanguages.map((language) => {
                  const isSelected = languageCodes.includes(language.code);
                  const isOnlySelectedLanguage = isSelected && languageCodes.length === 1;

                  return (
                    <motion.button
                      key={language.code}
                      type="button"
                      className={cn(isSelected && "is-selected")}
                      aria-pressed={isSelected}
                      aria-disabled={isOnlySelectedLanguage}
                      onClick={() => toggleLanguage(language.code)}
                      whileTap={shouldReduceMotion || isOnlySelectedLanguage ? undefined : { scale: 0.96 }}
                      transition={quickSpring}
                    >
                      {language.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          <motion.section className="settings-section" layout {...fadeSlide(shouldReduceMotion, 16)}>
            <div className="settings-section__heading">
              <Sun weight="fill" />
              <h2>Display</h2>
            </div>
            <SettingsRow icon={Moon} title="Theme" description="Choose the app theme for this browser.">
              <div className="settings-theme-segment" role="group" aria-label="Theme">
                {(["light", "dark"] satisfies ThemeMode[]).map((mode) => (
                  <motion.button
                    key={mode}
                    type="button"
                    className={cn(themeMode === mode && "is-selected")}
                    aria-pressed={themeMode === mode}
                    onClick={() => onThemeModeChange(mode)}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                    transition={quickSpring}
                  >
                    {mode === "light" ? <Sun weight="bold" /> : <Moon weight="bold" />}
                    {mode === "light" ? "Light" : "Dark"}
                  </motion.button>
                ))}
              </div>
            </SettingsRow>
          </motion.section>
        </div>

        <aside className="settings-rail" aria-label="Settings notes">
          <motion.section className="settings-rail-card" layout {...fadeSlide(shouldReduceMotion, 14)}>
            <div className="settings-rail-card__heading">
              <Database weight="fill" />
              <h2>Backup includes</h2>
            </div>
            <ul className="settings-check-list">
              {backupItems.map((item) => (
                <li key={item}>
                  <CheckCircle weight="fill" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section className="settings-rail-card" layout {...fadeSlide(shouldReduceMotion, 16)}>
            <div className="settings-rail-card__heading">
              <Funnel weight="fill" />
              <h2>Catalog filters</h2>
            </div>
            <dl className="settings-mini-stats">
              <div>
                <dt>Total catalog</dt>
                <dd>{totalCatalogCount}</dd>
              </div>
              <div>
                <dt>Visible now</dt>
                <dd>{catalogCount}</dd>
              </div>
              <div>
                <dt>Hidden by filters</dt>
                <dd>{hiddenTitleCount}</dd>
              </div>
            </dl>
          </motion.section>

          <motion.section className="settings-rail-card settings-rail-card--source" layout {...fadeSlide(shouldReduceMotion, 18)}>
            <div className="settings-rail-card__heading">
              <FilmSlate weight="fill" />
              <h2>Data source</h2>
            </div>
            <a className="tmdb-attribution" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
              <img src={tmdbLogoUrl} alt="The Movie Database (TMDB)" />
            </a>
            <p>This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.</p>
          </motion.section>

          <motion.section className="settings-rail-card settings-rail-card--warning" layout {...fadeSlide(shouldReduceMotion, 20)}>
            <Warning weight="fill" />
            <p>Clearing browser site data also removes your Movie Wizard library. Export first if you want a backup.</p>
          </motion.section>
        </aside>
      </motion.div>
    </motion.section>
  );
}
