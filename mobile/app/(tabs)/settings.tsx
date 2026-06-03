import { useState } from "react";
import { Alert, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { ActionButton, SectionTitle } from "~/components";
import { useLibrary } from "~/library-context";
import { colors, radii } from "~/theme";

export default function SettingsScreen() {
  const library = useLibrary();
  const [importJson, setImportJson] = useState("");

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: 16, padding: 16 }}>
      <SectionTitle title="Settings" />
      <View
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.border,
          borderRadius: radii.md,
          borderWidth: 1,
          gap: 14,
          padding: 16,
        }}
      >
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
              Show adult catalog entries
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
              Hidden now: {library.hiddenAdultMovieCount}
            </Text>
          </View>
          <Switch
            value={library.settings.showAdultMovies}
            onValueChange={(showAdultMovies) => library.updateSettings({ ...library.settings, showAdultMovies })}
          />
        </View>
      </View>
      <View
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.border,
          borderRadius: radii.md,
          borderWidth: 1,
          gap: 12,
          padding: 16,
        }}
      >
        <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
          Local library
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
          Movie Wizard stores ratings and watchlist state only on this device.
        </Text>
        <ActionButton
          label="Export JSON"
          onPress={() => {
            const exported = library.exportLibrary();
            Alert.alert("Library export", exported.slice(0, 900));
          }}
        />
        <TextInput
          value={importJson}
          onChangeText={setImportJson}
          multiline
          placeholder="Paste exported Movie Wizard JSON"
          placeholderTextColor={colors.muted}
          textAlignVertical="top"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            borderRadius: radii.sm,
            borderWidth: 1,
            color: colors.ink,
            minHeight: 112,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <ActionButton
          label="Import JSON"
          onPress={() => {
            const imported = library.importLibrary(importJson);

            if (!imported) {
              Alert.alert("Import failed", "Paste a valid Movie Wizard export JSON file.");
              return;
            }

            setImportJson("");
            Alert.alert("Import complete", "Ratings, watchlist, and settings were restored on this device.");
          }}
        />
        <ActionButton
          label="Reset ratings and watchlist"
          tone="danger"
          onPress={() => {
            Alert.alert("Reset library?", "This clears local ratings, watched history, and watchlist entries.", [
              { text: "Cancel", style: "cancel" },
              { text: "Reset", style: "destructive", onPress: library.resetLibrary },
            ]);
          }}
        />
      </View>
    </ScrollView>
  );
}
