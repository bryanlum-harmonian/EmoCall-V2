import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type EndReason = "timeout" | "ended" | "reported" | "disconnected" | "partner_ended" | "partner_left";

const getEndReasonContent = (reason: EndReason) => {
  switch (reason) {
    case "timeout":
      return {
        icon: "clock" as const,
        title: "Time's Up",
        message: "Your free session has ended. Hope you found some relief!",
      };
    case "ended":
      return {
        icon: "phone-off" as const,
        title: "Call Ended",
        message: "Thanks for connecting. Every conversation matters.",
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
        message: "Thanks for using EmoCall.",
      };
  }
};

export default function CallEndedScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CallEnded">>();
  
  const reason = route.params?.reason || "ended";
  const content = getEndReasonContent(reason);

  const handleTryAgain = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace("MoodSelection");
  };

  const handleGoHome = async () => {
    await Haptics.selectionAsync();
    navigation.replace("MoodSelection");
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["6xl"],
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
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
            <Feather name={content.icon} size={40} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h2" style={styles.title}>
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

        <Animated.View
          entering={FadeInUp.delay(800).duration(500)}
          style={styles.statsContainer}
        >
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="users" size={24} color={theme.primary} />
            <ThemedText type="h4" style={styles.statValue}>
              127
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary }}
            >
              People connected today
            </ThemedText>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View
          entering={FadeInUp.delay(1000).duration(500)}
          style={styles.actions}
        >
          <Button
            onPress={handleTryAgain}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          >
            Start Another Call
          </Button>
        </Animated.View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  message: {
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing["3xl"],
  },
  statsContainer: {
    width: "100%",
  },
  statCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  statValue: {
    marginTop: Spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    width: "100%",
    gap: Spacing.md,
  },
  primaryButton: {
    width: "100%",
  },
});
