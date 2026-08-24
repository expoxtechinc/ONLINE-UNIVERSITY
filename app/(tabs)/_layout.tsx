import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#183B65", tabBarInactiveTintColor: "#829AB1", tabBarButton: HapticTab, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, height: 58 + bottomPadding, paddingTop: 7, paddingBottom: bottomPadding }, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} /> }} />
      <Tabs.Screen name="learning" options={{ title: "My Learning", tabBarIcon: ({ color }) => <IconSymbol size={24} name="books.vertical.fill" color={color} /> }} />
      <Tabs.Screen name="certificates" options={{ title: "Awards", tabBarIcon: ({ color }) => <IconSymbol size={24} name="rosette" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.circle.fill" color={color} /> }} />
    </Tabs>
  );
}
