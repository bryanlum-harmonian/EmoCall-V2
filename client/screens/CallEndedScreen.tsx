import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { StarRating } from "@/components/StarRating";
import { useTheme } from "@/hooks/useTheme";
import { useSession } from "@/contexts/SessionContext";
import { useAura } from "@/contexts/AuraContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type EndReason = "timeout" | "ended" | "reported" | "disconnected" | "partner_ended" | "partner_left" | "max_duration";

const getEndReasonIcon = (reason: EndReason) => {
  switch (reason) {
    case "timeout":
      return "clock" as const;
    case "max_duration":
      return "heart" as const;
    case "ended":
      return "phone-off" as const;
    case "reported":
      return "flag" as const;
    case "disconnected":
      return "wifi-off" as const;
    case "partner_ended":
    case "partner_left":
      return "user-x" as const;
    default:
      return "phone" as const;
  }
};

const getEndReasonContent = (reason: EndReason, t: (key: string) => string) => {
  switch (reason) {
    case "timeout":
      return {
        icon: getEndReasonIcon(reason),
        title: t("callEnded.timeoutTitle"),
        message: t("callEnded.timeoutMessage"),
      };
    case "max_duration":
      return {
        icon: getEndReasonIcon(reason),
        title: t("callEnded.maxDurationTitle"),
        message: t("callEnded.maxDurationMessage"),
      };
    case "ended":
      return {
        icon: getEndReasonIcon(reason),
        title: t("callEnded.title"),
        message: t("callEnded.howWasVibe"),
      };
    case "reported":
      return {
        icon: getEndReasonIcon(reason),
        title: t("callEnded.reportedTitle"),
        message: t("callEnded.reportedMessage"),
      };
    case "disconnected":
      return {
        icon: getEndReasonIcon(reason),
        title: t("callEnded.disconnectedTitle"),
        message: t("callEnded.disconnectedMessage"),
      };
    case "partner_ended":
    case "partner_left":
      return {
        icon: getEndReasonIcon(reason),
        title: t("partnerLeft.title"),
        message: t("partnerLeft.message"),
      };
    default:
      return {
        icon: getEndReasonIcon(reason),
        title: t("callEnded.title"),
        message: t("callEnded.howWasVibe"),
      };
  }
};

export default function CallEndedScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, currentLanguage } = useLanguage();
  void currentLanguage; // Trigger re-render on language change
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CallEnded">>();
  const { session, refreshSession } = useSession();
  const { syncWithBackend } = useAura();

  const reason = route.params?.reason || "ended";
  const callId = route.params?.callId;
  const content = getEndReasonContent(reason, t);

  // Refresh session on mount to get updated time bank balance (including refunds)
  useEffect(() => {
    refreshSession();
    syncWithBackend();
  }, [refreshSession, syncWithBackend]);

  const [voiceQuality, setVoiceQuality] = useState(0);
  const [strangerQuality, setStrangerQuality] = useState(0);
  const [overallExperience, setOverallExperience] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [auraEarned, setAuraEarned] = useState(0);

  const canSubmit = voiceQuality > 0 && strangerQuality > 0 && overallExperience > 0;
  const showRatingUI = !hasSubmitted && reason !== "reported";

  const handleSubmitRating = async () => {
    if (!canSubmit || !session?.id || !callId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        new URL(`/api/calls/${callId}/ratings`, getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            voiceQuality,
            strangerQuality,
            overallExperience,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAuraEarned(data.auraAwarded || 100);
        setHasSubmitted(true);
        syncWithBackend();
      } else {
        Alert.alert("Oops", data.error || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Rating submission error:", error);
      Alert.alert("Oops", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryAgain = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace("MoodSelection");
  };

  const handleSkipRating = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.replace("MoodSelection");
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View
          entering={ZoomIn.delay(200).duration(500)}
          style={[
            styles.iconContainer,
            { backgroundColor: `${theme.primary}15` },
          ]}
        >
          <View
            style={[
              styles.iconInner,
              { backgroundColor: theme.primary },
            ]}
          >
            <Feather name={content.icon} size={28} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h3" style={styles.title}>
            {content.title}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(500)}>
          <ThemedText
            type="body"
            style={[styles.message, { color: theme.textSecondary }]}
          >
            {content.message}
          </ThemedText>
        </Animated.View>

        {showRatingUI && callId ? (
          <Animated.View
            entering={FadeInUp.delay(800).duration(500)}
            style={[styles.ratingsCard, { backgroundColor: theme.backgroundSecondary }]}
          >
            <ThemedText type="caption" style={[styles.ratingsHeader, { color: theme.textSecondary }]}>
              {t("callEnded.rateExperience")}
            </ThemedText>

            <StarRating
              label={t("callEnded.voiceQuality")}
              rating={voiceQuality}
              onRatingChange={setVoiceQuality}
            />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <StarRating
              label={t("callEnded.strangerQuality")}
              rating={strangerQuality}
              onRatingChange={setStrangerQuality}
            />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <StarRating
              label={t("callEnded.overallExperience")}
              rating={overallExperience}
              onRatingChange={setOverallExperience}
            />

            {canSubmit ? (
              <View style={styles.auraRewardBadge}>
                <Feather name="zap" size={16} color="#FFD700" />
                <ThemedText type="caption" style={styles.auraRewardText}>
                  {t("callEnded.auraReward")}
                </ThemedText>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {hasSubmitted ? (
          <Animated.View
            entering={ZoomIn.duration(500)}
            style={[styles.successCard, { backgroundColor: `${theme.primary}15` }]}
          >
            <View style={[styles.successIconContainer, { backgroundColor: theme.primary }]}>
              <Feather name="check" size={24} color="#FFFFFF" />
            </View>
            <ThemedText type="h4" style={styles.successTitle}>
              {t("callEnded.thankYou")}
            </ThemedText>
            <View style={styles.auraEarnedRow}>
              <Feather name="zap" size={20} color="#FFD700" />
              <ThemedText type="body" style={styles.auraEarnedText}>
                +{auraEarned} {t("callEnded.auraEarned")}
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.spacer} />

        <Animated.View
          entering={FadeInUp.delay(1000).duration(500)}
          style={styles.actions}
        >
          {showRatingUI && callId ? (
            <>
              <Button
                onPress={handleSubmitRating}
                disabled={!canSubmit || isSubmitting}
                style={[
                  styles.primaryButton,
                  { backgroundColor: canSubmit ? theme.primary : theme.backgroundSecondary },
                ]}
              >
                {isSubmitting ? t("callEnded.submitting") : t("callEnded.submitFeedback")}
              </Button>
              <Button
                onPress={handleSkipRating}
                variant="secondary"
                style={styles.secondaryButton}
              >
                {t("callEnded.skip")}
              </Button>
            </>
          ) : (
            <Button
              onPress={handleTryAgain}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            >
              {t("callEnded.newCall")}
            </Button>
          )}
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  ratingsCard: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  ratingsHeader: {
    textAlign: "center",
    marginBottom: Spacing.md,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  auraRewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  auraRewardText: {
    color: "#FFD700",
    fontWeight: "600",
  },
  successCard: {
    width: "100%",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  successIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    textAlign: "center",
  },
  auraEarnedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  auraEarnedText: {
    fontWeight: "600",
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xl,
  },
  actions: {
    width: "100%",
    gap: Spacing.md,
    marginTop: "auto",
  },
  primaryButton: {
    width: "100%",
  },
  secondaryButton: {
    width: "100%",
  },
});
