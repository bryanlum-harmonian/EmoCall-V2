import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
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
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CreditsStoreModal } from "@/components/CreditsStoreModal";
import { useTheme } from "@/hooks/useTheme";
import { useCredits } from "@/contexts/CreditsContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type MoodType = "vent" | "listen";

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
}

function MoodCard({ type, icon, title, onPress, delay }: MoodCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const isVent = type === "vent";

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(500)} style={styles.cardWrapper}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.moodCard,
          {
            backgroundColor: isVent ? theme.primary : theme.surface,
            borderWidth: isVent ? 0 : 2,
            borderColor: theme.border,
          },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isVent ? "rgba(255,255,255,0.2)" : theme.backgroundSecondary,
            },
          ]}
        >
          <Feather
            name={icon}
            size={40}
            color={isVent ? "#FFFFFF" : theme.primary}
          />
        </View>
        <ThemedText
          type="h3"
          style={[
            styles.cardTitle,
            { color: isVent ? "#FFFFFF" : theme.text },
          ]}
        >
          {title}
        </ThemedText>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function MoodSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { credits, isPremium } = useCredits();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showCreditsStore, setShowCreditsStore] = useState(false);

  const handleMoodSelect = (mood: MoodType) => {
    navigation.navigate("BlindCardPicker", { mood });
  };

  const handleSettingsPress = async () => {
    await Haptics.selectionAsync();
    navigation.navigate("Settings");
  };

  const handleCreditsPress = async () => {
    await Haptics.selectionAsync();
    setShowCreditsStore(true);
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

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <ThemedText type="h2" style={styles.headline}>
            How are you feeling?
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <MoodCard
            type="vent"
            icon="message-circle"
            title="I Need to Vent"
            onPress={() => handleMoodSelect("vent")}
            delay={600}
          />
          <MoodCard
            type="listen"
            icon="headphones"
            title="I Can Listen"
            onPress={() => handleMoodSelect("listen")}
            delay={800}
          />
        </View>

        <Animated.View entering={FadeIn.delay(1000).duration(500)}>
          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Pick your mood. You'll connect in 15 seconds.
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
    paddingBottom: Spacing.lg,
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
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  headline: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  cardsContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  cardWrapper: {
    width: "100%",
  },
  moodCard: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius["2xl"],
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
});
