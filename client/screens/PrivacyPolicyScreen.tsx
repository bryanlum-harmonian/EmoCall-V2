import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export function PrivacyPolicyScreen() {
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
        <ThemedText type="h3">Privacy Policy</ThemedText>
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
            <ThemedText type="body" style={{ fontWeight: "700" }}>Our Promise: </ThemedText>
            EmoCall is built on privacy. We don't know your name, we don't ask for your email, and we don't record your calls. Your conversations stay between you and your call partner.
          </ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>1. Information We Collect</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          EmoCall is designed to be anonymous by default. Here's what we collect:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Device Identifier:</ThemedText> A random ID generated on your device to maintain your session. This is not linked to your personal identity.
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Session Data:</ThemedText> Your credits balance, aura points, daily matches count, and premium status.
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Usage Data:</ThemedText> Basic app usage statistics like call duration and feature usage to improve our service.
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Payment Information:</ThemedText> When you purchase credits or premium, payment processing is handled by our third-party payment provider. We do not store your credit card details.
          </ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>2. Information We Do NOT Collect</ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Your name, email address, or phone number</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Your location (GPS coordinates)</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Voice recordings of your calls</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Contents of your conversations</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Your contacts or photos</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Social media profiles</ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>3. Voice Calls</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          <ThemedText style={{ fontWeight: "600" }}>We do not record, store, or monitor your voice calls.</ThemedText> Calls are peer-to-peer connections. Once a call ends, there is no record of what was said. We only store metadata like call duration for aura point calculations.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>4. How We Use Your Information</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          We use the limited information we collect to:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Match you with other users based on mood selection (Vent/Listen)</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Track your credits, aura points, and subscription status</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Process payments and provide customer support</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Improve our matching algorithms and app features</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Enforce our Terms of Service and prevent abuse</ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>5. Data Sharing</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          We do not sell your data. We may share limited data with:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Payment Processors:</ThemedText> To process credit and subscription purchases
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Voice Service Providers:</ThemedText> To facilitate voice call connections (no call content is shared)
          </ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>
            • <ThemedText style={{ fontWeight: "600" }}>Legal Requirements:</ThemedText> If required by law or to protect user safety
          </ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>6. Data Retention</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          Session data is retained while your account is active. If you don't use the app for 12 months, your session data may be automatically deleted. You can request deletion of your data at any time by contacting us.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>7. Your Rights</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          You have the right to:
        </ThemedText>
        <View style={styles.list}>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Request access to your session data</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Request deletion of your data</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Opt out of analytics (contact us)</ThemedText>
          <ThemedText type="body" style={[styles.listItem, { color: theme.text }]}>• Withdraw consent at any time</ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>8. Children's Privacy</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          EmoCall is strictly for users 18 years and older. We do not knowingly collect information from anyone under 18. If we discover we have collected data from a minor, we will delete it immediately.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>9. Security</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          We use industry-standard security measures to protect your data, including encryption in transit and at rest. However, no system is 100% secure, and we cannot guarantee absolute security.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>10. Changes to This Policy</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of EmoCall after changes constitutes acceptance of the updated policy.
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>11. Contact Us</ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.text }]}>
          If you have questions about this Privacy Policy or your data, please contact us at:
        </ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { color: theme.primary, fontWeight: "600" }]}>
          privacy@emocall.app
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
  sectionTitle: {
    marginTop: Spacing.lg,
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
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
});
