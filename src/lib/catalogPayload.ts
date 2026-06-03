import type { CatalogIndexMovie, CatalogIndexPayload, CatalogManifestPayload, Movie, MovieDetailsPayload } from "@/types";

export function hydrateCatalogMovie(indexMovie: CatalogIndexMovie, detailsPayload: MovieDetailsPayload): Movie {
  const details = detailsPayload.movies[indexMovie.id];
  if (!details) {
    throw new Error(`Missing movie details for ${indexMovie.id}`);
  }

  return {
    id: indexMovie.id,
    tmdbId: indexMovie.tmdbId,
    imdbId: indexMovie.imdbId,
    title: indexMovie.title,
    originalTitle: indexMovie.originalTitle,
    originalLanguage: indexMovie.originalLanguage,
    year: indexMovie.year,
    releaseDate: indexMovie.releaseDate,
    runtimeMinutes: indexMovie.runtimeMinutes,
    genres: indexMovie.genres,
    tags: indexMovie.tags,
    directors: indexMovie.directors,
    cast: indexMovie.cast,
    crew: details.crew,
    posterPath: indexMovie.posterPath,
    backdropPath: indexMovie.backdropPath,
    posterTone: indexMovie.posterTone,
    popularity: indexMovie.popularity,
    criticalScore: indexMovie.criticalScore,
    plexFit: indexMovie.plexFit,
    trailerUrl: indexMovie.trailerUrl,
    source: details.source,
    synopsis: details.synopsis,
  };
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
