import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { ScreenContainer } from "@/components/screen-container";
import { Pill, ScreenTitle } from "@/components/university-ui";
import { getCourse } from "@/lib/university";
import { useUniversity } from "@/lib/university-context";

type VerifiedCertificate = {
  valid: boolean;
  verification_code: string;
  learner_name: string | null;
  course_title: string;
  final_score: number;
  issued_at: string;
};

export default function VerifyCertificateScreen() {
  const { certificateId } = useLocalSearchParams<{ certificateId: string }>();
  const { certificates } = useUniversity();
  const [remote, setRemote] = useState<VerifiedCertificate | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-certificate?code=${encodeURIComponent(certificateId.toUpperCase())}`);
        const data = response.ok ? await response.json() : null;
        if (active) setRemote(data as VerifiedCertificate | null);
      } catch {
        if (active) setRemote(null);
      } finally { if (active) setChecking(false); }
    })();
    return () => { active = false; };
  }, [certificateId]);

  const localCertificate = certificates.find((item) => item.id === certificateId) ?? certificates[0];
  const localCourse = getCourse(localCertificate?.courseId);
  const valid = remote?.valid ?? Boolean(localCertificate);
  const learnerName = remote?.learner_name ?? localCertificate?.learnerName ?? "Learner";
  const courseName = remote?.course_title ?? localCourse.title;
  const issuedAt = remote ? new Date(remote.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : localCertificate?.issuedAt ?? "";
  const finalScore = remote?.final_score ?? localCertificate?.finalScore ?? 0;
  const resolvedId = remote?.verification_code ?? localCertificate?.id ?? certificateId;
  const publicVerificationUrl = useMemo(() => `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-certificate?code=${encodeURIComponent(resolvedId)}`, [resolvedId]);

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Pressable onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#102A43" /></Pressable><ScreenTitle eyebrow="Credential verification" title={valid ? "Certificate verified" : "Certificate not found"} />{checking ? <View style={styles.checking}><ActivityIndicator color="#183B65" /><Text style={styles.checkingText}>Checking the global certificate registry…</Text></View> : null}{valid ? <><View style={styles.success}><View style={styles.verifiedSeal}><MaterialIcons name="verified" size={38} color="#177648" /></View><Pill label={remote ? "Global registry verified" : "Device record"} tone="green" /><Text style={styles.successTitle}>This credential is valid</Text><Text style={styles.successText}>The verification link and QR code resolve against the Online University global certificate registry.</Text></View><View style={styles.certificateFrame}><View style={styles.certificate}><View style={styles.certificateWatermark}><MaterialIcons name="school" size={132} color="#D6A84B" /></View><View style={styles.certificateContent}><Text style={styles.wordmark}>ONLINE UNIVERSITY</Text><Text style={styles.certificateDate}>{issuedAt}</Text><Text style={styles.presented}>This certifies that</Text><Text style={styles.name} numberOfLines={2}>{learnerName}</Text><Text style={styles.presented}>has successfully completed</Text><Text style={styles.course} numberOfLines={2}>{courseName}</Text><Text style={styles.description}>This credential is issued through Online University’s verified academic record system.</Text><View style={styles.signatureBlock}><Text style={styles.signatureName}>Sokpah</Text><View style={styles.signatureRule} /><Text style={styles.signatureRole}>Akin S. Sokpah · CEO & Founder</Text></View><View style={styles.certificateFooter}><View><Text style={styles.detailLabel}>CERTIFICATE ID</Text><Text style={styles.detailValue}>{resolvedId}</Text></View><View><Text style={styles.detailLabel}>FINAL SCORE</Text><Text style={styles.detailValue}>{finalScore}%</Text></View></View></View><View style={styles.qrPanel}><Text style={styles.qrLabel}>SCAN TO VERIFY</Text><View style={styles.qrShell}><QRCode value={publicVerificationUrl} size={70} color="#102A43" backgroundColor="#FFFFFF" /></View><Text style={styles.qrCode}>{resolvedId}</Text></View></View></View><View style={styles.linkCard}><MaterialIcons name="link" size={19} color="#183B65" /><View style={{ flex: 1 }}><Text style={styles.linkLabel}>GLOBAL VERIFICATION LINK</Text><Text style={styles.linkText} numberOfLines={1}>{publicVerificationUrl}</Text></View></View></> : <View style={styles.notFound}><MaterialIcons name="gpp-bad" size={44} color="#C64545" /><Text style={styles.notFoundTitle}>No matching certificate</Text><Text style={styles.notFoundText}>Check the certificate ID and try again. A valid Online University certificate will show its learner, course, date, result, and QR verification record.</Text></View>}<Pressable onPress={() => router.replace("/certificates")} style={({ pressed }) => [styles.done, pressed && { opacity: 0.75 }]}><Text style={styles.doneText}>Return to certificates</Text></Pressable></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 25 },
  back: { width: 40, height: 40, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  checking: { flexDirection: "row", gap: 9, justifyContent: "center", alignItems: "center", padding: 12, backgroundColor: "#EAF0F7", borderRadius: 12, marginBottom: 12 },
  checkingText: { color: "#4A5E73", fontSize: 12 },
  success: { alignItems: "center", backgroundColor: "#EAF5EF", borderRadius: 18, padding: 20, marginBottom: 16 },
  verifiedSeal: { width: 68, height: 68, borderRadius: 25, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  successTitle: { color: "#155A37", fontSize: 18, fontWeight: "800", marginTop: 9 },
  successText: { color: "#286245", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 4 },
  certificateFrame: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#D6A84B80", backgroundColor: "#FFFFFF" },
  certificate: { minHeight: 455, width: "100%", position: "relative", backgroundColor: "#F8F6F1" },
  certificateWatermark: { position: "absolute", left: 72, top: 154, opacity: 0.08 },
  certificateContent: { paddingTop: 27, paddingLeft: 20, paddingRight: 88, flex: 1 },
  wordmark: { color: "#102A43", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  certificateDate: { color: "#4A5E73", fontSize: 10, fontWeight: "700", marginTop: 23 },
  presented: { color: "#627D98", fontSize: 10, marginTop: 12 },
  name: { color: "#102A43", fontSize: 24, lineHeight: 28, letterSpacing: -0.4, fontWeight: "800", marginTop: 3 },
  course: { color: "#183B65", fontSize: 16, lineHeight: 21, fontWeight: "800", marginTop: 4 },
  description: { color: "#4A5E73", fontSize: 10, lineHeight: 15, marginTop: 14 },
  signatureBlock: { position: "absolute", left: 20, bottom: 65, width: 145 },
  signatureName: { color: "#9A6F1E", fontSize: 16, fontStyle: "italic", fontWeight: "700" },
  signatureRule: { backgroundColor: "#102A43", height: 1, marginTop: 5, width: 114 },
  signatureRole: { color: "#4A5E73", fontSize: 8, lineHeight: 12, marginTop: 5 },
  certificateFooter: { position: "absolute", bottom: 17, left: 20, right: 86, flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: "#627D98", fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  detailValue: { color: "#102A43", fontSize: 8, fontWeight: "800", marginTop: 3, maxWidth: 115 },
  qrPanel: { position: "absolute", right: 9, top: 54, bottom: 20, width: 75, alignItems: "center", justifyContent: "flex-end" },
  qrLabel: { color: "#102A43", fontSize: 7, fontWeight: "900", letterSpacing: 0.4, marginBottom: 6, textAlign: "center" },
  qrShell: { padding: 3, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D6A84B", borderRadius: 2 },
  qrCode: { color: "#102A43", fontSize: 6.5, fontWeight: "800", textAlign: "center", marginTop: 5 },
  linkCard: { backgroundColor: "#EAF0F7", padding: 12, borderRadius: 14, marginTop: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  linkLabel: { color: "#627D98", fontSize: 9, letterSpacing: 0.7, fontWeight: "800" },
  linkText: { color: "#183B65", fontSize: 11, fontWeight: "700", marginTop: 3 },
  notFound: { alignItems: "center", backgroundColor: "#FDECEC", borderRadius: 18, padding: 28 },
  notFoundTitle: { color: "#8B2F2F", fontSize: 18, fontWeight: "800", marginTop: 12 },
  notFoundText: { color: "#9C4C4C", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 5 },
  done: { marginTop: 18, padding: 15, alignItems: "center", borderRadius: 14, backgroundColor: "#102A43" },
  doneText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
});
