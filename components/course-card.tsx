import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Pill, ProgressBar } from "@/components/university-ui";
import type { Course } from "@/lib/university";

export function CourseCard({ course, progress, compact = false }: { course: Course; progress?: number; compact?: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/course/${course.id}` as never)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.cover, { backgroundColor: course.color }]}>
        <View style={styles.coverTop}><Pill label={course.category} tone="gold" /><View style={styles.bookmark}><MaterialIcons name="bookmark-border" size={18} color="#FFFFFF" /></View></View>
        <View style={styles.coverMark}><Text style={styles.coverInitial}>{course.shortTitle.split(" ").slice(0, 2).map((word) => word[0]).join("")}</Text></View>
        <Text style={styles.coverLabel}>ONLINE UNIVERSITY</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}><Pill label={course.level} tone="slate" /><Text style={styles.duration}>{course.duration}</Text></View>
        <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
        <Text style={styles.instructor} numberOfLines={1}>{course.instructor}</Text>
        {typeof progress === "number" ? <View style={styles.progressWrap}><ProgressBar progress={progress} color={course.accent} label="Course progress" /></View> : <View style={styles.ratingRow}><MaterialIcons name="star" size={15} color="#D6A84B" /><Text style={styles.rating}>{course.rating}</Text><Text style={styles.students}>({course.enrolledCount} learners)</Text></View>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#E3EAF0", marginBottom: 14 }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  cover: { height: 118, padding: 12, justifyContent: "space-between" }, coverTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, bookmark: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFFFF24", alignItems: "center", justifyContent: "center" }, coverMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFFFFF18", borderWidth: 1, borderColor: "#FFFFFF42", alignItems: "center", justifyContent: "center" }, coverInitial: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" }, coverLabel: { color: "#FFFFFFB8", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  body: { padding: 14 }, metaRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 }, duration: { color: "#627D98", fontSize: 12, fontWeight: "600" }, title: { color: "#102A43", fontSize: 17, lineHeight: 22, fontWeight: "800" }, instructor: { color: "#627D98", fontSize: 13, marginTop: 5 }, ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 13 }, rating: { color: "#102A43", fontSize: 12, fontWeight: "800" }, students: { color: "#627D98", fontSize: 12 }, progressWrap: { marginTop: 14 },
});
