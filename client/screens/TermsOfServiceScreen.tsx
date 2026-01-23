import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export function TermsOfServiceScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">Terms of Service</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="caption" style={[styles.lastUpdated, { color: theme.textSecondary }]}>
          Last Updated: January 21, 2026
        </ThemedText>

        <View style={[styles.highlightBox, { backgroundColor: `${theme.primary}20` }]}>
          <ThemedText type="body" style={{ color: theme.text }}>
            <ThemedText type="body" style={{ fontWeight: "700" }}>Welcome to EmoCall!</ThemedText> By using our app, you agree to these terms. Please read them carefully. EmoCall provides anonymous voice connections for emotional support - no profiles, no judgment, just talk.
          </ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>1. Acceptance of Terms</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          By accessing or using EmoCall, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the app.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>2. Age Requirement</ThemedText>
        <View style={[styles.warningBox, { backgroundColor: `${theme.error}20` }]}>
          <ThemedText type="body" style={{ color: theme.text }}>
            <ThemedText style={{ fontWeight: "700" }}>You must be at least 18 years old to use EmoCall.</ThemedText> By using this app, you confirm that you are 18 or older. We reserve the right to terminate accounts if we believe a user is under 18.
          </ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>3. Account and Session</ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• EmoCall uses anonymous sessions tied to your device. No registration is required.</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• You are responsible for maintaining the security of your device.</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• If you delete the app or clear data, your session (including credits and aura) may be lost.</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Sessions are non-transferable between devices.</ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>4. The Service</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          EmoCall connects users for anonymous 5-minute voice calls. The service includes:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Mood Selection:</ThemedText> Choose "I Need to Vent" or "I Can Listen" to match with compatible users
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Instant Matching:</ThemedText> Quick matching with other users in complementary moods
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Voice Calls:</ThemedText> Time-limited anonymous calls with optional paid extensions
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Aura System:</ThemedText> Earn points for positive participation
          </ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>5. User Conduct</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          You agree NOT to:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Harass, threaten, or abuse other users</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Share explicit sexual content or engage in sexual conversations without consent</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Discriminate based on race, gender, religion, sexuality, or other characteristics</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Share personal identifying information (yours or others')</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Record, screenshot, or otherwise capture conversations</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Use the service for commercial purposes or solicitation</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Attempt to identify or contact users outside the app</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Threaten self-harm or harm to others</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Discuss illegal activities or encourage illegal behavior</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Use the service while impaired by drugs or alcohol in a way that affects your judgment</ThemedText>
        </View>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          Violation of these rules may result in aura point deduction, temporary suspension, or permanent ban.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>6. Credits and Payments</ThemedText>
        
        <ThemedText type="body" style={[styles.subSectionTitle, { color: theme.text, fontWeight: "600" }]}>6.1 Credit Packages</ThemedText>
        <View style={[styles.table, { borderColor: theme.border }]}>
          <View style={[styles.tableHeader, { backgroundColor: `${theme.success}30` }]}>
            <ThemedText type="caption" style={[styles.tableCell, { fontWeight: "600" }]}>Package</ThemedText>
            <ThemedText type="caption" style={[styles.tableCell, { fontWeight: "600" }]}>Credits</ThemedText>
            <ThemedText type="caption" style={[styles.tableCell, { fontWeight: "600" }]}>Price</ThemedText>
          </View>
          <View style={[styles.tableRow, { borderTopColor: theme.border }]}>
            <ThemedText type="caption" style={styles.tableCell}>Starter Pack</ThemedText>
            <ThemedText type="caption" style={styles.tableCell}>250</ThemedText>
            <ThemedText type="caption" style={styles.tableCell}>$0.99</ThemedText>
          </View>
          <View style={[styles.tableRow, { borderTopColor: theme.border }]}>
            <ThemedText type="caption" style={styles.tableCell}>Weekender Pack</ThemedText>
            <ThemedText type="caption" style={styles.tableCell}>1,500</ThemedText>
            <ThemedText type="caption" style={styles.tableCell}>$4.99</ThemedText>
          </View>
          <View style={[styles.tableRow, { borderTopColor: theme.border }]}>
            <ThemedText type="caption" style={styles.tableCell}>Power User Pack</ThemedText>
            <ThemedText type="caption" style={styles.tableCell}>3,500</ThemedText>
            <ThemedText type="caption" style={styles.tableCell}>$9.99</ThemedText>
          </View>
        </View>

        <ThemedText type="body" style={[styles.subSectionTitle, { color: theme.text, fontWeight: "600" }]}>6.2 Credit Usage</ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Shuffle new deck (refresh cards): 100 credits</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Call extensions: 100-450 credits depending on duration</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Premium subscription: $10/month (includes 200 bonus credits)</ThemedText>
        </View>

        <ThemedText type="body" style={[styles.subSectionTitle, { color: theme.text, fontWeight: "600" }]}>6.3 Daily Matches</ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• You receive 10 free matches per day</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Additional matches can be purchased for $0.99</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Unused daily matches do not carry over</ThemedText>
        </View>

        <ThemedText type="body" style={[styles.subSectionTitle, { color: theme.text, fontWeight: "600" }]}>6.4 Time Bank</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          If a call ends early after you purchase an extension, unused time is refunded to your Time Bank as Priority Tokens. These tokens can be used for priority matching in future calls.
        </ThemedText>

        <ThemedText type="body" style={[styles.subSectionTitle, { color: theme.text, fontWeight: "600" }]}>6.5 Refund Policy</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          All purchases are final. Credits and premium subscriptions are non-refundable except as required by law. If you experience a technical issue preventing use of purchased credits, contact us within 48 hours.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>7. Premium Subscription</ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Premium costs $10/month and includes 200 bonus credits at subscription</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Premium features include gender filter on daily cards and priority matching</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Subscriptions auto-renew unless cancelled before the renewal date</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• You can cancel anytime through your device's app store</ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>8. Aura System</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          Aura points reflect your participation quality:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Daily check-in: +5 aura</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Each minute during call: +10 aura</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Complete a call: +10 aura</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Extend a call: +50 aura</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Get reported: -25 aura</ThemedText>
        </View>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          Higher aura unlocks titles from "New Soul" to "Heart of Gold" but does not provide monetary benefits.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>9. Reporting and Safety</ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• You can report users for violations during or after a call</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• We take reports seriously and investigate all claims</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• False reports may result in penalties to your account</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• If you feel unsafe, end the call immediately</ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>10. Disclaimer of Warranties</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          EmoCall is provided "AS IS" without warranties of any kind. We do not guarantee:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Continuous, uninterrupted access to the service</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• The quality or reliability of matches</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• That other users will follow these terms</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Any specific emotional outcomes from using the service</ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>11. Limitation of Liability</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text, fontWeight: "600" }]}>
          EmoCall is not a substitute for professional mental health support. If you are experiencing a mental health crisis, please contact a professional helpline in your area.
        </ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          To the maximum extent permitted by law, EmoCall, Harmonian Software (M) Sdn Bhd, and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>12. Indemnification</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          You agree to indemnify and hold harmless EmoCall, Harmonian Software (M) Sdn Bhd, and its operators from any claims, damages, or expenses arising from your use of the service or violation of these terms.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>13. Termination</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          We may terminate or suspend your access to EmoCall at any time, without prior notice, for conduct that we believe:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Violates these Terms of Service</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Is harmful to other users or the service</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Violates applicable laws</ThemedText>
        </View>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          Upon termination, your credits and aura points are forfeited.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>14. Changes to Terms</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          We may modify these terms at any time. Significant changes will be notified through the app. Continued use after changes constitutes acceptance.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>15. Governing Law</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          These terms are governed by the laws of Malaysia. Any disputes shall be resolved through binding arbitration in accordance with Malaysian law.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>16. Contact</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          For questions about these Terms of Service, contact us at:
        </ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.primary, fontWeight: "600" }]}>
          support@emocall.app
        </ThemedText>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            EmoCall - Anonymous Voice Calling for Emotional Relief
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
            A product of Harmonian Software (M) Sdn Bhd
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
            Registered in Malaysia
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  lastUpdated: {
    marginBottom: Spacing.lg,
  },
  highlightBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  warningBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  subSectionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  list: {
    marginBottom: Spacing.md,
  },
  listItem: {
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  table: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
  },
  tableCell: {
    flex: 1,
  },
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
});
