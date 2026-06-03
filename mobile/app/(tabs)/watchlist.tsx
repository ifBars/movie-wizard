import { ScrollView } from "react-native";
import { EmptyState, MovieCard, SectionTitle } from "~/components";
import { useLibrary } from "~/library-context";

export default function WatchlistScreen() {
  const library = useLibrary();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: 14, padding: 16 }}>
      <SectionTitle title="Watchlist" action={`${library.watchlistMovies.length} saved`} />
      {library.watchlistMovies.length > 0 ? (
        library.watchlistMovies.map((movie) => <MovieCard key={movie.id} movie={movie} state={library.states[movie.id]} />)
      ) : (
        <EmptyState title="Your watchlist is empty" body="Add movies from Discover or Catalog and they will appear here." />
      )}
    </ScrollView>
  );
}
