import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function PaymentSuccessScreen() {
  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5 justify-center"><View style={styles.card}><View style={styles.icon}><MaterialIcons name="hourglass-top" size={35} color="#D6A84B" /></View><Text style={styles.title}>Payment processing</Text><Text style={styles.body}>Your checkout has returned to Online University. Course access is activated only after the secure payment webhook confirms the transaction.</Text><Pressable onPress={() => router.replace("/(tabs)/learning")} style={styles.button}><Text style={styles.buttonText}>View my learning</Text></Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ card: { backgroundColor: "#FFFFFF", borderRadius: 21, borderWidth: 1, borderColor: "#E3EAF0", padding: 25, alignItems: "center" }, icon: { width: 70, height: 70, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#102A43" }, title: { color: "#102A43", fontSize: 21, fontWeight: "800", marginTop: 16 }, body: { color: "#627D98", textAlign: "center", fontSize: 13, lineHeight: 20, marginTop: 7 }, button: { backgroundColor: "#D6A84B", borderRadius: 13, paddingVertical: 13, paddingHorizontal: 18, marginTop: 20 }, buttonText: { color: "#102A43", fontWeight: "800", fontSize: 13 } });
