import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Image, Modal } from "react-native";
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
import { useTheme } from "@/hooks/useTheme";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useSession } from "@/contexts/SessionContext";
import { useCredits, DAILY_MATCHES_REFILL_COST } from "@/contexts/CreditsContext";
import { useKarma } from "@/contexts/KarmaContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

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
          size={40}
          color="#FFFFFF"
        />
      </View>
      <ThemedText
        type="h3"
        style={[
          styles.cardTitle,
          { color: "#FFFFFF" },
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
  const { karma, currentLevel } = useKarma();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showCreditsStore, setShowCreditsStore] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const pulseScale = useSharedValue(1);

  const noMatchesLeft = dailyMatchesLeft <= 0;

  const handleMatchFound = useCallback((match: { callId: string; partnerId: string; duration: number }) => {
    console.log("[MoodSelection] Match found:", match);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSearching(false);
    const currentMood = selectedMood || "vent";
    setSelectedMood(null);
    // Use replace to prevent going back to this screen with stale state
    navigation.replace("ActiveCall", { mood: currentMood, matchId: match.callId });
  }, [navigation, selectedMood]);

  const { state: matchState, matchResult, clearMatchResult, joinQueue, leaveQueue } = useMatchmaking({
    sessionId: session?.id || null,
    onMatchFound: handleMatchFound,
  });

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
    if (noMatchesLeft) {
      setShowRefillModal(true);
      return;
    }
    
    // Use a daily match
    const matchUsed = await useMatch();
    if (!matchUsed) {
      return;
    }
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMood(mood);
    setIsSearching(true);
    
    // Join matchmaking queue
    joinQueue(mood, "direct");
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h4" style={styles.appName}>
            EmoCall
          </ThemedText>
          {isPremium ? (
            <View style={[styles.premiumBadge, { backgroundColor: theme.success }]}>
              <Feather name="star" size={10} color="#FFFFFF" />
            </View>
          ) : null}
        </Animated.View>
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.headerRight}>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              styles.karmaButton,
              {
                backgroundColor: `${theme.error}15`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="heart" size={16} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error, fontWeight: "600" }}>
              {karma}
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
            <Feather name="zap" size={16} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              {credits}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSettingsPress}
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="settings" size={24} color={theme.textSecondary} />
          </Pressable>
        </Animated.View>
      </View>

      <Animated.View 
        entering={FadeIn.delay(350).duration(400)} 
        style={styles.karmaLevelContainer}
      >
        <View style={[styles.karmaLevelBadge, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="award" size={14} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.text, fontWeight: "500" }}>
            Level {currentLevel.level}: {currentLevel.name}
          </ThemedText>
        </View>
      </Animated.View>

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h2" style={styles.headline}>
            How are you feeling?
          </ThemedText>
        </Animated.View>

        <View style={styles.matchesCounter}>
          <Animated.View 
            entering={FadeIn.delay(500).duration(400)}
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
              size={16} 
              color={noMatchesLeft ? theme.error : theme.primary} 
            />
            <ThemedText 
              type="body" 
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
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Refill
                </ThemedText>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>

        <View style={styles.cardsContainer}>
          <MoodCard
            type="vent"
            icon="message-circle"
            title="I Need to Vent"
            onPress={() => handleMoodSelect("vent")}
            delay={600}
            disabled={noMatchesLeft}
          />
          <MoodCard
            type="listen"
            icon="headphones"
            title="I Can Listen"
            onPress={() => handleMoodSelect("listen")}
            delay={800}
            disabled={noMatchesLeft}
          />
        </View>

        <Animated.View entering={FadeIn.delay(1000).duration(500)}>
          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {noMatchesLeft 
              ? "Refill your matches to continue connecting"
              : "Pick your mood. You'll connect in 15 seconds."
            }
          </ThemedText>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View entering={FadeIn.delay(1200).duration(500)}>
          <ThemedText
            type="caption"
            style={[styles.footerText, { color: theme.textDisabled }]}
          >
            Anonymous voice calls for emotional relief
          </ThemedText>
        </Animated.View>
      </View>

      <CreditsStoreModal
        visible={showCreditsStore}
        onClose={() => setShowCreditsStore(false)}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
  },
  appName: {
    letterSpacing: 0.5,
  },
  premiumBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  karmaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  creditsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  karmaLevelContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  karmaLevelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  headline: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  matchesCounter: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  matchesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  refillBadgeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  cardsContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  cardWrapper: {
    width: "100%",
  },
  moodCard: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
  },
  gradientCard: {
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
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
});
