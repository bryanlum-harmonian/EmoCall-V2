import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
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

export default function VibeCheckScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { syncWithBackend } = useAura();
  const { session } = useSession();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "VibeCheck">>();

  const callId = (route.params as any)?.callId;

  const [voiceQuality, setVoiceQuality] = useState(0);
  const [strangerQuality, setStrangerQuality] = useState(0);
  const [overallExperience, setOverallExperience] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auraEarned, setAuraEarned] = useState(0);

  const rewardScale = useSharedValue(0);
  const heartScale = useSharedValue(1);

  const rewardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScale.value }],
    opacity: rewardScale.value,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const canSubmit = voiceQuality > 0 && strangerQuality > 0 && overallExperience > 0;

  const showRewardAnimation = () => {
    rewardScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
  };

  const handleSubmitRating = async () => {
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (callId && session?.id) {
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
          setAuraEarned(data.auraAwarded || 100);
          syncWithBackend();
        }
      } else {
        setAuraEarned(100);
      }

      setHasSubmitted(true);
      showRewardAnimation();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Rating submission error:", error);
      setAuraEarned(100);
      setHasSubmitted(true);
      showRewardAnimation();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoHome = async () => {
    await Haptics.selectionAsync();
    navigation.replace("MoodSelection");
  };

  const handleSkip = async () => {
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
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.lg,
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
            <Feather name="phone-off" size={24} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h3" style={styles.title}>
            {t("callEnded.title")}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {t("callEnded.howWasVibe")}
          </ThemedText>
        </Animated.View>

        {!hasSubmitted ? (
          <Animated.View 
            entering={FadeInUp.delay(600).duration(500)}
            style={[styles.ratingsCard, { backgroundColor: theme.backgroundSecondary }]}
          >
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
        ) : (
          <Animated.View style={[styles.rewardContainer, rewardStyle]}>
            <View style={[styles.successCard, { backgroundColor: `${theme.primary}15` }]}>
              <View style={[styles.successIconContainer, { backgroundColor: theme.primary }]}>
                <Feather name="check" size={24} color="#FFFFFF" />
              </View>
              <ThemedText type="h4" style={styles.successTitle}>
                {t("callEnded.thankYou")}
              </ThemedText>
              <View style={styles.auraEarnedRow}>
                <Animated.View style={heartStyle}>
                  <Feather name="zap" size={20} color="#FFD700" />
                </Animated.View>
                <ThemedText type="body" style={styles.auraEarnedText}>
                  +{auraEarned} {t("callEnded.auraEarned")}
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.spacer} />

        <View style={styles.actionsContainer}>
          {hasSubmitted ? (
            <Animated.View entering={FadeIn.delay(300)} style={styles.fullWidth}>
              <Button onPress={handleGoHome}>{t("callEnded.newCall")}</Button>
            </Animated.View>
          ) : (
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
                onPress={handleSkip}
                variant="secondary"
                style={styles.secondaryButton}
              >
                {t("callEnded.skip")}
              </Button>
            </>
          )}
        </View>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  ratingsCard: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
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
  rewardContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
  actionsContainer: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.md,
  },
  fullWidth: {
    width: "100%",
  },
  primaryButton: {
    width: "100%",
  },
  secondaryButton: {
    width: "100%",
  },
});
