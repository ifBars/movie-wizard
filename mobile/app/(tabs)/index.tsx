import { ScrollView, Text, View } from "react-native";
import { BrandHeader, EmptyState, MovieCard, SectionTitle, StatStrip } from "~/components";
import { useLibrary } from "~/library-context";
import { colors } from "~/theme";

export default function DiscoverScreen() {
  const library = useLibrary();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: 18, padding: 16 }}>
      <BrandHeader />
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: colors.ink, fontSize: 30, fontWeight: "900" }}>
          Find the next movie worth watching.
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Rate a few watched movies and Movie Wizard will rank the local catalog around your taste.
        </Text>
      </View>
      <StatStrip
        average={library.profile.averageRating}
        watched={library.historyMovies.length}
        watchlist={library.watchlistMovies.length}
      />
      <SectionTitle title="Recommended" action={`${library.recommendations.length} picks`} />
      {library.recommendations.length > 0 ? (
        library.recommendations.slice(0, 12).map((recommendation) => (
          <MovieCard
            key={recommendation.movie.id}
            movie={recommendation.movie}
            state={library.states[recommendation.movie.id]}
            reason={recommendation.reasons[0]}
          />
        ))
      ) : (
        <EmptyState title="No recommendations yet" body="Rate watched movies from the catalog to unlock ranked picks." />
      )}
    </ScrollView>
  );
}
