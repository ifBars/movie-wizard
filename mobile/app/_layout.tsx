import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LibraryProvider } from "~/library-context";
import { colors } from "~/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LibraryProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.surface },
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: "800" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="movie/[id]" options={{ title: "Movie" }} />
        </Stack>
      </LibraryProvider>
    </GestureHandlerRootView>
  );
}
