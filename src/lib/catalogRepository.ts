import moviesUrl from "@/data/generated/movies.json?url";
import { parseMovieCatalog } from "@/lib/movieCatalog";

export async function loadMovieCatalog() {
  const response = await fetch(moviesUrl);
  if (!response.ok) {
    throw new Error(`Failed to load movie catalog (${response.status})`);
  }

  return parseMovieCatalog(await response.json());
}
