import type { CatalogIndexMovie, CatalogIndexPayload, CatalogManifestPayload, Movie, MovieDetails, MovieDetailsPayload } from "@/types";

export function createCatalogMovie(indexMovie: CatalogIndexMovie): Movie {
  const { synopsisPreview, ...movie } = indexMovie;

  return {
    ...movie,
    synopsis: synopsisPreview,
  };
}

export function applyMovieDetails(movie: Movie, details: MovieDetails): Movie {
  return {
    ...movie,
    crew: details.crew,
    source: details.source,
    synopsis: details.synopsis,
  };
}

export function hydrateCatalogMovie(indexMovie: CatalogIndexMovie, detailsPayload: MovieDetailsPayload): Movie {
  const details = detailsPayload.movies[indexMovie.id];
  if (!details) {
    throw new Error(`Missing movie details for ${indexMovie.id}`);
  }

  return applyMovieDetails(createCatalogMovie(indexMovie), details);
}

export function hydrateCatalog(indexPayload: CatalogIndexPayload, detailsPayload: MovieDetailsPayload): Movie[] {
  if (indexPayload.version !== 1 || detailsPayload.version !== 1) {
    throw new Error("Unsupported catalog payload version");
  }

  return indexPayload.movies.map((movie) => hydrateCatalogMovie(movie, detailsPayload));
}

export function validateCatalogManifest(manifest: CatalogManifestPayload, indexPayload: CatalogIndexPayload, detailsPayload: MovieDetailsPayload) {
  return (
    manifest.version === 1 &&
    manifest.movieCount === indexPayload.movies.length &&
    manifest.movieCount === Object.keys(detailsPayload.movies).length
  );
}
