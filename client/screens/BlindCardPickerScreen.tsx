import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image, FlatList } from "react-native";
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
import { useTheme } from "@/hooks/useTheme";
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
}

interface BlindCardProps {
  item: BlindCardData;
  index: number;
  onPress: (id: string) => void;
}

function BlindCard({ item, index, onPress }: BlindCardProps) {
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
            <Feather name="user" size={24} color={theme.primary} />
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
            {item.isUsed ? "Already connected" : "Tap to connect"}
          </ThemedText>
        </View>
        {!item.isUsed && (
          <Feather name="chevron-right" size={20} color={theme.primary} />
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

function EmptyState({ mood }: { mood: "vent" | "listen" }) {
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
        Come back tomorrow for 5 new {moodLabel.toLowerCase()} matches. Fresh connections await!
      </ThemedText>
    </Animated.View>
  );
}

export default function BlindCardPickerScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "BlindCardPicker">>();
  const mood = route.params?.mood || "vent";

  const [cards, setCards] = useState<BlindCardData[]>(() =>
    Array.from({ length: CARDS_PER_MOOD }, (_, i) => ({
      id: `card-${mood}-${i + 1}`,
      number: i + 1,
      isUsed: false,
    }))
  );

  const availableCards = cards.filter((card) => !card.isUsed);

  const handleCardPress = (id: string) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id ? { ...card, isUsed: true } : card
      )
    );
    navigation.navigate("ActiveCall", { mood, matchId: id });
  };

  const renderCard = ({ item, index }: { item: BlindCardData; index: number }) => (
    <BlindCard item={item} index={index} onPress={handleCardPress} />
  );

  if (availableCards.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState mood={mood} />
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
            <ThemedText
              type="small"
              style={[styles.remainingText, { color: theme.textSecondary }]}
            >
              {availableCards.length} of {CARDS_PER_MOOD} matches remaining today
            </ThemedText>
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
  },
  remainingText: {
    textAlign: "center",
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
  },
});
