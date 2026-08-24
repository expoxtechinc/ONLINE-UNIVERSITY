import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export function Pill({ label, tone = "navy" }: { label: string; tone?: "navy" | "gold" | "green" | "slate" }) {
  return (
    <View style={[styles.pill, tone === "gold" && styles.goldPill, tone === "green" && styles.greenPill, tone === "slate" && styles.slatePill]}>
      <Text style={[styles.pillText, tone === "gold" && styles.goldText, tone === "green" && styles.greenText, tone === "slate" && styles.slateText]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ progress, color = "#D6A84B", label }: { progress: number; color?: string; label?: string }) {
  return (
    <View>
      {label ? <View style={styles.progressHeader}><Text style={styles.progressLabel}>{label}</Text><Text style={styles.progressPercent}>{Math.round(progress)}%</Text></View> : null}
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

export function SectionHeader({ title, action, icon }: { title: string; action?: string; icon?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>{icon ? <MaterialIcons name={icon as never} size={20} color="#102A43" /> : null}<Text style={styles.sectionTitle}>{title}</Text></View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function Metric({ label, value, icon, tone = "#183B65" }: { label: string; value: string; icon: string; tone?: string }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}><MaterialIcons name={icon as never} size={18} color={tone} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

export function EmptyState({ title, message, icon = "auto-stories" }: { title: string; message: string; icon?: string }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name={icon as never} size={28} color="#D6A84B" /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text></View>;
}

export function ScreenTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return <View style={styles.screenTitle}><View style={{ flex: 1 }}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.pageTitle}>{title}</Text></View>{right}</View>;
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "#EAF0F7" },
  goldPill: { backgroundColor: "#FFF5DC" }, greenPill: { backgroundColor: "#E6F5EE" }, slatePill: { backgroundColor: "#EDF2F7" },
  pillText: { color: "#183B65", fontSize: 11, lineHeight: 14, fontWeight: "700" }, goldText: { color: "#9A6F1E" }, greenText: { color: "#177648" }, slateText: { color: "#4A5E73" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }, progressLabel: { color: "#627D98", fontSize: 12, fontWeight: "600" }, progressPercent: { color: "#102A43", fontSize: 12, fontWeight: "800" },
  progressTrack: { height: 7, backgroundColor: "#E6EDF3", borderRadius: 999, overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 999 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 }, sectionTitle: { color: "#102A43", fontSize: 18, lineHeight: 23, fontWeight: "800" }, sectionAction: { color: "#183B65", fontSize: 13, fontWeight: "700" },
  metric: { width: "31%", minHeight: 110, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", borderRadius: 16, padding: 12 }, metricIcon: { width: 32, height: 32, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 10 }, metricValue: { color: "#102A43", fontSize: 19, fontWeight: "800", lineHeight: 23 }, metricLabel: { color: "#627D98", fontSize: 11, lineHeight: 15, marginTop: 2 },
  empty: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", borderRadius: 18, padding: 24, alignItems: "center" }, emptyIcon: { width: 54, height: 54, backgroundColor: "#102A43", borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 13 }, emptyTitle: { color: "#102A43", fontSize: 17, fontWeight: "800", textAlign: "center" }, emptyMessage: { color: "#627D98", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6, maxWidth: 280 },
  screenTitle: { flexDirection: "row", alignItems: "center", marginBottom: 18 }, eyebrow: { color: "#9A6F1E", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }, pageTitle: { color: "#102A43", fontSize: 28, lineHeight: 34, letterSpacing: -0.4, fontWeight: "800" },
});
