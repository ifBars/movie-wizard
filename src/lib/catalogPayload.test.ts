import { describe, expect, test } from "vitest";
import catalogIndexJson from "@/data/generated/catalog-index.json";
import catalogManifestJson from "@/data/generated/catalog-manifest.json";
import movieDetailsJson from "@/data/generated/movie-details.json";
import moviesJson from "@/data/generated/movies.json";
import { hydrateCatalog, validateCatalogManifest } from "@/lib/catalogPayload";
import type { CatalogIndexPayload, CatalogManifestPayload, Movie, MovieDetailsPayload } from "@/types";

const catalogIndex = parseCatalogIndexPayload(catalogIndexJson);
const catalogManifest = parseCatalogManifestPayload(catalogManifestJson);
const movieDetails = parseMovieDetailsPayload(movieDetailsJson);
const fullCatalog: Movie[] = moviesJson;

describe("catalog payload split", () => {
  test("keeps index and detail payloads aligned with the manifest", () => {
    expect(validateCatalogManifest(catalogManifest, catalogIndex, movieDetails)).toBe(true);
  });

  test("hydrates split payloads back to the current movie catalog shape", () => {
    const hydratedCatalog = hydrateCatalog(catalogIndex, movieDetails);

    expect(hydratedCatalog).toHaveLength(fullCatalog.length);
    expect(hydratedCatalog[0]).toEqual(fullCatalog[0]);
  });

  test("keeps detail-only synopsis out of the compact index", () => {
    const monika = catalogIndex.movies.find((movie) => movie.title === "Monika");

    expect(monika?.synopsisPreview.length).toBeLessThanOrEqual(223);
    expect("synopsis" in (monika ?? {})).toBe(false);
    expect(movieDetails.movies["monika-1974"]?.synopsis).toContain("Monika is young");
  });
});

function parseCatalogIndexPayload(payload: Omit<CatalogIndexPayload, "version"> & { version: number }): CatalogIndexPayload {
  if (payload.version !== 1) {
    throw new Error(`Unsupported catalog index version ${payload.version}`);
  }

  return {
    ...payload,
    version: 1,
  };
}

function parseCatalogManifestPayload(payload: {
  version: number;
  generatedAt: string;
  movieCount: number;
  indexFields: string[];
  detailFields: string[];
}): CatalogManifestPayload {
  if (payload.version !== 1) {
    throw new Error(`Unsupported catalog manifest version ${payload.version}`);
  }

  return {
    version: 1,
    generatedAt: payload.generatedAt,
    movieCount: payload.movieCount,
    indexFields: payload.indexFields.filter(isCatalogIndexField),
    detailFields: payload.detailFields.filter(isMovieDetailsField),
  };
}

function parseMovieDetailsPayload(payload: Omit<MovieDetailsPayload, "version"> & { version: number }): MovieDetailsPayload {
  if (payload.version !== 1) {
    throw new Error(`Unsupported movie details version ${payload.version}`);
  }

  return {
    ...payload,
    version: 1,
  };
}

function isCatalogIndexField(field: string): field is CatalogManifestPayload["indexFields"][number] {
  switch (field) {
    case "id":
    case "tmdbId":
    case "imdbId":
    case "title":
    case "originalTitle":
    case "originalLanguage":
    case "year":
    case "releaseDate":
    case "runtimeMinutes":
    case "genres":
    case "tags":
    case "directors":
    case "cast":
    case "posterPath":
    case "backdropPath":
    case "posterTone":
    case "popularity":
    case "criticalScore":
    case "plexFit":
    case "synopsisPreview":
      return true;
    default:
      return false;
  }
}

function isMovieDetailsField(field: string): field is CatalogManifestPayload["detailFields"][number] {
  switch (field) {
    case "id":
    case "crew":
    case "source":
    case "synopsis":
      return true;
    default:
      return false;
  }
}
