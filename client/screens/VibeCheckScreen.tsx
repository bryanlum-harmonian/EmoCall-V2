import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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
import { useTheme } from "@/hooks/useTheme";
import { useAura, AURA_REWARDS } from "@/contexts/AuraContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function VibeCheckScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { aura, awardCallCompletion } = useAura();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<"up" | "down" | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [earnedKarma, setEarnedKarma] = useState(0);

  const thumbsUpScale = useSharedValue(1);
  const thumbsDownScale = useSharedValue(1);
  const rewardScale = useSharedValue(0);
  const heartScale = useSharedValue(1);

  const thumbsUpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbsUpScale.value }],
  }));

  const thumbsDownStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbsDownScale.value }],
  }));

  const rewardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScale.value }],
    opacity: rewardScale.value,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const showRewardAnimation = () => {
    setShowReward(true);
    rewardScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
  };

  const handleVote = async (type: "up" | "down") => {
    if (hasVoted) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVoteType(type);
    setHasVoted(true);

    if (type === "up") {
      thumbsUpScale.value = withSequence(
        withSpring(1.3, { damping: 10, stiffness: 200 }),
        withSpring(1.1, { damping: 10 })
      );
      thumbsDownScale.value = withSpring(0.8, { damping: 15 });
    } else {
      thumbsDownScale.value = withSequence(
        withSpring(1.3, { damping: 10, stiffness: 200 }),
        withSpring(1.1, { damping: 10 })
      );
      thumbsUpScale.value = withSpring(0.8, { damping: 15 });
    }

    const earnedAura = AURA_REWARDS.COMPLETE_CALL;
    setEarnedKarma(earnedAura);
    awardCallCompletion();
    
    setTimeout(() => {
      showRewardAnimation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 300);
  };

  const handleGoHome = async () => {
    await Haptics.selectionAsync();
    navigation.replace("MoodSelection");
  };

  const handleReport = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace("CallEnded", { reason: "reported" });
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
            Call Ended
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            How was the vibe?
          </ThemedText>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.delay(600).duration(500)}
          style={styles.votingContainer}
        >
          <AnimatedPressable
            onPress={() => handleVote("up")}
            disabled={hasVoted}
            style={[
              styles.voteButton,
              {
                backgroundColor: voteType === "up" ? theme.success : theme.backgroundSecondary,
                borderColor: voteType === "up" ? theme.success : theme.border,
                opacity: hasVoted && voteType !== "up" ? 0.4 : 1,
              },
              thumbsUpStyle,
            ]}
          >
            <Feather
              name="thumbs-up"
              size={28}
              color={voteType === "up" ? "#FFFFFF" : theme.success}
            />
            <ThemedText
              type="small"
              style={{
                color: voteType === "up" ? "#FFFFFF" : theme.success,
                fontWeight: "600",
                marginTop: Spacing.xs,
              }}
            >
              Good Vibes
            </ThemedText>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => handleVote("down")}
            disabled={hasVoted}
            style={[
              styles.voteButton,
              {
                backgroundColor: voteType === "down" ? theme.error : theme.backgroundSecondary,
                borderColor: voteType === "down" ? theme.error : theme.border,
                opacity: hasVoted && voteType !== "down" ? 0.4 : 1,
              },
              thumbsDownStyle,
            ]}
          >
            <Feather
              name="thumbs-down"
              size={28}
              color={voteType === "down" ? "#FFFFFF" : theme.error}
            />
            <ThemedText
              type="small"
              style={{
                color: voteType === "down" ? "#FFFFFF" : theme.error,
                fontWeight: "600",
                marginTop: Spacing.xs,
              }}
            >
              Bad Vibes
            </ThemedText>
          </AnimatedPressable>
        </Animated.View>

        {showReward ? (
          <Animated.View style={[styles.rewardContainer, rewardStyle]}>
            <View style={[styles.rewardBadge, { backgroundColor: `${theme.primary}20` }]}>
              <Animated.View style={heartStyle}>
                <Feather name="heart" size={20} color={theme.secondary} />
              </Animated.View>
              <ThemedText type="body" style={[styles.rewardText, { color: theme.primary }]}>
                +{earnedKarma} Aura
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              style={[styles.rewardSubtext, { color: theme.textSecondary }]}
            >
              Thanks for connecting!
            </ThemedText>
          </Animated.View>
        ) : (
          <View style={styles.rewardPlaceholder} />
        )}

        <View style={styles.actionsContainer}>
          {hasVoted ? (
            <Animated.View entering={FadeIn.delay(300)} style={styles.fullWidth}>
              <Button onPress={handleGoHome}>Back to Home</Button>
            </Animated.View>
          ) : (
            <ThemedText
              type="caption"
              style={[styles.skipText, { color: theme.textSecondary }]}
            >
              Rate your experience to continue
            </ThemedText>
          )}
        </View>

        {voteType === "down" ? (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.reportSection}>
            <Pressable
              onPress={handleReport}
              style={({ pressed }) => [
                styles.reportButton,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="flag" size={14} color={theme.error} />
              <ThemedText
                type="caption"
                style={{ color: theme.error, marginLeft: Spacing.xs }}
              >
                Report this user
              </ThemedText>
            </Pressable>
          </Animated.View>
        ) : null}
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
  votingContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  voteButton: {
    width: 110,
    height: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  rewardText: {
    fontWeight: "700",
  },
  rewardSubtext: {
    marginTop: Spacing.xs,
  },
  rewardPlaceholder: {
    height: 60,
  },
  actionsContainer: {
    width: "100%",
    alignItems: "center",
  },
  fullWidth: {
    width: "100%",
  },
  skipText: {
    textAlign: "center",
  },
  reportSection: {
    marginTop: Spacing.md,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
});
