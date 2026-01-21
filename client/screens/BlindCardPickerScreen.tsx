import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Image, FlatList, Alert } from "react-native";
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
  WithSpringConfig,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useCredits, REFRESH_CARDS_COST } from "@/contexts/CreditsContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const CARDS_PER_MOOD = 5;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BlindCardData {
  id: string;
  number: number;
  isUsed: boolean;
  gender?: "male" | "female" | "any";
}

interface BlindCardProps {
  item: BlindCardData;
  index: number;
  onPress: (id: string) => void;
  showGender: boolean;
}

function BlindCard({ item, index, onPress, showGender }: BlindCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateY: `${rotation.value}deg` },
    ],
  }));

  const handlePressIn = () => {
    if (!item.isUsed) {
      scale.value = withSpring(0.96, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!item.isUsed) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = async () => {
    if (!item.isUsed) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      rotation.value = withSequence(
        withSpring(10, { damping: 10 }),
        withSpring(-10, { damping: 10 }),
        withSpring(0, { damping: 10 })
      );
      setTimeout(() => onPress(item.id), 300);
    }
  };

  const getGenderIcon = (gender?: string) => {
    if (gender === "male") return "user";
    if (gender === "female") return "user";
    return "users";
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(400)}
      style={styles.cardContainer}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={item.isUsed}
        style={[
          styles.blindCard,
          {
            backgroundColor: item.isUsed ? theme.backgroundSecondary : theme.surface,
            borderColor: item.isUsed ? theme.border : theme.primary,
            borderWidth: 2,
            opacity: item.isUsed ? 0.5 : 1,
          },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.cardIconContainer,
            {
              backgroundColor: item.isUsed
                ? theme.backgroundTertiary
                : `${theme.primary}15`,
            },
          ]}
        >
          {item.isUsed ? (
            <Feather name="check" size={24} color={theme.textDisabled} />
          ) : (
            <Feather name={getGenderIcon(item.gender)} size={24} color={theme.primary} />
          )}
        </View>
        <View style={styles.cardContent}>
          <ThemedText
            type="body"
            style={[
              styles.cardTitle,
              { color: item.isUsed ? theme.textDisabled : theme.text },
            ]}
          >
            Anonymous Match #{item.number}
          </ThemedText>
          <ThemedText
            type="small"
            style={{ color: item.isUsed ? theme.textDisabled : theme.textSecondary }}
          >
            {item.isUsed 
              ? "Already connected" 
              : showGender && item.gender !== "any"
                ? `${item.gender === "male" ? "Male" : "Female"} - Tap to connect`
                : "Tap to connect"
            }
          </ThemedText>
        </View>
        {!item.isUsed && (
          <Feather name="chevron-right" size={20} color={theme.primary} />
        )}
      </AnimatedPressable>
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
      <Image
        source={require("../../assets/images/empty-matches.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText type="h3" style={styles.emptyTitle}>
        All {moodLabel} Cards Used
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        {canRefresh 
          ? `Refresh your cards for ${REFRESH_CARDS_COST} credits to get 5 new matches!`
          : `Come back tomorrow for 5 new ${moodLabel.toLowerCase()} matches. Or get credits to refresh now!`
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
              Refresh Cards ({REFRESH_CARDS_COST} credits)
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
  const { credits, isPremium, preferredGender, refreshCards } = useCredits();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "BlindCardPicker">>();
  const mood = route.params?.mood || "vent";

  const generateCards = useCallback(() => {
    const genders: ("male" | "female" | "any")[] = ["male", "female", "any"];
    return Array.from({ length: CARDS_PER_MOOD }, (_, i) => ({
      id: `card-${mood}-${i + 1}-${Date.now()}`,
      number: i + 1,
      isUsed: false,
      gender: isPremium 
        ? (preferredGender !== "any" ? preferredGender : genders[Math.floor(Math.random() * 3)])
        : "any" as const,
    }));
  }, [mood, isPremium, preferredGender]);

  const [cards, setCards] = useState<BlindCardData[]>(generateCards);

  const availableCards = cards.filter((card) => !card.isUsed);
  const canRefresh = credits >= REFRESH_CARDS_COST;

  const handleCardPress = (id: string) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id ? { ...card, isUsed: true } : card
      )
    );
    navigation.navigate("ActiveCall", { mood, matchId: id });
  };

  const handleRefreshCards = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!canRefresh) {
      Alert.alert(
        "Not Enough Credits",
        `You need ${REFRESH_CARDS_COST} credits to refresh your daily cards. Purchase credits from the main screen.`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Refresh Cards",
      `Spend ${REFRESH_CARDS_COST} credits to get 5 new matches?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refresh",
          onPress: () => {
            const success = refreshCards();
            if (success) {
              setCards(generateCards());
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item, index }: { item: BlindCardData; index: number }) => (
    <BlindCard 
      item={item} 
      index={index} 
      onPress={handleCardPress}
      showGender={isPremium}
    />
  );

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
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.listHeader}>
            <View style={styles.headerRow}>
              <ThemedText
                type="small"
                style={[styles.remainingText, { color: theme.textSecondary }]}
              >
                {availableCards.length} of {CARDS_PER_MOOD} matches remaining
              </ThemedText>
              {isPremium ? (
                <View style={[styles.premiumBadge, { backgroundColor: theme.success }]}>
                  <Feather name="star" size={10} color="#FFFFFF" />
                  <ThemedText type="caption" style={styles.premiumText}>
                    Premium
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={handleRefreshCards}
              style={({ pressed }) => [
                styles.refreshLink,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="refresh-cw" size={14} color={theme.primary} />
              <ThemedText
                type="small"
                style={{ color: theme.primary, fontWeight: "500" }}
              >
                Refresh ({REFRESH_CARDS_COST} credits)
              </ThemedText>
            </Pressable>
          </Animated.View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listHeader: {
    marginBottom: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
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
  cardContainer: {
    marginBottom: Spacing.md,
  },
  blindCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: Spacing["2xl"],
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
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
