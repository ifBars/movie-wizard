import { useDeferredValue, useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { EmptyState, MovieCard, SectionTitle } from "~/components";
import { useLibrary } from "~/library-context";
import { colors, radii } from "~/theme";

export default function CatalogScreen() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const library = useLibrary();
  const movies = useMemo(() => {
    if (!deferredQuery) {
      return library.visibleMovies;
    }

    return library.visibleMovies.filter((movie) =>
      [movie.title, movie.year, movie.genres.join(" "), movie.directors.join(" "), movie.cast.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery),
    );
  }, [deferredQuery, library.visibleMovies]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: 14, padding: 16 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search movies, directors, cast"
        placeholderTextColor={colors.muted}
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.border,
          borderRadius: 999,
          borderWidth: 1,
          color: colors.ink,
          fontSize: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      />
      <View style={{ borderRadius: radii.md, gap: 10 }}>
        <SectionTitle title="Catalog" action={`${movies.length} movies`} />
        {movies.length > 0 ? (
          movies.map((movie) => <MovieCard key={movie.id} movie={movie} state={library.states[movie.id]} />)
        ) : (
          <EmptyState title="Nothing matched" body="Try a title, director, genre, or cast member." />
        )}
      </View>
    </ScrollView>
  );
}
