import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { startCourseCheckout } from "@/lib/platform-api";
import { trpc } from "@/lib/trpc";

export default function CheckoutScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const id = Number(courseId);
  const courseQuery = trpc.catalog.course.useQuery({ id }, { enabled: Number.isInteger(id) });
  const [loading, setLoading] = useState(false);
  const checkout = async () => {
    setLoading(true);
    try {
      const result = await startCourseCheckout(id);
      if (result.alreadyEnrolled) { Alert.alert("Already enrolled", "This course is already active in your learning record."); router.replace("/(tabs)/learning"); return; }
      if (!result.checkoutUrl) throw new Error("Checkout could not be initialized.");
      await WebBrowser.openBrowserAsync(result.checkoutUrl);
      router.replace("/payment/success" as never);
    } catch (error) { Alert.alert("Checkout unavailable", error instanceof Error ? error.message : "Please try again shortly."); } finally { setLoading(false); }
  };
  if (courseQuery.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#183B65" /></ScreenContainer>;
  if (!courseQuery.data) return <ScreenContainer className="items-center justify-center px-8"><Text className="text-center text-muted">This course is not available for enrollment.</Text></ScreenContainer>;
  const course = courseQuery.data;
  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5" safeAreaClassName="pt-2"><View style={styles.top}><Pressable onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#102A43" /></Pressable></View><View style={styles.hero}><Text style={styles.wordmark}>ONLINE UNIVERSITY</Text><Text style={styles.heroTitle}>{course.title}</Text><Text style={styles.heroText}>Secure course enrollment</Text></View><View style={styles.card}><Text style={styles.label}>COURSE TUITION</Text><Text style={styles.price}>${(course.priceCents / 100).toFixed(2)} <Text style={styles.currency}>{course.currency.toUpperCase()}</Text></Text><Text style={styles.description}>{course.description}</Text><View style={styles.line} /><View style={styles.secureRow}><MaterialIcons name="lock" size={19} color="#177648" /><Text style={styles.secureText}>Payments are handled by Stripe Checkout. Your card details are never processed or stored by Online University.</Text></View><Pressable onPress={checkout} disabled={loading} style={({ pressed }) => [styles.pay, (pressed || loading) && { opacity: 0.75 }]}>{loading ? <ActivityIndicator color="#102A43" /> : <><Text style={styles.payText}>Continue to secure checkout</Text><MaterialIcons name="open-in-new" size={18} color="#102A43" /></>}</Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ top: { marginBottom: 16 }, back: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", justifyContent: "center", alignItems: "center" }, hero: { backgroundColor: "#102A43", padding: 20, borderRadius: 20, marginBottom: 16 }, wordmark: { color: "#D6A84B", fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, heroTitle: { color: "#FFFFFF", fontSize: 25, lineHeight: 32, fontWeight: "800", marginTop: 8 }, heroText: { color: "#D2DFEA", fontSize: 13, marginTop: 7 }, card: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E3EAF0", padding: 17 }, label: { color: "#627D98", fontSize: 10, letterSpacing: 0.9, fontWeight: "800" }, price: { color: "#102A43", fontSize: 30, fontWeight: "800", marginTop: 5 }, currency: { fontSize: 12, color: "#627D98", letterSpacing: 0.8 }, description: { color: "#4A5E73", fontSize: 13, lineHeight: 19, marginTop: 16 }, line: { height: 1, backgroundColor: "#E3EAF0", marginVertical: 16 }, secureRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" }, secureText: { color: "#286245", fontSize: 12, lineHeight: 18, flex: 1 }, pay: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, backgroundColor: "#D6A84B", padding: 14, borderRadius: 13, marginTop: 20 }, payText: { color: "#102A43", fontWeight: "800", fontSize: 13 } });
