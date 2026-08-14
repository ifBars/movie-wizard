import type { Movie } from "@/types";

type IndexedMovie = {
  movie: Movie;
  searchableText: string;
};

type Posting = {
  movieIndex: number;
  score: number;
};

export type LinearMovieSearchCorpus = Array<{
  movie: Movie;
  text: string;
}>;

export type MovieSearchIndex = {
  movies: Movie[];
  indexedMovies: IndexedMovie[];
  terms: Map<string, Posting[]>;
};

type WeightedText = {
  value: string;
  weight: number;
};

const MAX_PREFIX_LENGTH = 24;

export function buildMovieSearchIndex(movies: Movie[]): MovieSearchIndex {
  const indexedMovies = movies.map((movie) => ({
    movie,
    searchableText: getSearchableMovieText(movie),
  }));
  const termScores = new Map<string, Map<number, number>>();

  movies.forEach((movie, movieIndex) => {
    for (const field of getWeightedSearchFields(movie)) {
      for (const token of tokenizeSearchText(field.value)) {
        for (const prefix of getTokenPrefixes(token)) {
          const postings = getOrCreateTermScores(termScores, prefix);
          postings.set(movieIndex, Math.max(postings.get(movieIndex) ?? 0, field.weight + getPrefixBonus(prefix, token)));
        }
      }
    }
  });

  return {
    movies,
    indexedMovies,
    terms: new Map(
      [...termScores].map(([term, scores]) => [
        term,
        [...scores].map(([movieIndex, score]) => ({ movieIndex, score })),
      ]),
    ),
  };
}

export function searchMovieIndex(index: MovieSearchIndex, search: string): Movie[] {
  const query = normalizeSearchText(search);
  const tokens = tokenizeSearchText(query);
  if (tokens.length === 0) {
    return index.movies.slice(0, 12);
  }

  const candidateScores = new Map<number, { score: number; matches: number }>();

  for (const token of tokens) {
    const postings = index.terms.get(token);
    if (!postings) {
      return [];
    }

    for (const posting of postings) {
      const current = candidateScores.get(posting.movieIndex) ?? { score: 0, matches: 0 };
      candidateScores.set(posting.movieIndex, {
        score: current.score + posting.score,
        matches: current.matches + 1,
      });
    }
  }

  return [...candidateScores]
    .filter(([, candidate]) => candidate.matches === tokens.length)
    .map(([movieIndex, candidate]) => ({
      movie: index.movies[movieIndex],
      score: candidate.score + getPhraseBonus(index.indexedMovies[movieIndex], query),
    }))
    .sort((a, b) => b.score - a.score || b.movie.popularity - a.movie.popularity || b.movie.criticalScore - a.movie.criticalScore || b.movie.year - a.movie.year)
    .map((result) => result.movie);
}

export function linearSearchMovies(movies: Movie[], search: string): Movie[] {
  return linearSearchMovieCorpus(buildLinearMovieSearchCorpus(movies), search);
}

export function buildLinearMovieSearchCorpus(movies: Movie[]): LinearMovieSearchCorpus {
  return movies.map((movie) => ({
    movie,
    text: getSearchableMovieText(movie),
  }));
}

export function linearSearchMovieCorpus(corpus: LinearMovieSearchCorpus, search: string): Movie[] {
  const term = normalizeSearchText(search);
  if (!term) {
    return corpus.slice(0, 12).map((entry) => entry.movie);
  }

  return corpus.filter((entry) => entry.text.includes(term)).map((entry) => entry.movie);
}

function getWeightedSearchFields(movie: Movie): WeightedText[] {
  return [
    { value: movie.title, weight: 24 },
    { value: movie.originalTitle ?? "", weight: 20 },
    { value: movie.year.toString(), weight: 18 },
    { value: movie.genres.join(" "), weight: 12 },
    { value: movie.directors.join(" "), weight: 10 },
    { value: movie.cast.join(" "), weight: 8 },
    { value: movie.tags.join(" "), weight: 6 },
    { value: movie.synopsis, weight: 3 },
  ];
}

export function getSearchableMovieText(movie: Movie, includeSynopsis = true): string {
  return normalizeSearchText(
    [
      movie.title,
      movie.originalTitle,
      movie.year.toString(),
      ...movie.genres,
      ...movie.tags,
      ...movie.directors,
      ...movie.cast,
      includeSynopsis ? movie.synopsis : undefined,
    ]
      .filter((value) => value)
      .join(" "),
  );
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

function getTokenPrefixes(token: string): string[] {
  const maxLength = Math.min(token.length, MAX_PREFIX_LENGTH);
  const prefixes: string[] = [];

  for (let length = 1; length <= maxLength; length += 1) {
    prefixes.push(token.slice(0, length));
  }

  return prefixes;
}

function getPrefixBonus(prefix: string, token: string): number {
  return prefix === token ? 6 : Math.min(prefix.length, 8);
}

function getPhraseBonus(indexedMovie: IndexedMovie, query: string): number {
  if (indexedMovie.searchableText.startsWith(query)) {
    return 40;
  }

  if (indexedMovie.searchableText.includes(query)) {
    return 18;
  }

  return 0;
}

function getOrCreateTermScores(termScores: Map<string, Map<number, number>>, term: string) {
  const current = termScores.get(term);
  if (current) {
    return current;
  }

  const created = new Map<number, number>();
  termScores.set(term, created);
  return created;
}
