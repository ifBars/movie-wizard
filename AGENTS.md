# AGENTS.md

## Project

Movie Wizard is a static React + Tailwind app for rating watched movies, tracking a watchlist, and generating local movie recommendations. It should remain browser-only and avoid backend dependencies unless the user explicitly changes that direction.

## Commands

- Use `bun` for package management and scripts.
- Run `bun run lint` before finishing code changes.
- Run `bun run build` before finishing UI or app changes.
- Do not use `npm`, `pnpm`, or `yarn` in this repo.

## Parallel Agent Workflow

- Multiple agents may work in this repository at the same time.
- Treat unexpected file changes, untracked files, or partial edits as work from another active or previous agent unless there is clear evidence otherwise.
- Do not revert, overwrite, delete, restage, reformat, or "clean up" another agent's work to complete your own task.
- Before editing a file, inspect its current contents and keep your changes narrowly scoped to the user's request.
- If another agent's work overlaps with your task, preserve their changes and adapt around them. Ask the user only when the overlap makes the requested work unsafe or impossible.
- When reporting results, mention any pre-existing or parallel changes you noticed but intentionally left untouched.

## CodeGraph

- This repository has been initialized for CodeGraph. Use CodeGraph tools for codebase orientation, symbol lookup, call tracing, dependency impact checks, and architecture questions before falling back to broad text searches.
- Prefer `codegraph_context` for feature-area orientation, `codegraph_search` for known symbols, `codegraph_trace` for flow questions, and `codegraph_impact` before changing shared code.
- After editing files, remember the CodeGraph index may lag briefly; if CodeGraph reports pending or stale files, read those files directly before making decisions from their contents.

## Architecture

- Keep user data in browser-local storage for now.
- Do not add a server, database, auth provider, or paid hosted service without explicit approval.
- Keep movie catalog data static and bundled with the app unless asked otherwise.
- Prefer small, focused React components over broad rewrites.
- Preserve the existing Vite + React + TypeScript + Tailwind v4 setup.

## UI Direction

- Follow the local brand references:
  - `src/assets/design/movie-wizard-app-mockup.png`
  - `src/assets/design/movie-wizard-brand-kit.png`
  - `docs/brand/movie-wizard-brand-kit.md`
- Save generated images, screenshots, and design artifacts under `.artifacts/` by default unless they are app-consumed assets that must live under `src/assets`.
- The top nav/header should use the MW logo mark only, with no adjacent "Movie Wizard" text.
- Use generated raster logo assets from `src/assets/brand`; do not redraw the logo as SVG.
- Keep the app simple, minimal, and catalog-first, inspired by MovieLens behavior without cloning its old visual style.
- Favor warm stone surfaces, charcoal header, orange actions, and blue rating stars.
- Avoid generic AI UI patterns: purple gradients, glassmorphism, nested cards, decorative blobs, oversized marketing sections, and fake metrics.
- Use compact, smooth product controls: rounded search, row dividers, edge arrows for horizontal rows, and clear settings/account flows.

## Product Rules

- Discovery should stay focused on movie recommendations and rating actions.
- Settings and export/reset controls belong on a settings page, reachable from the user menu.
- Keep future account/export ideas optional and non-blocking; the current implementation is local-first.

## Verification

- For visual work, inspect the app in-browser or with Playwright screenshots after changes.
- Check light and dark mode when editing theme, layout, logo, or surface styles.
- Keep mobile layout usable; no overlapping text or controls.
