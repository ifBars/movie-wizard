import { describe, expect, test } from "vitest";
import generatedMovies from "@/data/generated/movies.json";
import { filterCatalogMovies } from "@/lib/catalogFilters";
import { filterMoviesByLanguage, normalizeLanguageCodes } from "@/lib/languagePreferences";
import type { LibrarySettings, Movie } from "@/types";

const realCatalog: Movie[] = generatedMovies;

describe("language preferences", () => {
  test("defaults invalid or empty language selections to English", () => {
    expect(normalizeLanguageCodes([])).toEqual(["en"]);
    expect(normalizeLanguageCodes(["unknown"])).toEqual(["en"]);
    expect(normalizeLanguageCodes(["EN", "en"])).toEqual(["en"]);
  });

  test("filters the catalog to English movies by default", () => {
    const englishMovies = filterMoviesByLanguage(realCatalog, ["en"]);

    expect(englishMovies.length).toBeLessThan(realCatalog.length);
    expect(englishMovies.every((movie) => movie.originalLanguage === "en")).toBe(true);
  });

  test("allows additional selected languages through the catalog filter", () => {
    const hindiMovie = realCatalog.find((movie) => movie.originalLanguage === "hi");
    const defaultSettings: LibrarySettings = { languageCodes: ["en"], showAdultMovies: false };
    const expandedSettings: LibrarySettings = { languageCodes: ["en", "hi"], showAdultMovies: false };

    expect(hindiMovie).toBeDefined();
    expect(filterCatalogMovies(realCatalog, defaultSettings).some((movie) => movie.id === hindiMovie?.id)).toBe(false);
    expect(filterCatalogMovies(realCatalog, expandedSettings).some((movie) => movie.id === hindiMovie?.id)).toBe(true);
  });
});
