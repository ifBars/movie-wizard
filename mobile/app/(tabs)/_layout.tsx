import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "~/theme";

function TabIcon({ color, label }: { color: string; label: string }) {
  return <Text style={{ color, fontSize: 15, fontWeight: "900" }}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Discover", tabBarIcon: ({ color }) => <TabIcon color={color} label="D" /> }} />
      <Tabs.Screen name="catalog" options={{ title: "Catalog", tabBarIcon: ({ color }) => <TabIcon color={color} label="C" /> }} />
      <Tabs.Screen
        name="watchlist"
        options={{ title: "Watchlist", tabBarIcon: ({ color }) => <TabIcon color={color} label="W" /> }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <TabIcon color={color} label="S" /> }} />
    </Tabs>
  );
}
