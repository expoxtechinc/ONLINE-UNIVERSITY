import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CourseCard } from "@/components/course-card";
import { Pill, ScreenTitle } from "@/components/university-ui";
import { categories, universityCourses } from "@/lib/university";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

export default function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All subjects");
  const liveCourses = trpc.catalog.list.useQuery();
  const filtered = useMemo(() => universityCourses.filter((course) => (selectedCategory === "All subjects" || course.category === selectedCategory) && `${course.title} ${course.category} ${course.instructor}`.toLowerCase().includes(query.toLowerCase()) && course.status === "Published"), [query, selectedCategory]);

  return (
    <ScreenContainer className="px-5" safeAreaClassName="pt-2">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CourseCard course={item} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <ScreenTitle eyebrow="Explore catalog" title="Discover courses" />
          <View style={styles.search}><MaterialIcons name="search" size={21} color="#627D98" /><TextInput value={query} onChangeText={setQuery} placeholder="Search courses, topics, or instructors" placeholderTextColor="#829AB1" style={styles.searchInput} returnKeyType="search" /><MaterialIcons name="tune" size={20} color="#183B65" /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map((category) => <Pressable key={category} onPress={() => setSelectedCategory(category)} style={({ pressed }) => [styles.chip, selectedCategory === category && styles.chipSelected, pressed && { opacity: 0.72 }]}><Text style={[styles.chipText, selectedCategory === category && styles.chipTextSelected]}>{category}</Text></Pressable>)}</ScrollView>
          <View style={styles.resultHeading}><Text style={styles.resultTitle}>{filtered.length} courses available</Text><Pill label="Certificate eligible" tone="gold" /></View>
          {liveCourses.data?.length ? <View style={styles.liveSection}><Text style={styles.liveTitle}>Published from Online University</Text>{liveCourses.data.map((course) => <Pressable onPress={() => router.push(`/checkout/${course.id}` as never)} key={course.id} style={({ pressed }) => [styles.liveCourse, pressed && { opacity: 0.72 }]}><View style={styles.liveIcon}><MaterialIcons name="school" size={20} color="#FFFFFF" /></View><View style={{ flex: 1 }}><Text style={styles.liveCourseTitle}>{course.title}</Text><Text style={styles.liveCourseMeta}>{course.category} · ${(course.priceCents / 100).toFixed(2)} {course.currency.toUpperCase()}</Text></View><MaterialIcons name="arrow-forward" size={20} color="#183B65" /></Pressable>)}</View> : null}
        </>}
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="search-off" size={30} color="#D6A84B" /><Text style={styles.emptyTitle}>No courses found</Text><Text style={styles.emptyText}>Try a different search term or clear your subject filter.</Text></View>}
        contentContainerStyle={styles.content}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 20 }, search: { height: 50, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8E2EB", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, searchInput: { flex: 1, color: "#102A43", fontSize: 14, height: 48 }, chips: { gap: 8, paddingVertical: 15, paddingRight: 18 }, chip: { paddingVertical: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: "#D8E2EB", borderRadius: 999, backgroundColor: "#FFFFFF" }, chipSelected: { backgroundColor: "#102A43", borderColor: "#102A43" }, chipText: { fontSize: 12, fontWeight: "700", color: "#4A5E73" }, chipTextSelected: { color: "#FFFFFF" }, resultHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, resultTitle: { color: "#102A43", fontSize: 16, fontWeight: "800" }, liveSection: { backgroundColor: "#EAF0F7", padding: 13, borderRadius: 16, marginBottom: 16 }, liveTitle: { color: "#102A43", fontSize: 13, fontWeight: "800", marginBottom: 9 }, liveCourse: { backgroundColor: "#FFFFFF", borderRadius: 13, padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7 }, liveIcon: { width: 34, height: 34, backgroundColor: "#183B65", borderRadius: 11, alignItems: "center", justifyContent: "center" }, liveCourseTitle: { color: "#102A43", fontSize: 13, fontWeight: "800" }, liveCourseMeta: { color: "#627D98", fontSize: 10, marginTop: 3 }, empty: { alignItems: "center", padding: 36, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E3EAF0" }, emptyTitle: { color: "#102A43", fontSize: 17, fontWeight: "800", marginTop: 10 }, emptyText: { color: "#627D98", fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 5 },
});
