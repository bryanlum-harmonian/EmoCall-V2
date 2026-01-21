import React from "react";
import { View, StyleSheet, Image, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
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

  const handleTermsPress = async () => {
    await Haptics.selectionAsync();
    Alert.alert(
      "Terms of Service",
      "EmoCall Terms of Service\n\n" +
      "1. Age Requirement: You must be 18 years or older to use this service.\n\n" +
      "2. Respectful Communication: Treat all users with respect. No harassment, bullying, hate speech, or discriminatory behavior.\n\n" +
      "3. No Scams or Fraud: Do not attempt to deceive, scam, or defraud other users. This includes phishing, financial scams, or identity theft.\n\n" +
      "4. No Illegal Activities: Do not use EmoCall for any illegal purposes including threats, blackmail, or solicitation of illegal activities.\n\n" +
      "5. No Sexual Content: Explicit sexual content, solicitation, or inappropriate behavior is strictly prohibited.\n\n" +
      "6. Account Suspension: Violation of these terms will result in immediate suspension and may be reported to law enforcement.\n\n" +
      "7. Anonymous but Accountable: While calls are anonymous, device identifiers are tracked for safety and abuse prevention.",
      [{ text: "Close", style: "cancel" }]
    );
  };

  const handlePrivacyPress = async () => {
    await Haptics.selectionAsync();
    Alert.alert(
      "Privacy Policy",
      "EmoCall Privacy Policy\n\n" +
      "Data We Collect:\n" +
      "- Device identifier for abuse prevention\n" +
      "- Usage patterns (call duration, frequency)\n" +
      "- Reports and feedback you submit\n\n" +
      "Data We Don't Collect:\n" +
      "- Personal names or contact information\n" +
      "- Call recordings or transcripts\n" +
      "- Location data\n" +
      "- Photos or media\n\n" +
      "How We Use Data:\n" +
      "- To prevent abuse and enforce community guidelines\n" +
      "- To improve service quality\n" +
      "- To comply with legal requirements\n\n" +
      "Your Privacy Rights:\n" +
      "You can request deletion of your data at any time through the Settings menu.",
      [{ text: "Close", style: "cancel" }]
    );
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
              Connect anonymously with real people in seconds
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
              Safe and moderated for your protection
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(800).duration(500)}
          style={[styles.legalContainer, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather
            name="shield"
            size={20}
            color={theme.textSecondary}
            style={styles.legalIcon}
          />
          <View style={styles.legalContent}>
            <ThemedText
              type="small"
              style={[styles.legalText, { color: theme.textSecondary }]}
            >
              By continuing, you confirm you are 18+ years old and agree to our community guidelines. Harassment, scams, fraud, and abusive behavior are strictly prohibited and may result in permanent ban.
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(900).duration(500)}
          style={styles.linksContainer}
        >
          <Pressable
            onPress={handleTermsPress}
            style={({ pressed }) => [
              styles.linkButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="file-text" size={16} color={theme.primary} />
            <ThemedText
              type="small"
              style={[styles.linkText, { color: theme.primary }]}
            >
              Terms of Service
            </ThemedText>
          </Pressable>

          <View style={[styles.linkDivider, { backgroundColor: theme.border }]} />

          <Pressable
            onPress={handlePrivacyPress}
            style={({ pressed }) => [
              styles.linkButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="lock" size={16} color={theme.primary} />
            <ThemedText
              type="small"
              style={[styles.linkText, { color: theme.primary }]}
            >
              Privacy Policy
            </ThemedText>
          </Pressable>
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
    marginBottom: Spacing["2xl"],
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
    marginBottom: Spacing.xl,
  },
  legalIcon: {
    marginTop: 2,
  },
  legalContent: {
    flex: 1,
  },
  legalText: {
    flex: 1,
  },
  linksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  linkText: {
    fontWeight: "500",
  },
  linkDivider: {
    width: 1,
    height: 16,
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
