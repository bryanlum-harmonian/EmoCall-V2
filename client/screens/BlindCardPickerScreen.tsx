import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Pressable, Image, Dimensions, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  WithSpringConfig,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useSession } from "@/contexts/SessionContext";
import { useCredits, REFRESH_CARDS_COST } from "@/contexts/CreditsContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_SIZE = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const CARDS_PER_MOOD = 10;

const CARD_GRADIENTS = [
  ["#FFB3C6", "#FF8FAB"],
  ["#A8E6CF", "#7DD3B8"],
  ["#A8D8EA", "#7BC4DC"],
  ["#FFD93D", "#FFC000"],
  ["#DDA0DD", "#CD90CD"],
  ["#FFB347", "#FFA033"],
  ["#98D8C8", "#7CC4B4"],
  ["#F7DC6F", "#F4D03F"],
  ["#BB8FCE", "#A569BD"],
  ["#85C1E9", "#5DADE2"],
];

const CARD_PATTERNS = [
  "circle",
  "diamond",
  "wave",
  "dots",
  "lines",
  "stars",
  "circle",
  "diamond",
  "dots",
  "lines",
];

interface BlindCardData {
  id: string;
  number: number;
  isUsed: boolean;
  isFlipping: boolean;
  gradient: string[];
  pattern: string;
  gender?: "male" | "female" | "any";
}

interface BlindCardProps {
  item: BlindCardData;
  index: number;
  onPress: (id: string) => void;
  showGender: boolean;
}

function CardPattern({ pattern, color }: { pattern: string; color: string }) {
  const opacity = 0.15;
  
  switch (pattern) {
    case "circle":
      return (
        <View style={styles.patternContainer}>
          <View style={[styles.patternCircle, { backgroundColor: color, opacity }]} />
          <View style={[styles.patternCircleSmall, { backgroundColor: color, opacity: opacity * 0.7 }]} />
        </View>
      );
    case "diamond":
      return (
        <View style={styles.patternContainer}>
          <View style={[styles.patternDiamond, { backgroundColor: color, opacity }]} />
        </View>
      );
    case "dots":
      return (
        <View style={styles.dotsPattern}>
          {Array(9).fill(0).map((_, i) => (
            <View key={i} style={[styles.patternDot, { backgroundColor: color, opacity }]} />
          ))}
        </View>
      );
    case "lines":
      return (
        <View style={styles.linesPattern}>
          {Array(4).fill(0).map((_, i) => (
            <View key={i} style={[styles.patternLine, { backgroundColor: color, opacity }]} />
          ))}
        </View>
      );
    default:
      return (
        <View style={styles.patternContainer}>
          <Feather name="help-circle" size={48} color={color} style={{ opacity }} />
        </View>
      );
  }
}

function BlindCard({ item, index, onPress, showGender }: BlindCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const rotateY = useSharedValue(0);
  const flipProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { perspective: 1000 },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 0]),
    backfaceVisibility: "hidden" as const,
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.5, 1], [0, 0, 1]),
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: "hidden" as const,
  }));

  const handlePressIn = () => {
    if (!item.isUsed && !item.isFlipping) {
      scale.value = withSpring(0.95, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!item.isUsed && !item.isFlipping) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const triggerFlip = useCallback(() => {
    onPress(item.id);
  }, [item.id, onPress]);

  const handlePress = async () => {
    if (!item.isUsed && !item.isFlipping) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      scale.value = withSequence(
        withTiming(1.05, { duration: 100 }),
        withSpring(1, springConfig)
      );
      
      flipProgress.value = withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) });
      rotateY.value = withSequence(
        withTiming(90, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(180, { duration: 200, easing: Easing.inOut(Easing.ease) }, () => {
          runOnJS(triggerFlip)();
        })
      );
    }
  };

  const row = Math.floor(index / 2);
  const col = index % 2;
  const delay = row * 100 + col * 50;

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400)}
      style={styles.cardGridItem}
    >
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={item.isUsed || item.isFlipping}
          style={styles.cardPressable}
          testID={`card-${index}`}
        >
          <Animated.View style={[styles.blindCard, frontAnimatedStyle]}>
            <LinearGradient
              colors={item.isUsed ? [theme.backgroundSecondary, theme.backgroundTertiary] : item.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.cardGradient,
                item.isUsed && { opacity: 0.5 },
              ]}
            >
              <CardPattern pattern={item.pattern} color="#FFFFFF" />
              
              {item.isUsed ? (
                <View style={styles.usedOverlay}>
                  <View style={[styles.checkCircle, { backgroundColor: theme.success }]}>
                    <Feather name="check" size={24} color="#FFFFFF" />
                  </View>
                  <ThemedText type="small" style={styles.usedText}>
                    Connected
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.cardFaceContent}>
                  <View style={styles.mysteryIcon}>
                    <Feather name="help-circle" size={32} color="#FFFFFF" />
                  </View>
                  <ThemedText type="caption" style={styles.tapText}>
                    Tap to reveal
                  </ThemedText>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          <Animated.View 
            style={[styles.cardBack, backAnimatedStyle]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={[theme.success, "#3DBDB4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.connectingContent}>
                <Feather name="phone-call" size={32} color="#FFFFFF" />
                <ThemedText type="body" style={styles.connectingText}>
                  Connecting...
                </ThemedText>
              </View>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

interface EmptyStateProps {
  mood: "vent" | "listen";
  onRefresh: () => void;
  canRefresh: boolean;
  credits: number;
}

function EmptyState({ mood, onRefresh, canRefresh, credits }: EmptyStateProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const moodLabel = mood === "vent" ? "Vent" : "Listen";

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[
        styles.emptyState,
        {
          paddingTop: headerHeight + Spacing["4xl"],
          paddingBottom: insets.bottom + Spacing["4xl"],
        },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: `${theme.primary}15` }]}>
        <Feather name="layers" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        All Cards Revealed
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        {canRefresh 
          ? `Refill your deck for ${REFRESH_CARDS_COST} credits to discover more connections!`
          : `Come back tomorrow for new ${moodLabel.toLowerCase()} matches. Or get credits to refill now!`
        }
      </ThemedText>
      
      <View style={styles.refreshButtonContainer}>
        <Button
          onPress={onRefresh}
          style={[
            styles.refreshButton,
            { backgroundColor: canRefresh ? theme.primary : theme.backgroundSecondary },
          ]}
        >
          <View style={styles.refreshButtonContent}>
            <Feather 
              name="refresh-cw" 
              size={18} 
              color={canRefresh ? "#FFFFFF" : theme.textSecondary} 
            />
            <ThemedText
              type="body"
              style={{ 
                color: canRefresh ? "#FFFFFF" : theme.textSecondary,
                fontWeight: "600",
              }}
            >
              Refill Deck ({REFRESH_CARDS_COST} credits)
            </ThemedText>
          </View>
        </Button>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
        >
          Your balance: {credits} credits
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export default function BlindCardPickerScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { session } = useSession();
  const { credits, dailyMatchesLeft, isPremium, preferredGender, refreshCards, useMatch } = useCredits();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "BlindCardPicker">>();
  const mood = route.params?.mood || "vent";

  const [isSearching, setIsSearching] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const { state: matchState, queuePosition, matchResult, clearMatchResult, joinQueue, leaveQueue } = useMatchmaking({
    sessionId: session?.id || null,
  });

  useEffect(() => {
    if (matchResult) {
      console.log("[BlindCardPicker] Match found (via state)! Navigating with callId:", matchResult.callId);
      setIsSearching(false);
      setSelectedCardId(null);
      clearMatchResult();
      // Use replace to prevent going back to this screen with stale state
      navigation.replace("ActiveCall", { mood, matchId: matchResult.callId });
    }
  }, [matchResult, clearMatchResult, navigation, mood]);

  const generateCards = useCallback((cardCount: number) => {
    const genders: ("male" | "female" | "any")[] = ["male", "female", "any"];
    return Array.from({ length: cardCount }, (_, i) => ({
      id: `card-${mood}-${i + 1}-${Date.now()}`,
      number: i + 1,
      isUsed: false,
      isFlipping: false,
      gradient: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
      pattern: CARD_PATTERNS[i % CARD_PATTERNS.length],
      gender: isPremium 
        ? (preferredGender !== "any" ? preferredGender : genders[Math.floor(Math.random() * 3)])
        : "any" as const,
    }));
  }, [mood, isPremium, preferredGender]);

  const [cards, setCards] = useState<BlindCardData[]>(() => generateCards(dailyMatchesLeft));

  const availableCards = cards.filter((card) => !card.isUsed);
  const canRefresh = credits >= REFRESH_CARDS_COST;

  const handleCardPress = (id: string) => {
    if (isSearching) return;
    
    setCards((prev) =>
      prev.map((card) =>
        card.id === id ? { ...card, isFlipping: true } : card
      )
    );

    setTimeout(() => {
      useMatch();
      setCards((prev) =>
        prev.map((card) =>
          card.id === id ? { ...card, isUsed: true, isFlipping: false } : card
        )
      );
      
      setSelectedCardId(id);
      setIsSearching(true);
      console.log("[BlindCardPicker] Joining queue with mood:", mood, "cardId:", id);
      joinQueue(mood, id);
    }, 500);
  };

  const handleCancelSearch = () => {
    console.log("[BlindCardPicker] Cancelling search");
    leaveQueue();
    setIsSearching(false);
    setSelectedCardId(null);
    if (selectedCardId) {
      setCards((prev) =>
        prev.map((card) =>
          card.id === selectedCardId ? { ...card, isUsed: false } : card
        )
      );
    }
  };

  const handleRefreshCards = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!canRefresh) {
      Alert.alert(
        "Not Enough Credits",
        `You need ${REFRESH_CARDS_COST} credits to shuffle new cards. Purchase credits from the main screen.`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Shuffle New Deck",
      `Spend ${REFRESH_CARDS_COST} credits to get 6 new mystery cards?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Shuffle",
          onPress: async () => {
            const success = await refreshCards();
            if (success) {
              setCards(generateCards(CARDS_PER_MOOD));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  if (isSearching) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.searchingContainer, { paddingTop: headerHeight + Spacing.xl }]}>
          <Animated.View 
            entering={FadeIn.duration(300)} 
            style={styles.searchingContent}
          >
            <View style={[styles.searchingCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Animated.View
                style={styles.searchingIconContainer}
              >
                <Feather name="search" size={48} color={theme.primary} />
              </Animated.View>
              <ThemedText type="h2" style={{ textAlign: "center", marginTop: Spacing.lg }}>
                Finding Your Match...
              </ThemedText>
              <ThemedText 
                type="body" 
                style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
              >
                {mood === "vent" 
                  ? "Looking for someone ready to listen" 
                  : "Looking for someone who needs to talk"}
              </ThemedText>
              {queuePosition !== null && queuePosition > 0 ? (
                <ThemedText 
                  type="caption" 
                  style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.md }}
                >
                  Queue position: {queuePosition}
                </ThemedText>
              ) : null}
              <Button
                onPress={handleCancelSearch}
                style={[styles.cancelButton, { backgroundColor: theme.error }]}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Cancel
                </ThemedText>
              </Button>
            </View>
          </Animated.View>
        </View>
      </ThemedView>
    );
  }

  if (availableCards.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState 
          mood={mood} 
          onRefresh={handleRefreshCards}
          canRefresh={canRefresh}
          credits={credits}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.listHeader}>
          <View style={styles.headerRow}>
            <View style={[styles.deckBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="layers" size={16} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                The Blind Deck
              </ThemedText>
            </View>
            {isPremium ? (
              <View style={[styles.premiumBadge, { backgroundColor: theme.success }]}>
                <Feather name="star" size={10} color="#FFFFFF" />
                <ThemedText type="caption" style={styles.premiumText}>
                  Premium
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText
            type="small"
            style={[styles.remainingText, { color: theme.textSecondary }]}
          >
            {availableCards.length} cards remaining - tap to reveal your match
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsGrid}>
          {cards.map((card, index) => (
            <BlindCard 
              key={card.id}
              item={card} 
              index={index} 
              onPress={handleCardPress}
              showGender={isPremium}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  searchingContent: {
    width: "100%",
    maxWidth: 320,
  },
  searchingCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  searchingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  listHeader: {
    marginBottom: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  deckBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  remainingText: {
    textAlign: "center",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  premiumText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  refreshLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  cardGridItem: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.3,
  },
  cardWrapper: {
    flex: 1,
  },
  cardPressable: {
    flex: 1,
  },
  blindCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  cardGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  patternContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  patternCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  patternCircleSmall: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 10,
    right: 10,
  },
  patternDiamond: {
    width: 80,
    height: 80,
    transform: [{ rotate: "45deg" }],
    borderRadius: 8,
  },
  dotsPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 15,
  },
  patternDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  linesPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  patternLine: {
    height: 4,
    borderRadius: 2,
    width: "100%",
  },
  cardFaceContent: {
    alignItems: "center",
    gap: Spacing.md,
    zIndex: 1,
  },
  mysteryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tapText: {
    color: "#FFFFFF",
    fontWeight: "500",
    opacity: 0.9,
  },
  usedOverlay: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  usedText: {
    color: "#FFFFFF",
    fontWeight: "500",
    opacity: 0.8,
  },
  cardBack: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  connectingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  connectingText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  refreshButtonContainer: {
    alignItems: "center",
    width: "100%",
  },
  refreshButton: {
    width: "100%",
  },
  refreshButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
