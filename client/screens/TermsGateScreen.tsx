import React from "react";
import { View, StyleSheet, Image, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface TermsGateScreenProps {
  onAccept: () => void;
}

export default function TermsGateScreen({ onAccept }: TermsGateScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const handleAccept = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept();
  };

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing["6xl"] + Spacing.buttonHeight,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={[styles.iconContainer, animatedIconStyle]}
        >
          <Image
            source={require("../../assets/images/shield-checkmark.png")}
            style={styles.shieldIcon}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h1" style={styles.headline}>
            No Names.{"\n"}No Judgement.{"\n"}Just Talk.
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          style={styles.termsContainer}
        >
          <View style={styles.termItem}>
            <View
              style={[styles.termBullet, { backgroundColor: theme.primary }]}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <ThemedText type="body" style={styles.termText}>
              Connect anonymously with real people in 15 seconds
            </ThemedText>
          </View>

          <View style={styles.termItem}>
            <View
              style={[styles.termBullet, { backgroundColor: theme.primary }]}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <ThemedText type="body" style={styles.termText}>
              5-minute voice calls, no personal data required
            </ThemedText>
          </View>

          <View style={styles.termItem}>
            <View
              style={[styles.termBullet, { backgroundColor: theme.primary }]}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <ThemedText type="body" style={styles.termText}>
              Your device ID is tracked for safety purposes only
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(800).duration(500)}
          style={[styles.legalContainer, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather
            name="alert-circle"
            size={20}
            color={theme.textSecondary}
            style={styles.legalIcon}
          />
          <ThemedText
            type="small"
            style={[styles.legalText, { color: theme.textSecondary }]}
          >
            By continuing, you confirm you are 18+ years old. Harassment and
            illegal activities will be reported to authorities (PDRM). We comply
            with Malaysian Communications and Multimedia Commission (MCMC)
            regulations.
          </ThemedText>
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInUp.delay(1000).duration(500)}
        style={[
          styles.buttonContainer,
          {
            paddingBottom: insets.bottom + Spacing.xl,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Button
          onPress={handleAccept}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          Agree & Enter
        </Button>
      </Animated.View>
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
  content: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: Spacing["3xl"],
  },
  shieldIcon: {
    width: 100,
    height: 100,
  },
  headline: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  termsContainer: {
    width: "100%",
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  termItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  termBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  termText: {
    flex: 1,
  },
  legalContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  legalIcon: {
    marginTop: 2,
  },
  legalText: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  button: {
    width: "100%",
  },
});
