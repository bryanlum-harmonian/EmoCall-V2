import React, { useState } from "react";
import { View, StyleSheet, Image, ScrollView, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface TermsGateScreenProps {
  onAccept: () => void;
}

export default function TermsGateScreen({ onAccept }: TermsGateScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const scale = useSharedValue(1);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleAccept = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept();
  };

  const handleTermsPress = async () => {
    await Haptics.selectionAsync();
    setShowTerms(true);
  };

  const handlePrivacyPress = async () => {
    await Haptics.selectionAsync();
    setShowPrivacy(true);
  };

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing["6xl"] + Spacing.buttonHeight,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={[styles.iconContainer, animatedIconStyle]}
        >
          <Image
            source={require("../../assets/images/shield-checkmark.png")}
            style={styles.shieldIcon}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h1" style={styles.headline}>
            {t("terms.headline")}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          style={styles.termsContainer}
        >
          <View style={styles.termItem}>
            <View
              style={[styles.termBullet, { backgroundColor: theme.primary }]}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <ThemedText type="body" style={styles.termText}>
              {t("terms.feature1")}
            </ThemedText>
          </View>

          <View style={styles.termItem}>
            <View
              style={[styles.termBullet, { backgroundColor: theme.primary }]}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <ThemedText type="body" style={styles.termText}>
              {t("terms.feature2")}
            </ThemedText>
          </View>

          <View style={styles.termItem}>
            <View
              style={[styles.termBullet, { backgroundColor: theme.primary }]}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <ThemedText type="body" style={styles.termText}>
              {t("terms.feature3")}
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(800).duration(500)}
          style={[styles.legalContainer, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather
            name="shield"
            size={20}
            color={theme.textSecondary}
            style={styles.legalIcon}
          />
          <View style={styles.legalContent}>
            <ThemedText
              type="small"
              style={[styles.legalText, { color: theme.textSecondary }]}
            >
              {t("terms.ageWarning")}
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(900).duration(500)}
          style={styles.linksContainer}
        >
          <Pressable
            onPress={handleTermsPress}
            style={({ pressed }) => [
              styles.linkButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="file-text" size={16} color={theme.primary} />
            <ThemedText
              type="small"
              style={[styles.linkText, { color: theme.primary }]}
            >
              {t("terms.termsOfService")}
            </ThemedText>
          </Pressable>

          <View style={[styles.linkDivider, { backgroundColor: theme.border }]} />

          <Pressable
            onPress={handlePrivacyPress}
            style={({ pressed }) => [
              styles.linkButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="lock" size={16} color={theme.primary} />
            <ThemedText
              type="small"
              style={[styles.linkText, { color: theme.primary }]}
            >
              {t("terms.privacyPolicy")}
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInUp.delay(1000).duration(500)}
        style={[
          styles.buttonContainer,
          {
            paddingBottom: insets.bottom + Spacing.xl,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Button
          onPress={handleAccept}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          {t("terms.acceptButton")}
        </Button>
      </Animated.View>

      <Modal
        visible={showTerms}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTerms(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <Pressable
              onPress={() => setShowTerms(false)}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="h3">{t("terms.termsOfService")}</ThemedText>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
            showsVerticalScrollIndicator={false}
          >
            <TermsContent theme={theme} />
          </ScrollView>
        </ThemedView>
      </Modal>

      <Modal
        visible={showPrivacy}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacy(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <Pressable
              onPress={() => setShowPrivacy(false)}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="h3">{t("terms.privacyPolicy")}</ThemedText>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
            showsVerticalScrollIndicator={false}
          >
            <PrivacyContent theme={theme} />
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

function TermsContent({ theme }: { theme: any }) {
  return (
    <>
      <ThemedText type="caption" style={[styles.legalLastUpdated, { color: theme.textSecondary }]}>
        Last Updated: January 21, 2026
      </ThemedText>

      <View style={[styles.legalHighlightBox, { backgroundColor: `${theme.primary}20` }]}>
        <ThemedText type="body" style={{ color: theme.text }}>
          <ThemedText style={{ fontWeight: "700" }}>Welcome to EmoCall!</ThemedText> By using our app, you agree to these terms. EmoCall provides anonymous voice connections for emotional support - no profiles, no judgment, just talk.
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.legalSectionTitle}>1. Acceptance of Terms</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        By accessing or using EmoCall, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the app.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>2. Age Requirement</ThemedText>
      <View style={[styles.legalWarningBox, { backgroundColor: `${theme.error}20` }]}>
        <ThemedText type="body" style={{ color: theme.text }}>
          <ThemedText style={{ fontWeight: "700" }}>You must be at least 18 years old to use EmoCall.</ThemedText> By using this app, you confirm that you are 18 or older.
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.legalSectionTitle}>3. User Conduct</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        You agree NOT to: harass or abuse other users, share explicit content without consent, discriminate against others, record conversations, or use the service for commercial purposes.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>4. Credits and Payments</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        All purchases are final. Credits and premium subscriptions are non-refundable except as required by law.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>5. Disclaimer</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text, fontWeight: "600" }]}>
        EmoCall is not a substitute for professional mental health support. If you are experiencing a crisis, please contact a professional helpline.
      </ThemedText>

      <View style={[styles.legalFooter, { borderTopColor: theme.border }]}>
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
    </>
  );
}

function PrivacyContent({ theme }: { theme: any }) {
  return (
    <>
      <ThemedText type="caption" style={[styles.legalLastUpdated, { color: theme.textSecondary }]}>
        Last Updated: January 21, 2026
      </ThemedText>

      <View style={[styles.legalHighlightBox, { backgroundColor: `${theme.primary}20` }]}>
        <ThemedText type="body" style={{ color: theme.text }}>
          <ThemedText style={{ fontWeight: "700" }}>Our Promise:</ThemedText> EmoCall is built on privacy. We don't know your name, we don't ask for your email, and we don't record your calls.
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.legalSectionTitle}>1. Information We Collect</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        We collect only: a random device identifier, session data (credits, aura points), and basic usage statistics. We do NOT store payment details.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>2. Information We Do NOT Collect</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        We do not collect your name, email, phone number, location, voice recordings, conversation contents, contacts, or social media profiles.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>3. Voice Calls</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text, fontWeight: "600" }]}>
        We do not record, store, or monitor your voice calls. Calls are peer-to-peer connections.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>4. Your Rights</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        You have the right to request access to your data, request deletion, opt out of analytics, and withdraw consent at any time.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>5. Contact Us</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.primary, fontWeight: "600" }]}>
        privacy@emocall.app
      </ThemedText>

      <View style={[styles.legalFooter, { borderTopColor: theme.border }]}>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: Spacing["3xl"],
  },
  shieldIcon: {
    width: 100,
    height: 100,
  },
  headline: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  termsContainer: {
    width: "100%",
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  termItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  termBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  termText: {
    flex: 1,
  },
  legalContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  legalIcon: {
    marginTop: 2,
  },
  legalContent: {
    flex: 1,
  },
  legalText: {
    flex: 1,
  },
  linksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  linkText: {
    fontWeight: "500",
  },
  linkDivider: {
    width: 1,
    height: 16,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  button: {
    width: "100%",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPlaceholder: {
    width: 40,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  legalLastUpdated: {
    marginBottom: Spacing.lg,
  },
  legalHighlightBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  legalWarningBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  legalSectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  legalParagraph: {
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  legalFooter: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
});
