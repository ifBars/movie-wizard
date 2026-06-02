import type { Movie } from "@/types";

const adultMovieIds = new Set([
  "addicted-2014",
  "all-your-faces-2023",
  "american-pie-1999",
  "below-her-mouth-2017",
  "bingo-the-king-of-the-mornings-2017",
  "dime-lo-que-quieres-de-verdad-2023",
  "fib-the-truth-2021",
  "gabriel-s-inferno-2020",
  "gabriel-s-inferno-part-ii-2020",
  "gabriel-s-inferno-part-iii-2020",
  "girl-in-the-basement-2021",
  "how-to-have-sex-2023",
  "last-tango-in-paris-1972",
  "le-clitoris-2017",
  "lolita-1997",
  "malena-2000",
  "my-fault-london-2025",
  "obsessed-2014",
  "our-fault-2025",
  "perras-2011",
  "sex-rider-wet-highway-1971",
  "sound-of-freedom-2023",
  "the-babysitters-2008",
  "the-hunt-2012",
  "the-nice-guys-2016",
  "your-fault-2024",
]);

const adultMovieTags = new Set([
  "adult film",
  "adult filmmaking",
  "adult films",
  "bdsm",
  "bondage",
  "erotic movie",
  "erotic romance",
  "erotic thriller",
  "eroticism",
  "erotica",
  "fetish",
  "lesbian sex",
  "masochism",
  "nymphomaniac",
  "nymphomania",
  "porn",
  "porn actor",
  "porn actress",
  "porn industry",
  "pornographic video",
  "pornography",
  "prostitution",
  "pedophilia",
  "psychosexual",
  "rape",
  "sadomasochism",
  "sensual",
  "sex",
  "sex addiction",
  "sex shop",
  "sex therapy",
  "sex worker",
  "sexploitation",
  "sexual attraction",
  "sexual assault",
  "sexual abuse",
  "sexual exploration",
  "sexual obsession",
  "sexual promiscuity",
  "sexual sadism",
  "sexual violence",
  "sexuality",
  "sexy",
  "softcore",
  "stepmother stepson sex",
  "strip club",
  "underage sex",
  "unsimulated sex",
  "whip",
]);

const adultTextSignals = [
  { pattern: /\bdominatrix\b/i, weight: 4 },
  { pattern: /\bdomina\b/i, weight: 4 },
  { pattern: /\bbdsm\b/i, weight: 4 },
  { pattern: /\bfetish\b/i, weight: 3 },
  { pattern: /\berotic\b/i, weight: 3 },
  { pattern: /\berotic romance\b/i, weight: 5 },
  { pattern: /\bsoftcore\b/i, weight: 4 },
  { pattern: /\bporn(?:ography|ographic)?\b/i, weight: 4 },
  { pattern: /\bporn studios?\b/i, weight: 5 },
  { pattern: /\bsexploitation\b/i, weight: 4 },
  { pattern: /\bnymphomaniac\b/i, weight: 5 },
  { pattern: /\bnymphomania\b/i, weight: 5 },
  { pattern: /\brape(?:d|s)?\b/i, weight: 5 },
  { pattern: /\bsexual assault\b/i, weight: 5 },
  { pattern: /\bsexual abuse\b/i, weight: 5 },
  { pattern: /\bpedophilia\b/i, weight: 5 },
  { pattern: /\bsex worker\b/i, weight: 5 },
  { pattern: /\bstrip club\b/i, weight: 5 },
  { pattern: /\bmistress\b/i, weight: 2 },
  { pattern: /\bslave(?:ry)?\b/i, weight: 2 },
  { pattern: /\bsubmit(?:s|ting|ted)?\b/i, weight: 2 },
  { pattern: /\bsexual\b/i, weight: 2 },
  { pattern: /\blatex\b/i, weight: 2 },
];

const adultTextThreshold = 5;

export function isAdultMovie(movie: Movie) {
  return adultMovieIds.has(movie.id) || hasAdultTags(movie) || hasAdultTextSignals(movie);
}

export function filterAdultMovies(movies: Movie[], showAdultMovies: boolean) {
  return showAdultMovies ? movies : movies.filter((movie) => !isAdultMovie(movie));
}

function hasAdultTags(movie: Movie) {
  return movie.tags.some((tag) => adultMovieTags.has(tag.toLowerCase()));
}

function hasAdultTextSignals(movie: Movie) {
  const text = [movie.title, movie.originalTitle, movie.synopsis, movie.plexFit].filter(Boolean).join(" ");
  const score = adultTextSignals.reduce((total, signal) => total + (signal.pattern.test(text) ? signal.weight : 0), 0);

  return score >= adultTextThreshold;
}
