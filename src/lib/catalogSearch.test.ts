import { describe, expect, test } from "vitest";
import { searchCatalogEntries } from "@/lib/catalogSearch";
import type { CatalogSearchEntry } from "@/types";

const entries: CatalogSearchEntry[] = [
  ["arrival-2016", "arrival 2016 science fiction amy adams", "en", 0, 2016, 116, "drama|science fiction", 94, 80],
  ["parasite-2019", "parasite 2019 thriller bong joon ho", "ko", 0, 2019, 133, "drama|thriller", 96, 90],
  ["adult-result", "arrival parody", "en", 1, 2022, 84, "comedy", 30, 4],
  ["saved-result", "arrival adjacent", "en", 0, 2024, 102, "science fiction", 75, 20],
];

const defaultFilters = { genre: "", era: "", runtime: "", sort: "relevance" } as const;

describe("catalog worker search", () => {
  test("filters language, adult, and saved movies before paginating", () => {
    expect(
      searchCatalogEntries(entries, {
        query: "ARRÍVAL",
        languageCodes: ["en"],
        showAdultMovies: false,
        excludedMovieIds: ["saved-result"],
        limit: 1,
        ...defaultFilters,
      }),
    ).toEqual({ movieIds: ["arrival-2016"], total: 1 });
  });

  test("reports the complete match count while limiting hydrated result ids", () => {
    expect(
      searchCatalogEntries(entries, {
        query: "arrival",
        languageCodes: ["en"],
        showAdultMovies: true,
        excludedMovieIds: [],
        limit: 2,
        ...defaultFilters,
      }),
    ).toEqual({ movieIds: ["arrival-2016", "adult-result"], total: 3 });
  });

  test("browses with combined filters without requiring a text query", () => {
    expect(
      searchCatalogEntries(entries, {
        query: "",
        languageCodes: ["en", "ko"],
        showAdultMovies: false,
        excludedMovieIds: [],
        limit: 10,
        genre: "Science Fiction",
        era: "2010s",
        runtime: "standard",
        sort: "top-rated",
      }),
    ).toEqual({ movieIds: ["arrival-2016"], total: 1 });
  });

  test("sorts browse results before pagination", () => {
    expect(
      searchCatalogEntries(entries, {
        query: "",
        languageCodes: ["en", "ko"],
        showAdultMovies: false,
        excludedMovieIds: [],
        limit: 2,
        genre: "",
        era: "",
        runtime: "",
        sort: "newest",
      }),
    ).toEqual({ movieIds: ["saved-result", "parasite-2019"], total: 3 });
  });
});
