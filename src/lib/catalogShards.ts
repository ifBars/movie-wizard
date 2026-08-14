export const movieDetailShardCount = 64;
export const movieCatalogShardCount = 256;

function getMovieShard(movieId: string, shardCount: number) {
  let hash = 2_166_136_261;

  for (let index = 0; index < movieId.length; index += 1) {
    hash ^= movieId.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0) % shardCount;
}

export function getMovieDetailShard(movieId: string) {
  return getMovieShard(movieId, movieDetailShardCount);
}

export function getMovieDetailShardFileName(movieId: string) {
  return `${getMovieDetailShard(movieId).toString().padStart(2, "0")}.json`;
}

export function getMovieCatalogShard(movieId: string) {
  return getMovieShard(movieId, movieCatalogShardCount);
}

export function getMovieCatalogShardFileName(movieId: string) {
  return `${getMovieCatalogShard(movieId).toString().padStart(3, "0")}.json`;
}
