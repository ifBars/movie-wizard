import {
  BookmarkSimple,
  CaretDown,
  ClockCounterClockwise,
  GearSix,
  MagnifyingGlass,
  Moon,
  Star,
  Sun,
  UserCircle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Link, NavLink } from "react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { ProfileSummary } from "@/components/ProfileSummary";
import { useExternalSyncEffect } from "@/hooks/useExternalSyncEffect";
import { views, type ViewId, viewPath } from "@/lib/navigation";
import { fadeScale, quickSpring, smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { TasteProfile } from "@/types";

type AppHeaderProps = {
  activeView: ViewId;
  isDetailView: boolean;
  search: string;
  ratingLabel: string;
  themeMode: "light" | "dark";
  profile: TasteProfile;
  historyCount: number;
  watchlistCount: number;
  catalogCount: number;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
};

export function AppHeader({
  activeView,
  isDetailView,
  search,
  ratingLabel,
  themeMode,
  profile,
  historyCount,
  watchlistCount,
  catalogCount,
  onSearchChange,
  onToggleTheme,
}: AppHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTasteProfileOpen, setIsTasteProfileOpen] = useState(false);
  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const topbarY = isHiddenOnScroll ? "-101%" : "0%";

  useExternalSyncEffect(() => {
    const compactHeaderQuery = window.matchMedia("(max-width: 740px)");
    let lastScrollY = window.scrollY;

    function updateHeaderVisibility() {
      if (!compactHeaderQuery.matches || isUserMenuOpen || isTasteProfileOpen) {
        setIsHiddenOnScroll(false);
        lastScrollY = window.scrollY;
        return;
      }

      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      if (currentScrollY < 32) {
        setIsHiddenOnScroll(false);
      } else if (scrollDelta > 8) {
        setIsHiddenOnScroll(true);
      } else if (scrollDelta < -8) {
        setIsHiddenOnScroll(false);
      }

      lastScrollY = currentScrollY;
    }

    function handleViewportChange() {
      setIsHiddenOnScroll(false);
      lastScrollY = window.scrollY;
    }

    updateHeaderVisibility();
    window.addEventListener("scroll", updateHeaderVisibility, { passive: true });
    compactHeaderQuery.addEventListener("change", handleViewportChange);

    return () => {
      window.removeEventListener("scroll", updateHeaderVisibility);
      compactHeaderQuery.removeEventListener("change", handleViewportChange);
    };
  }, [isTasteProfileOpen, isUserMenuOpen]);

  function closeMenusAfterNavigation() {
    setIsUserMenuOpen(false);
    setIsTasteProfileOpen(false);
  }

  return (
    <motion.header
      className={cn("topbar", isHiddenOnScroll && "topbar--hidden")}
      initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: topbarY }}
      transition={{ duration: 0.28, ease: smoothEase }}
    >
      <Link className="wordmark" to="/" aria-label="Movie Wizard home">
        <BrandLogo variant="mark" />
      </Link>

      <nav className="main-nav" aria-label="Primary navigation">
        {views.map((view) => (
          <motion.span
            key={view.id}
            layout
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            transition={quickSpring}
          >
            <NavLink to={view.path} className={({ isActive }) => cn(!isDetailView && isActive && activeView === view.id && "is-active")}>
              {view.label}
            </NavLink>
          </motion.span>
        ))}
      </nav>

      <label className="search-box">
        <MagnifyingGlass />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search movies, actors, directors..."
        />
      </label>

      <div className="topbar-actions">
        <motion.button
          type="button"
          className="theme-chip"
          onClick={onToggleTheme}
          aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
          transition={quickSpring}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={themeMode}
              className="motion-icon-slot"
              initial={{ opacity: 0, rotate: shouldReduceMotion ? 0 : -18 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: shouldReduceMotion ? 0 : 18 }}
              transition={{ duration: 0.18, ease: smoothEase }}
            >
              {themeMode === "light" ? <Moon weight="fill" /> : <Sun weight="fill" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <div className="rating-menu">
          <motion.button
            type="button"
            className={cn("rating-chip", isTasteProfileOpen && "is-open")}
            aria-label={`Average rating ${ratingLabel}. Toggle taste profile.`}
            aria-expanded={isTasteProfileOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setIsTasteProfileOpen((isOpen) => !isOpen);
              setIsUserMenuOpen(false);
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            transition={quickSpring}
          >
            <Star weight="fill" />
            <span>{ratingLabel}</span>
            <motion.span
              className="motion-icon-slot"
              animate={{ rotate: isTasteProfileOpen && !shouldReduceMotion ? 180 : 0 }}
              transition={quickSpring}
            >
              <CaretDown />
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {isTasteProfileOpen ? (
              <motion.div
                className="taste-profile-popover"
                role="dialog"
                aria-label="Taste profile"
                {...fadeScale(shouldReduceMotion)}
                style={{ originX: 1, originY: 0 }}
              >
                <ProfileSummary
                  profile={profile}
                  watchlistCount={watchlistCount}
                  catalogCount={catalogCount}
                  className="taste-panel--dropdown"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="user-menu">
          <motion.button
            type="button"
            className={cn("user-chip", isUserMenuOpen && "is-open")}
            aria-label="User menu"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setIsUserMenuOpen((isOpen) => !isOpen);
              setIsTasteProfileOpen(false);
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            transition={quickSpring}
          >
            <UserCircle weight="fill" />
            <span>You</span>
            <motion.span
              className="motion-icon-slot"
              animate={{ rotate: isUserMenuOpen && !shouldReduceMotion ? 180 : 0 }}
              transition={quickSpring}
            >
              <CaretDown />
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {isUserMenuOpen ? (
              <motion.div
                className="user-menu__panel"
                role="menu"
                {...fadeScale(shouldReduceMotion)}
                style={{ originX: 1, originY: 0 }}
              >
                <Link role="menuitem" to={viewPath("watchlist")} onClick={closeMenusAfterNavigation}>
                  <BookmarkSimple />
                  <span>Watchlist</span>
                  <strong>{watchlistCount}</strong>
                </Link>
                <Link role="menuitem" to={viewPath("history")} onClick={closeMenusAfterNavigation}>
                  <ClockCounterClockwise />
                  <span>History</span>
                  <strong>{historyCount}</strong>
                </Link>
                <Link role="menuitem" to={viewPath("settings")} onClick={closeMenusAfterNavigation}>
                  <GearSix />
                  <span>Settings</span>
                </Link>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
