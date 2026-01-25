import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LanguageOption } from "@/i18n";

interface LanguageItemProps {
  language: LanguageOption;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

function LanguageItem({ language, isSelected, onSelect }: LanguageItemProps) {
  const { theme } = useTheme();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(language.code);
  };

  return (
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
  );
}

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const handleSelectLanguage = async (code: string) => {
    setSelectedLanguage(code);
    await setLanguage(code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderItem = ({ item }: { item: LanguageOption }) => (
    <LanguageItem
      language={item}
      isSelected={item.code === selectedLanguage}
      onSelect={handleSelectLanguage}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {t("settings.language")}
        </ThemedText>
      </Animated.View>

      <FlatList
        data={languages}
        renderItem={renderItem}
        keyExtractor={(item) => item.code}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
});
