import type { Movie } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalCrew(value: unknown): value is Movie["crew"] {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (item) => isRecord(item) && typeof item.name === "string" && typeof item.job === "string",
      ))
  );
}

function isMovie(value: unknown): value is Movie {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.originalLanguage === "string" &&
    typeof value.year === "number" &&
    typeof value.runtimeMinutes === "number" &&
    isStringArray(value.genres) &&
    isStringArray(value.tags) &&
    isStringArray(value.directors) &&
    isStringArray(value.cast) &&
    isOptionalCrew(value.crew) &&
    typeof value.synopsis === "string" &&
    isOptionalString(value.posterPath) &&
    isOptionalString(value.backdropPath) &&
    typeof value.posterTone === "string" &&
    typeof value.popularity === "number" &&
    typeof value.criticalScore === "number" &&
    typeof value.plexFit === "string"
  );
}

export function parseMovieCatalog(value: unknown): Movie[] {
  if (!Array.isArray(value) || !value.every(isMovie)) {
    throw new Error("Movie catalog data is invalid");
  }

  return value;
}
