import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LanguageOption } from "@/i18n";

const { width: screenWidth } = Dimensions.get("window");

interface OnboardingLanguageScreenProps {
  onComplete: () => void;
}

interface LanguageItemProps {
  language: LanguageOption;
  isSelected: boolean;
  onSelect: (code: string) => void;
  index: number;
}

function LanguageItem({ language, isSelected, onSelect, index }: LanguageItemProps) {
  const { theme } = useTheme();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(language.code);
  };

  return (
    <Animated.View entering={FadeInUp.delay(100 + index * 30).duration(400)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.languageItem,
          {
            backgroundColor: isSelected ? `${theme.primary}15` : theme.surface,
            borderColor: isSelected ? theme.primary : theme.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={styles.languageInfo}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {language.nativeName}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {language.name}
          </ThemedText>
        </View>
        {isSelected ? (
          <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
            <Feather name="check" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function OnboardingLanguageScreen({ onComplete }: OnboardingLanguageScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentLanguage, setLanguage, languages, completeLanguageSelection, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSelectLanguage = async (code: string) => {
    setSelectedLanguage(code);
    await setLanguage(code);
  };

  const handleContinue = async () => {
    setIsConfirming(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeLanguageSelection();
    onComplete();
  };

  const renderItem = ({ item, index }: { item: LanguageOption; index: number }) => (
    <LanguageItem
      language={item}
      isSelected={item.code === selectedLanguage}
      onSelect={handleSelectLanguage}
      index={index}
    />
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header with logo */}
      <Animated.View
        entering={FadeIn.delay(100).duration(500)}
        style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <ThemedText type="h2" style={styles.title}>
            {t("onboarding.chooseLanguage")}
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("onboarding.selectLanguage")}
          </ThemedText>
        </Animated.View>
      </Animated.View>

      {/* Language list */}
      <FlatList
        data={languages}
        renderItem={renderItem}
        keyExtractor={(item) => item.code}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Continue button */}
      <Animated.View
        entering={FadeInUp.delay(500).duration(400)}
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Button
          onPress={handleContinue}
          disabled={isConfirming}
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
        >
          {isConfirming ? "..." : t("onboarding.continue")}
        </Button>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  languageInfo: {
    flex: 1,
    gap: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    height: Spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  continueButton: {
    width: "100%",
  },
});
