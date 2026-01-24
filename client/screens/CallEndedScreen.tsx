import React, { useState } from "react";
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
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type EndReason = "timeout" | "ended" | "reported" | "disconnected" | "partner_ended" | "partner_left" | "max_duration";

const getEndReasonContent = (reason: EndReason) => {
  switch (reason) {
    case "timeout":
      return {
        icon: "clock" as const,
        title: "Time's Up",
        message: "Your free session has ended. Hope you found some relief!",
      };
    case "max_duration":
      return {
        icon: "heart" as const,
        title: "A Beautiful Hour",
        message: "The most precious moments are the ones we hold close. An hour of connection is a gift—treasure it, and carry its warmth with you.",
      };
    case "ended":
      return {
        icon: "phone-off" as const,
        title: "Call Ended",
        message: "How was the vibe?",
      };
    case "reported":
      return {
        icon: "flag" as const,
        title: "Report Submitted",
        message: "Thank you for helping keep EmoCall safe. Your report has been logged.",
      };
    case "disconnected":
      return {
        icon: "wifi-off" as const,
        title: "Connection Lost",
        message: "The call was disconnected. Please try again.",
      };
    case "partner_ended":
    case "partner_left":
      return {
        icon: "user-x" as const,
        title: "Partner Left",
        message: "Your call partner ended the session. We hope you found some comfort.",
      };
    default:
      return {
        icon: "phone" as const,
        title: "Call Ended",
        message: "How was the vibe?",
      };
  }
};

export default function CallEndedScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CallEnded">>();
  const { session } = useSession();
  const { syncWithBackend } = useAura();

  const reason = route.params?.reason || "ended";
  const callId = route.params?.callId;
  const content = getEndReasonContent(reason);

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
              Rate your experience to continue
            </ThemedText>

            <StarRating
              label="Voice Quality"
              rating={voiceQuality}
              onRatingChange={setVoiceQuality}
            />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <StarRating
              label="Stranger Quality"
              rating={strangerQuality}
              onRatingChange={setStrangerQuality}
            />

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <StarRating
              label="Overall Experience"
              rating={overallExperience}
              onRatingChange={setOverallExperience}
            />

            {canSubmit ? (
              <View style={styles.auraRewardBadge}>
                <Feather name="zap" size={16} color="#FFD700" />
                <ThemedText type="caption" style={styles.auraRewardText}>
                  +100 Aura for your feedback
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
              Thanks for your feedback!
            </ThemedText>
            <View style={styles.auraEarnedRow}>
              <Feather name="zap" size={20} color="#FFD700" />
              <ThemedText type="body" style={styles.auraEarnedText}>
                +{auraEarned} Aura earned
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
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
              <Button
                onPress={handleSkipRating}
                variant="secondary"
                style={styles.secondaryButton}
              >
                Skip
              </Button>
            </>
          ) : (
            <Button
              onPress={handleTryAgain}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            >
              Start Another Call
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
