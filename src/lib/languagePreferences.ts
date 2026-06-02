import type { Movie } from "@/types";

export const defaultLanguageCodes = ["en"];

export const supportedLanguages = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "it", label: "Italian" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "sv", label: "Swedish" },
] satisfies Array<{ code: string; label: string }>;

export function normalizeLanguageCodes(codes: readonly string[]) {
  const supportedCodes = new Set(supportedLanguages.map((language) => language.code));
  const normalized = codes
    .map((code) => code.trim().toLowerCase())
    .filter((code) => supportedCodes.has(code));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : defaultLanguageCodes;
}

export function filterMoviesByLanguage(movies: Movie[], languageCodes: readonly string[]) {
  const allowedLanguages = new Set(normalizeLanguageCodes(languageCodes));
  return movies.filter((movie) => allowedLanguages.has(movie.originalLanguage));
}

export function countMoviesHiddenByLanguage(movies: Movie[], languageCodes: readonly string[]) {
  return movies.length - filterMoviesByLanguage(movies, languageCodes).length;
}
