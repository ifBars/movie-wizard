import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { ActionButton, EmptyState, RatingControl } from "~/components";
import { useLibrary } from "~/library-context";
import { getBackdropUri, getPosterUri } from "~/movie-images";
import { colors, radii } from "~/theme";

export default function MovieDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const movie = library.visibleMovies.find((item) => item.id === id) ?? library.movies.find((item) => item.id === id);

  if (!movie) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16 }}>
        <EmptyState title="Movie not found" body="This title is not available in the local catalog." />
      </ScrollView>
    );
  }

  const state = library.states[movie.id];
  const backdropUri = getBackdropUri(movie);
  const posterUri = getPosterUri(movie);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: 16, paddingBottom: 28 }}>
      <Stack.Screen options={{ title: movie.title }} />
      {backdropUri ? (
        <Image source={{ uri: backdropUri }} style={{ height: 220, width: "100%" }} contentFit="cover" />
      ) : (
        <View style={{ backgroundColor: colors.header, height: 160 }} />
      )}
      <View style={{ gap: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", gap: 14 }}>
          {posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={{ backgroundColor: colors.border, borderRadius: radii.sm, height: 168, width: 112 }}
              contentFit="cover"
            />
          ) : null}
          <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
            <Text selectable style={{ color: colors.ink, fontSize: 28, fontWeight: "900" }}>
              {movie.title}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 14, fontWeight: "700", lineHeight: 20 }}>
              {movie.year} / {movie.runtimeMinutes} min / {movie.originalLanguage.toUpperCase()}
            </Text>
            <Text selectable style={{ color: colors.orangeDark, fontSize: 14, fontWeight: "800" }}>
              {movie.genres.join(", ")}
            </Text>
          </View>
        </View>
        <Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 24 }}>
          {movie.synopsis}
        </Text>
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
            Your rating
          </Text>
          <RatingControl value={state?.rating} onRate={(rating) => library.rateMovie(movie.id, rating)} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <ActionButton
            label={state?.watched ? "Watched" : "Mark watched"}
            tone={state?.watched ? "primary" : "neutral"}
            onPress={() => library.toggleWatched(movie.id)}
          />
          <ActionButton
            label={state?.watchlist ? "Saved" : "Watchlist"}
            tone={state?.watchlist ? "primary" : "neutral"}
            onPress={() => library.toggleWatchlist(movie.id)}
          />
          <ActionButton
            label={state?.ignored ? "Ignored" : "Ignore"}
            tone={state?.ignored ? "danger" : "neutral"}
            onPress={() => library.toggleIgnored(movie.id)}
          />
        </View>
        <View style={{ backgroundColor: colors.panel, borderRadius: radii.md, gap: 8, padding: 16 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "800" }}>
            Why it fits
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            {movie.plexFit}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
            Directed by {movie.directors.join(", ")}. Starring {movie.cast.slice(0, 4).join(", ")}.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
