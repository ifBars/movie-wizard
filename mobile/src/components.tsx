import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View, type GestureResponderEvent } from "react-native";
import type { Movie, Rating, UserMovieState } from "@/types";
import { getPosterUri } from "~/movie-images";
import { colors, radii } from "~/theme";

type MovieCardProps = {
  movie: Movie;
  state?: UserMovieState;
  reason?: string;
};

export function BrandHeader() {
  return (
    <View style={{ alignItems: "center", backgroundColor: colors.header, paddingVertical: 14 }}>
      <Image
        source={require("../assets/brand/movie-wizard-mark-generated.png")}
        style={{ height: 40, width: 40 }}
        contentFit="contain"
      />
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: 8,
        padding: 18,
      }}
    >
      <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "700" }}>
        {title}
      </Text>
      <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        {body}
      </Text>
    </View>
  );
}

export function StatStrip({ average, watched, watchlist }: { average: number; watched: number; watchlist: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Stat label="Average" value={average > 0 ? average.toFixed(1) : "0.0"} />
      <Stat label="Watched" value={String(watched)} />
      <Stat label="Watchlist" value={String(watchlist)} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        borderRadius: radii.sm,
        borderWidth: 1,
        flex: 1,
        gap: 4,
        padding: 12,
      }}
    >
      <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text selectable style={{ color: colors.ink, fontSize: 22, fontVariant: ["tabular-nums"], fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={{ alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" }}>
      <Text selectable style={{ color: colors.ink, fontSize: 22, fontWeight: "800" }}>
        {title}
      </Text>
      {action ? (
        <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

export function MovieCard({ movie, state, reason }: MovieCardProps) {
  const posterUri = getPosterUri(movie);

  return (
    <Link href={`/movie/${movie.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: colors.panel,
          borderColor: colors.border,
          borderRadius: radii.md,
          borderWidth: 1,
          flexDirection: "row",
          gap: 12,
          opacity: pressed ? 0.74 : 1,
          padding: 10,
        })}
      >
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={{ backgroundColor: colors.border, borderRadius: radii.sm, height: 132, width: 88 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.header,
              borderRadius: radii.sm,
              height: 132,
              justifyContent: "center",
              width: 88,
            }}
          >
            <Text selectable style={{ color: colors.white, fontSize: 24, fontWeight: "800" }}>
              MW
            </Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
          <Text selectable numberOfLines={2} style={{ color: colors.ink, fontSize: 18, fontWeight: "800" }}>
            {movie.title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
            {movie.year} / {movie.runtimeMinutes} min / {movie.genres.slice(0, 2).join(", ")}
          </Text>
          <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            {reason ?? movie.synopsis}
          </Text>
          <Text selectable style={{ color: colors.blue, fontSize: 13, fontWeight: "800" }}>
            {state?.rating ? `${state.rating}/5 rated` : state?.watchlist ? "On watchlist" : "Tap to rate"}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function RatingControl({ value, onRate }: { value?: Rating | null; onRate: (rating: Rating) => void }) {
  const ratings: Rating[] = [1, 2, 3, 4, 5];

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {ratings.map((rating) => (
        <Pressable
          key={rating}
          onPress={() => onRate(rating)}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: value && rating <= value ? colors.blue : colors.blueSoft,
            borderRadius: 999,
            height: 42,
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
            width: 42,
          })}
        >
          <Text style={{ color: value && rating <= value ? colors.white : colors.blue, fontSize: 20, fontWeight: "900" }}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ActionButton({
  label,
  tone = "neutral",
  onPress,
}: {
  label: string;
  tone?: "neutral" | "primary" | "danger";
  onPress: (event: GestureResponderEvent) => void;
}) {
  const backgroundColor = tone === "primary" ? colors.orange : tone === "danger" ? "#fee2e2" : colors.panel;
  const textColor = tone === "primary" ? colors.white : tone === "danger" ? "#991b1b" : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor,
        borderColor: tone === "primary" ? colors.orangeDark : colors.border,
        borderRadius: radii.sm,
        borderWidth: 1,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
      })}
    >
      <Text style={{ color: textColor, fontSize: 15, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}
