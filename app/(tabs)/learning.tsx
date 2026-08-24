import { FlatList, StyleSheet, Text, View } from "react-native";

import { CourseCard } from "@/components/course-card";
import { EmptyState, ScreenTitle } from "@/components/university-ui";
import { ScreenContainer } from "@/components/screen-container";
import { universityCourses } from "@/lib/university";
import { useUniversity } from "@/lib/university-context";

export default function LearningScreen() {
  const { enrolledIds, progress } = useUniversity();
  const enrolled = universityCourses.filter((course) => enrolledIds.includes(course.id));
  return <ScreenContainer className="px-5" safeAreaClassName="pt-2"><FlatList data={enrolled} keyExtractor={(item) => item.id} renderItem={({ item }) => <CourseCard course={item} progress={progress[item.id] ?? 0} />} ListHeaderComponent={<><ScreenTitle eyebrow="Your academic path" title="My learning" /><View style={styles.summary}><Text style={styles.summaryStrong}>{enrolled.length} active course{enrolled.length === 1 ? "" : "s"}</Text><Text style={styles.summaryText}>Your course progress is saved on this device.</Text></View></>} ListEmptyComponent={<EmptyState title="Your library is waiting" message="Enroll in a course to begin building your learning path." />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} /></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { paddingBottom: 20 }, summary: { backgroundColor: "#EAF0F7", borderRadius: 16, padding: 14, marginBottom: 16 }, summaryStrong: { color: "#102A43", fontSize: 15, fontWeight: "800" }, summaryText: { color: "#4A5E73", fontSize: 12, lineHeight: 17, marginTop: 3 } });
