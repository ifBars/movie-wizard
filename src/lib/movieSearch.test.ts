import { describe, expect, test } from "vitest";
import generatedMovies from "@/data/generated/movies.json";
import { filterAdultMovies, isAdultMovie } from "@/lib/adultMovies";
import { buildLinearMovieSearchCorpus, buildMovieSearchIndex, linearSearchMovieCorpus, searchMovieIndex } from "@/lib/movieSearch";
import type { Movie } from "@/types";

const realCatalog: Movie[] = generatedMovies;
const benchmarkQueries = [
  "mission impossible",
  "tom cruise",
  "science fiction",
  "animation",
  "batman",
  "2025",
  "quiet",
  "search",
];
const expectedAdultMovieIds = [
  "addicted-2014",
  "all-your-faces-2023",
  "american-pie-1999",
  "anora-2024",
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
  "rape-of-love-1978",
  "red-latex-2020",
  "sex-rider-wet-highway-1971",
  "sound-of-freedom-2023",
  "the-babysitters-2008",
  "the-hunt-2012",
  "the-nice-guys-2016",
  "your-fault-2024",
];

describe("movie search index", () => {
  test("finds real catalog matches from title, people, genre, year, and synopsis fields", () => {
    const index = buildMovieSearchIndex(realCatalog);

    expect(searchMovieIndex(index, "mission impossible").some((movie) => movie.title.toLowerCase().includes("mission"))).toBe(true);
    expect(searchMovieIndex(index, "tom cruise").some((movie) => movie.cast.includes("Tom Cruise"))).toBe(true);
    expect(searchMovieIndex(index, "science fiction").some((movie) => movie.genres.includes("Science Fiction"))).toBe(true);
    expect(searchMovieIndex(index, "2025").some((movie) => movie.year === 2025)).toBe(true);
    expect(searchMovieIndex(index, "quiet").some((movie) => movie.synopsis.toLowerCase().includes("quiet") || movie.tags.includes("quiet"))).toBe(true);
  });

  test("keeps exact title prefix matches near the top", () => {
    const index = buildMovieSearchIndex(realCatalog);
    const results = searchMovieIndex(index, "mission impossible");

    expect(results.slice(0, 5).some((movie) => movie.title.toLowerCase().startsWith("mission"))).toBe(true);
  });

  test("hides adult-tagged movies from search unless enabled", () => {
    const monika = realCatalog.find((movie) => movie.title === "Monika");
    const sexyTaggedMovie = realCatalog.find((movie) => movie.id === "virgin-2024");
    const lesbianSexTaggedMovie = realCatalog.find((movie) => movie.id === "room-in-rome-2010");
    const adultSynopsisMovie = realCatalog.find((movie) => movie.id === "red-latex-2020");
    const adultPosterOverrideMovie = realCatalog.find((movie) => movie.id === "fib-the-truth-2021");
    const adultPosterAndThemeMovie = realCatalog.find((movie) => movie.id === "addicted-2014");
    const sexualViolenceMovie = realCatalog.find((movie) => movie.id === "rape-of-love-1978");
    const explicitTitleMovie = realCatalog.find((movie) => movie.id === "sex-rider-wet-highway-1971");
    const sexWorkMovie = realCatalog.find((movie) => movie.id === "anora-2024");
    const nymphomaniacMovies = realCatalog.filter((movie) => movie.title.toLowerCase().includes("nymphomaniac"));
    const expectedAdultMovies = realCatalog.filter((movie) => expectedAdultMovieIds.includes(movie.id));

    expect(monika).toBeDefined();
    expect(monika ? isAdultMovie(monika) : false).toBe(true);
    expect(sexyTaggedMovie).toBeDefined();
    expect(sexyTaggedMovie ? isAdultMovie(sexyTaggedMovie) : false).toBe(true);
    expect(lesbianSexTaggedMovie).toBeDefined();
    expect(lesbianSexTaggedMovie ? isAdultMovie(lesbianSexTaggedMovie) : false).toBe(true);
    expect(adultSynopsisMovie).toBeDefined();
    expect(adultSynopsisMovie ? isAdultMovie(adultSynopsisMovie) : false).toBe(true);
    expect(adultPosterOverrideMovie).toBeDefined();
    expect(adultPosterOverrideMovie ? isAdultMovie(adultPosterOverrideMovie) : false).toBe(true);
    expect(adultPosterAndThemeMovie).toBeDefined();
    expect(adultPosterAndThemeMovie ? isAdultMovie(adultPosterAndThemeMovie) : false).toBe(true);
    expect(sexualViolenceMovie).toBeDefined();
    expect(sexualViolenceMovie ? isAdultMovie(sexualViolenceMovie) : false).toBe(true);
    expect(explicitTitleMovie).toBeDefined();
    expect(explicitTitleMovie ? isAdultMovie(explicitTitleMovie) : false).toBe(true);
    expect(sexWorkMovie).toBeDefined();
    expect(sexWorkMovie ? isAdultMovie(sexWorkMovie) : false).toBe(true);
    expect(expectedAdultMovies.map((movie) => movie.id).sort()).toEqual(expectedAdultMovieIds.slice().sort());
    expect(expectedAdultMovies.every(isAdultMovie)).toBe(true);
    expect(nymphomaniacMovies.map((movie) => movie.id).sort()).toEqual([
      "diary-of-a-nymphomaniac-2008",
      "nymphomaniac-vol-i-2013",
      "nymphomaniac-vol-ii-2013",
    ]);
    expect(nymphomaniacMovies.every(isAdultMovie)).toBe(true);

    const defaultIndex = buildMovieSearchIndex(filterAdultMovies(realCatalog, false));
    const unrestrictedIndex = buildMovieSearchIndex(filterAdultMovies(realCatalog, true));

    expect(searchMovieIndex(defaultIndex, "Mario").some((movie) => movie.title === "Monika")).toBe(false);
    expect(searchMovieIndex(unrestrictedIndex, "Mario").some((movie) => movie.title === "Monika")).toBe(true);
    expect(searchMovieIndex(defaultIndex, "Red Latex").some((movie) => movie.id === "red-latex-2020")).toBe(false);
    expect(searchMovieIndex(defaultIndex, "Fib the Truth").some((movie) => movie.id === "fib-the-truth-2021")).toBe(false);
    expect(searchMovieIndex(defaultIndex, "Addicted").some((movie) => movie.id === "addicted-2014")).toBe(false);
    expect(searchMovieIndex(defaultIndex, "Rape of Love").some((movie) => movie.id === "rape-of-love-1978")).toBe(false);
    expect(searchMovieIndex(defaultIndex, "Sex Rider").some((movie) => movie.id === "sex-rider-wet-highway-1971")).toBe(false);
    expect(searchMovieIndex(defaultIndex, "Anora").some((movie) => movie.id === "anora-2024")).toBe(false);
    expect(searchMovieIndex(defaultIndex, "Nymphomaniac").some((movie) => movie.title.includes("Nymphomaniac"))).toBe(false);
    expect(searchMovieIndex(unrestrictedIndex, "Nymphomaniac").some((movie) => movie.id === "nymphomaniac-vol-ii-2013")).toBe(true);
  });

  test("does not hide movies for LGBTQ theme tags alone", () => {
    const lgbtqThemeMovie = realCatalog.find((movie) => movie.id === "red-white-and-royal-blue-2023");
    const lesbianThemeMovie = realCatalog.find((movie) => movie.id === "a-perfect-ending-2012");
    const nonAdultMistressMovie = realCatalog.find((movie) => movie.id === "rebecca-1940");
    const nonAdultBrothelMovie = realCatalog.find((movie) => movie.id === "red-beard-1965");
    const nonAdultProstitutePlotMovie = realCatalog.find((movie) => movie.id === "unforgiven-1992");
    const nonAdultSkyscraperMovie = realCatalog.find((movie) => movie.id === "paperman-2012");
    const nonAdultDreamsMovie = realCatalog.find((movie) => movie.id === "la-la-land-2016");
    const nonAdultChildAbuseMovie = realCatalog.find((movie) => movie.id === "the-shining-1980");
    const nonAdultTeenTitleMovie = realCatalog.find((movie) => movie.id === "teen-titans-trouble-in-tokyo-2006");
    const nonAdultNakedTitleMovie = realCatalog.find((movie) => movie.id === "the-naked-gun-2025");

    expect(lgbtqThemeMovie).toBeDefined();
    expect(lgbtqThemeMovie ? isAdultMovie(lgbtqThemeMovie) : true).toBe(false);
    expect(lesbianThemeMovie).toBeDefined();
    expect(lesbianThemeMovie ? isAdultMovie(lesbianThemeMovie) : true).toBe(false);
    expect(nonAdultMistressMovie).toBeDefined();
    expect(nonAdultMistressMovie ? isAdultMovie(nonAdultMistressMovie) : true).toBe(false);
    expect(nonAdultBrothelMovie).toBeDefined();
    expect(nonAdultBrothelMovie ? isAdultMovie(nonAdultBrothelMovie) : true).toBe(false);
    expect(nonAdultProstitutePlotMovie).toBeDefined();
    expect(nonAdultProstitutePlotMovie ? isAdultMovie(nonAdultProstitutePlotMovie) : true).toBe(false);
    expect(nonAdultSkyscraperMovie).toBeDefined();
    expect(nonAdultSkyscraperMovie ? isAdultMovie(nonAdultSkyscraperMovie) : true).toBe(false);
    expect(nonAdultDreamsMovie).toBeDefined();
    expect(nonAdultDreamsMovie ? isAdultMovie(nonAdultDreamsMovie) : true).toBe(false);
    expect(nonAdultChildAbuseMovie).toBeDefined();
    expect(nonAdultChildAbuseMovie ? isAdultMovie(nonAdultChildAbuseMovie) : true).toBe(false);
    expect(nonAdultTeenTitleMovie).toBeDefined();
    expect(nonAdultTeenTitleMovie ? isAdultMovie(nonAdultTeenTitleMovie) : true).toBe(false);
    expect(nonAdultNakedTitleMovie).toBeDefined();
    expect(nonAdultNakedTitleMovie ? isAdultMovie(nonAdultNakedTitleMovie) : true).toBe(false);
  });

  test("searches the real catalog faster than a full string scan", () => {
    const index = buildMovieSearchIndex(realCatalog);
    const linearCorpus = buildLinearMovieSearchCorpus(realCatalog);
    const iterations = 80;

    const linearMs = medianTimedRun(iterations, () => {
      for (const query of benchmarkQueries) {
        linearSearchMovieCorpus(linearCorpus, query);
      }
    });
    const indexedMs = medianTimedRun(iterations, () => {
      for (const query of benchmarkQueries) {
        searchMovieIndex(index, query);
      }
    });

    console.info(
      [
        `movie search benchmark: ${realCatalog.length} movies`,
        `linear=${linearMs.toFixed(3)}ms`,
        `indexed=${indexedMs.toFixed(3)}ms`,
        `speedup=${(linearMs / indexedMs).toFixed(1)}x`,
      ].join(" | "),
    );

    expect(indexedMs).toBeLessThan(linearMs);
  });
});

function medianTimedRun(iterations: number, run: () => void) {
  const samples = Array.from({ length: iterations }, () => {
    const startedAt = performance.now();
    run();
    return performance.now() - startedAt;
  }).sort((a, b) => a - b);

  return samples[Math.floor(samples.length / 2)];
}
