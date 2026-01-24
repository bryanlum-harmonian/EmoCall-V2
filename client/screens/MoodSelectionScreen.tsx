import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Image, Modal, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CreditsStoreModal } from "@/components/CreditsStoreModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AuraInfoModal } from "@/components/AuraInfoModal";
import { GlobalRankingsModal } from "@/components/GlobalRankingsModal";
import { useTheme } from "@/hooks/useTheme";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useSession } from "@/contexts/SessionContext";
import { useCredits, DAILY_MATCHES_REFILL_COST } from "@/contexts/CreditsContext";
import { useAura } from "@/contexts/AuraContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl, apiRequest } from "@/lib/query-client";

type MoodType = "vent" | "listen";

const MAX_DAILY_MATCHES = 10;

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MoodCardProps {
  type: MoodType;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  onPress: () => void;
  delay: number;
  disabled?: boolean;
}

function MoodCard({ type, icon, title, onPress, delay, disabled }: MoodCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.96, springConfig);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = async () => {
    if (!disabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const isVent = type === "vent";
  const isListen = type === "listen";

  const cardContent = (
    <>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isVent || isListen ? "rgba(255,255,255,0.2)" : theme.backgroundSecondary,
          },
        ]}
      >
        <Feather
          name={icon}
          size={32}
          color="#FFFFFF"
        />
      </View>
      <ThemedText
        type="body"
        style={[
          styles.cardTitle,
          { color: "#FFFFFF", fontWeight: "700", fontSize: 18 },
        ]}
      >
        {title}
      </ThemedText>
    </>
  );

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(500)} style={styles.cardWrapper}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.moodCard,
          { opacity: disabled ? 0.5 : 1 },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={isVent ? theme.ventGradient : theme.listenGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          {cardContent}
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

interface RefillModalProps {
  visible: boolean;
  onClose: () => void;
  onRefill: () => void;
}

function RefillModal({ visible, onClose, onRefill }: RefillModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[styles.refillModalContent, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.refillIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="refresh-cw" size={32} color={theme.primary} />
          </View>

          <ThemedText type="h3" style={styles.refillTitle}>
            Daily Matches Used Up
          </ThemedText>

          <ThemedText
            type="body"
            style={[styles.refillDescription, { color: theme.textSecondary }]}
          >
            You've used all your free matches for today. Refill now to keep connecting!
          </ThemedText>

          <Pressable
            onPress={onRefill}
            style={({ pressed }) => [
              styles.refillButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText style={styles.refillButtonText}>
              Refill for {DAILY_MATCHES_REFILL_COST} credits
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.waitButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Wait until tomorrow
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function MoodSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { session } = useSession();
  const { credits, isPremium, dailyMatchesLeft, refillMatches, useMatch } = useCredits();
  const { aura, currentLevel } = useAura();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showCreditsStore, setShowCreditsStore] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showAuraInfo, setShowAuraInfo] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Habit Loop state
  const [dailyVibe, setDailyVibe] = useState<string>("");
  const [dailyStreak, setDailyStreak] = useState(0);
  const [showFirstMission, setShowFirstMission] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const pulseScale = useSharedValue(1);

  const noMatchesLeft = dailyMatchesLeft <= 0;
  
  // Fetch habit loop data on mount
  useEffect(() => {
    const fetchHabitData = async () => {
      try {
        // Fetch daily vibe prompt
        const vibeUrl = new URL("/api/daily-vibe", getApiUrl());
        const vibeRes = await fetch(vibeUrl.toString());
        if (vibeRes.ok) {
          const vibeData = await vibeRes.json();
          setDailyVibe(vibeData.prompt);
        }
        
        // Fetch habit status if session exists
        if (session?.id) {
          const statusUrl = new URL(`/api/sessions/${session.id}/habit-status`, getApiUrl());
          const statusRes = await fetch(statusUrl.toString());
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setDailyStreak(statusData.dailyStreak || 0);
            setShowFirstMission(statusData.showFirstMission || false);
            setCheckedInToday(statusData.checkedInToday || false);
          }
          
          // Auto check-in if not already checked in today
          if (!checkedInToday) {
            try {
              const checkInRes = await apiRequest("POST", `/api/sessions/${session.id}/checkin`, {});
              if (checkInRes.ok) {
                const checkInData = await checkInRes.json();
                if (checkInData.success) {
                  setDailyStreak(checkInData.dailyStreak);
                  setCheckedInToday(true);
                }
              }
            } catch (err) {
              console.log("[Habit] Check-in failed:", err);
            }
          }
        }
      } catch (err) {
        console.log("[Habit] Failed to fetch habit data:", err);
      }
    };
    
    fetchHabitData();
  }, [session?.id]);

  // Track if we successfully matched - used to prevent cleanup from sending leave_queue
  const matchedSuccessfullyRef = useRef(false);
  
  const handleMatchFound = useCallback((match: { callId: string; partnerId: string; duration: number; startedAt?: string }) => {
    console.log("[MoodSelection] Match found:", match);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // IMPORTANT: Mark as matched BEFORE navigation to prevent cleanup from calling leaveQueue
    matchedSuccessfullyRef.current = true;
    
    setIsSearching(false);
    setSelectedMood(null);
    // Use replace to prevent going back to this screen with stale state
    navigation.replace("ActiveCall", { 
      callId: match.callId, 
      partnerId: match.partnerId, 
      duration: match.duration,
      startedAt: match.startedAt,
    });
  }, [navigation]);

  const { state: matchState, matchResult, clearMatchResult, joinQueue, leaveQueue } = useMatchmaking({
    sessionId: session?.id || null,
    onMatchFound: handleMatchFound,
  });

  // Track isSearching in ref for cleanup
  const isSearchingRef = useRef(isSearching);
  useEffect(() => {
    isSearchingRef.current = isSearching;
  }, [isSearching]);

  // Track leaveQueue in ref to avoid effect re-runs when callback changes
  const leaveQueueRef = useRef(leaveQueue);
  useEffect(() => {
    leaveQueueRef.current = leaveQueue;
  }, [leaveQueue]);

  // Leave queue ONLY on actual component unmount (empty deps), NOT on re-renders
  useEffect(() => {
    return () => {
      if (isSearchingRef.current && !matchedSuccessfullyRef.current) {
        console.log("[MoodSelection] Component unmounting while searching (no match), leaving queue");
        leaveQueueRef.current();
      } else if (matchedSuccessfullyRef.current) {
        console.log("[MoodSelection] Component unmounting after successful match, NOT leaving queue");
      }
    };
  }, []); // Empty deps - only runs on mount/unmount

  // Handle match result
  useEffect(() => {
    if (matchResult && isSearching) {
      handleMatchFound(matchResult);
      clearMatchResult();
    }
  }, [matchResult, isSearching, handleMatchFound, clearMatchResult]);

  // Animate search icon
  useEffect(() => {
    if (isSearching) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isSearching, pulseScale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleMoodSelect = async (mood: MoodType) => {
    console.log("[MoodSelection] handleMoodSelect START, mood:", mood);
    if (noMatchesLeft) {
      console.log("[MoodSelection] No matches left!");
      setShowRefillModal(true);
      return;
    }
    
    // Use a daily match
    console.log("[MoodSelection] Calling useMatch()...");
    try {
      const matchUsed = await useMatch();
      console.log("[MoodSelection] useMatch result:", matchUsed);
      if (!matchUsed) {
        console.log("[MoodSelection] useMatch returned false, exiting");
        return;
      }
    } catch (err) {
      console.error("[MoodSelection] useMatch threw error:", err);
      return;
    }
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMood(mood);
    setIsSearching(true);
    
    // Join matchmaking queue
    console.log("[MoodSelection] About to call joinQueue with:", mood);
    joinQueue(mood, "direct");
    console.log("[MoodSelection] joinQueue called");
  };

  const handleCancelSearch = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    leaveQueue();
    setIsSearching(false);
    setSelectedMood(null);
  };

  const handleSettingsPress = async () => {
    await Haptics.selectionAsync();
    navigation.navigate("Settings");
  };

  const handleCreditsPress = async () => {
    await Haptics.selectionAsync();
    setShowCreditsStore(true);
  };

  const [showRefillConfirm, setShowRefillConfirm] = useState(false);
  const canRefillMatches = credits >= DAILY_MATCHES_REFILL_COST;

  const handleRefill = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRefillConfirm(true);
  };

  const handleConfirmRefill = async () => {
    setShowRefillConfirm(false);
    const success = await refillMatches();
    if (success) {
      setShowRefillModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText type="body" style={[styles.appName, { fontWeight: "700" }]}>
              EmoCall
            </ThemedText>
            {isPremium ? (
              <View style={[styles.premiumBadge, { backgroundColor: theme.success }]}>
                <Feather name="star" size={8} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAuraInfo(true);
              }}
              style={({ pressed }) => [
                styles.karmaButton,
                {
                  backgroundColor: `${theme.error}15`,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="star" size={14} color={theme.error} />
              <ThemedText type="caption" style={{ color: theme.error, fontWeight: "600" }}>
                {aura}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleCreditsPress}
              style={({ pressed }) => [
                styles.creditsButton,
                {
                  backgroundColor: `${theme.primary}15`,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="zap" size={14} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                {credits}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowRankings(true);
              }}
              style={({ pressed }) => [
                styles.rankingsButton,
                {
                  backgroundColor: `${theme.accent2}15`,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="globe" size={18} color={theme.accent2} />
            </Pressable>
            <Pressable
              testID="button-settings"
              onPress={handleSettingsPress}
              style={({ pressed }) => [
                styles.settingsButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="settings" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Level & Streak Badges */}
        <Animated.View 
          entering={FadeIn.delay(250).duration(400)} 
          style={styles.karmaLevelContainer}
        >
          <View style={styles.levelStreakRow}>
            <View style={[styles.karmaLevelBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="award" size={12} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.text, fontWeight: "500" }}>
                Level {currentLevel.level}: {currentLevel.name}
              </ThemedText>
            </View>
            {dailyStreak > 0 ? (
              <View style={[styles.streakBadge, { backgroundColor: `${theme.warning}20` }]}>
                <Feather name="zap" size={12} color={theme.warning} />
                <ThemedText type="caption" style={{ color: theme.warning, fontWeight: "600" }}>
                  {dailyStreak} day streak
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Headline */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <ThemedText type="h3" style={styles.headline}>
            How are you feeling?
          </ThemedText>
        </Animated.View>

        {/* Daily Vibe Card */}
        {dailyVibe ? (
          <Animated.View 
            entering={FadeInUp.delay(350).duration(400)}
            style={[styles.vibeCard, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` }]}
          >
            <View style={styles.vibeHeader}>
              <Feather name="message-square" size={14} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                Today's Vibe
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.vibePrompt, { color: theme.text }]}>
              "{dailyVibe}"
            </ThemedText>
          </Animated.View>
        ) : null}

        {/* First Mission Badge */}
        {showFirstMission ? (
          <Animated.View 
            entering={FadeInUp.delay(380).duration(400)}
            style={[styles.missionCard, { backgroundColor: `${theme.success}15`, borderColor: `${theme.success}40` }]}
          >
            <View style={styles.missionIcon}>
              <Feather name="target" size={16} color={theme.success} />
            </View>
            <View style={styles.missionContent}>
              <ThemedText type="caption" style={{ color: theme.success, fontWeight: "700" }}>
                First Mission
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11 }}>
                Complete 1 call for +50 Aura
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        {/* Matches Counter */}
        <View style={styles.matchesCounter}>
          <Animated.View 
            entering={FadeIn.delay(400).duration(400)}
            style={[
              styles.matchesBadge,
              { 
                backgroundColor: noMatchesLeft ? `${theme.error}15` : theme.backgroundSecondary,
                borderColor: noMatchesLeft ? theme.error : theme.border,
              },
            ]}
          >
            <Feather 
              name="layers" 
              size={14} 
              color={noMatchesLeft ? theme.error : theme.primary} 
            />
            <ThemedText 
              type="small" 
              style={{ 
                color: noMatchesLeft ? theme.error : theme.text,
                fontWeight: "600",
              }}
            >
              Matches Left: {dailyMatchesLeft}/{MAX_DAILY_MATCHES}
            </ThemedText>
            {noMatchesLeft ? (
              <Pressable
                onPress={() => setShowRefillModal(true)}
                style={({ pressed }) => [
                  styles.refillBadgeButton,
                  { backgroundColor: theme.error, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 10 }}>
                  Refill
                </ThemedText>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>

        {/* Mood Cards */}
        <View style={styles.cardsContainer}>
          <MoodCard
            type="vent"
            icon="message-circle"
            title="I Need to Vent"
            onPress={() => handleMoodSelect("vent")}
            delay={450}
            disabled={noMatchesLeft}
          />
          <MoodCard
            type="listen"
            icon="headphones"
            title="I Can Listen"
            onPress={() => handleMoodSelect("listen")}
            delay={550}
            disabled={noMatchesLeft}
          />
        </View>

        {/* Subtitle */}
        <Animated.View entering={FadeIn.delay(650).duration(400)}>
          <ThemedText
            type="caption"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {noMatchesLeft 
              ? "Refill your matches to continue connecting"
              : "Pick your mood. You'll connect in 15 seconds."
            }
          </ThemedText>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(750).duration(400)} style={styles.footer}>
          <ThemedText
            type="caption"
            style={[styles.footerText, { color: theme.textDisabled }]}
          >
            Anonymous voice calls for emotional relief
          </ThemedText>
        </Animated.View>

        {/* Developer Preview Button - for web testing */}
        <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.devButtonContainer}>
          <Pressable
            onPress={() => {
              navigation.navigate("ActiveCall", {
                callId: "dev-preview-call",
                partnerId: "dev-partner-123",
                duration: 300,
                isPreview: true,
              });
            }}
            style={({ pressed }) => [
              styles.devButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="code" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Dev: Test Call Screen
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <CreditsStoreModal
        visible={showCreditsStore}
        onClose={() => setShowCreditsStore(false)}
      />

      <AuraInfoModal
        visible={showAuraInfo}
        onClose={() => setShowAuraInfo(false)}
      />

      <GlobalRankingsModal
        visible={showRankings}
        onClose={() => setShowRankings(false)}
      />

      <RefillModal
        visible={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        onRefill={handleRefill}
      />
      
      <ConfirmDialog
        visible={showRefillConfirm}
        title="Refill Matches"
        message={canRefillMatches 
          ? `Spend ${DAILY_MATCHES_REFILL_COST} credits to refill 10 matches?`
          : `You need ${DAILY_MATCHES_REFILL_COST} credits to refill matches. You have ${credits} credits.`}
        confirmText={canRefillMatches ? "Refill" : "Get Credits"}
        cancelText="Cancel"
        onConfirm={canRefillMatches ? handleConfirmRefill : () => {
          setShowRefillConfirm(false);
          setShowRefillModal(false);
          setShowCreditsStore(true);
        }}
        onCancel={() => setShowRefillConfirm(false)}
      />

      <Modal visible={isSearching} transparent animationType="fade">
        <View style={styles.searchingOverlay}>
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[styles.searchingCard, { backgroundColor: theme.surface }]}
          >
            <Animated.View style={[styles.searchingIconContainer, pulseAnimatedStyle]}>
              <Feather name="search" size={48} color={theme.primary} />
            </Animated.View>
            <ThemedText type="h2" style={{ textAlign: "center", marginTop: Spacing.lg }}>
              {selectedMood === "vent" ? "Waiting for a Listener..." : "Connecting..."}
            </ThemedText>
            <ThemedText 
              type="body" 
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              {selectedMood === "vent" 
                ? "Someone will connect with you soon" 
                : "Finding someone who needs to talk"}
            </ThemedText>
            <Pressable
              onPress={handleCancelSearch}
              style={({ pressed }) => [
                styles.cancelButton,
                { backgroundColor: theme.error, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
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
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  logo: {
    width: 28,
    height: 28,
  },
  appName: {
    letterSpacing: 0.3,
  },
  premiumBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  karmaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  creditsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  rankingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  karmaLevelContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  karmaLevelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  levelStreakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  vibeCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  vibeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  vibePrompt: {
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 18,
  },
  missionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  missionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  missionContent: {
    flex: 1,
  },
  headline: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  matchesCounter: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  matchesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  refillBadgeButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: 4,
  },
  cardsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardWrapper: {
    width: "100%",
  },
  moodCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  gradientCard: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: Spacing.md,
  },
  footerText: {
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  refillModalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  refillIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  refillTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  refillDescription: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  refillButton: {
    width: "100%",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  refillButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  waitButton: {
    padding: Spacing.md,
    alignItems: "center",
  },
  searchingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  searchingCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  searchingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: "100%",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  devButtonContainer: {
    marginTop: Spacing.xl,
    alignItems: "center",
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
});
