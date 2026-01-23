import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.xl,
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
            <Feather name={content.icon} size={28} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h3" style={styles.title}>
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
            <Feather name="users" size={20} color={theme.primary} />
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
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  message: {
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  statsContainer: {
    width: "100%",
  },
  statCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    marginTop: 2,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xl,
  },
  actions: {
    width: "100%",
    gap: Spacing.md,
    marginTop: "auto",
  },
  primaryButton: {
    width: "100%",
  },
});
