import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface StarRatingProps {
  label: string;
  rating: number;
  onRatingChange: (rating: number) => void;
  maxStars?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Star({
  filled,
  onPress,
  color,
  index,
}: {
  filled: boolean;
  onPress: () => void;
  color: string;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    scale.value = withSpring(1.3, { damping: 8 }, () => {
      scale.value = withSpring(1);
    });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[styles.star, animatedStyle]}
      testID={`star-${index}`}
    >
      <Feather
        name={filled ? "star" : "star"}
        size={32}
        color={filled ? "#FFD700" : color}
        style={filled ? undefined : { opacity: 0.3 }}
      />
    </AnimatedPressable>
  );
}

export function StarRating({
  label,
  rating,
  onRatingChange,
  maxStars = 5,
}: StarRatingProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="body" style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View style={styles.starsContainer}>
        {Array.from({ length: maxStars }, (_, index) => (
          <Star
            key={index}
            index={index + 1}
            filled={index < rating}
            onPress={() => onRatingChange(index + 1)}
            color={theme.textDisabled}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  label: {
    flex: 1,
    fontWeight: "500",
  },
  starsContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  star: {
    padding: 2,
  },
});
