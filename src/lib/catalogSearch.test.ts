import { describe, expect, test } from "vitest";
import { searchCatalogEntries } from "@/lib/catalogSearch";
import type { CatalogSearchEntry } from "@/types";

const entries: CatalogSearchEntry[] = [
  ["arrival-2016", "arrival 2016 science fiction amy adams", "en", 0],
  ["parasite-2019", "parasite 2019 thriller bong joon ho", "ko", 0],
  ["adult-result", "arrival parody", "en", 1],
  ["saved-result", "arrival adjacent", "en", 0],
];

describe("catalog worker search", () => {
  test("filters language, adult, and saved movies before paginating", () => {
    expect(
      searchCatalogEntries(entries, {
        query: "ARRÍVAL",
        languageCodes: ["en"],
        showAdultMovies: false,
        excludedMovieIds: ["saved-result"],
        limit: 1,
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
      }),
    ).toEqual({ movieIds: ["arrival-2016", "adult-result"], total: 3 });
  });
});
