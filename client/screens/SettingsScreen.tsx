import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, Alert, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { CreditsStoreModal } from "@/components/CreditsStoreModal";
import { BackupRestoreModal } from "@/components/BackupRestoreModal";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useCredits, PREMIUM_MONTHLY_PRICE, PREMIUM_BONUS_CREDITS } from "@/contexts/CreditsContext";
import { Spacing, BorderRadius, AppTheme, AppThemes } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
  isPremium?: boolean;
  delay?: number;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  isDestructive = false,
  isPremium = false,
  delay = 0,
}: SettingsItemProps) {
  const { theme } = useTheme();

  const iconColor = isDestructive 
    ? theme.error 
    : isPremium 
      ? theme.success 
      : theme.primary;
  const textColor = isDestructive ? theme.error : theme.text;

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.settingsItem,
          { backgroundColor: theme.surface, opacity: pressed && onPress ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.settingsIcon, { backgroundColor: `${iconColor}15` }]}>
          <Feather name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.settingsContent}>
          <ThemedText type="body" style={[styles.settingsTitle, { color: textColor }]}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {rightElement ? (
          rightElement
        ) : onPress ? (
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function SettingsSection({ title, children, delay = 0 }: SettingsSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Animated.View entering={FadeIn.delay(delay).duration(400)}>
        <ThemedText
          type="small"
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          {title}
        </ThemedText>
      </Animated.View>
      <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, isDark, appTheme } = useTheme();
  const { colorScheme, setColorScheme, setAppTheme } = useThemeContext();
  const { credits, isPremium, preferredGender, setPremium, setPreferredGender } = useCredits();

  const [blockLastMatch, setBlockLastMatch] = useState(false);
  const [showCreditsStore, setShowCreditsStore] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);

  const handleBlockToggle = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlockLastMatch(value);
  };

  const handleThemeToggle = async (isDarkMode: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setColorScheme(isDarkMode ? "dark" : "light");
  };

  const handleAppThemeChange = async (newTheme: AppTheme) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppTheme(newTheme);
  };

  const handleOpenTerms = async () => {
    await Haptics.selectionAsync();
    navigation.navigate("TermsOfService");
  };

  const handleOpenPrivacy = async () => {
    await Haptics.selectionAsync();
    navigation.navigate("PrivacyPolicy");
  };

  const handleOpenDataCollection = async () => {
    await Haptics.selectionAsync();
    navigation.navigate("DataCollection");
  };

  const handleDeleteData = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete My Data",
      "This will permanently delete all your local data including blocked matches. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Data Deleted", "All your local data has been removed.");
          },
        },
      ]
    );
  };

  const handleContactSupport = async () => {
    await Haptics.selectionAsync();
    const email = "support@emocall.app";
    const url = `mailto:${email}`;
    
    if (Platform.OS !== "web") {
      try {
        await Linking.openURL(url);
      } catch (error) {
        Alert.alert("Contact Support", `Email us at ${email}`);
      }
    } else {
      Alert.alert("Contact Support", `Email us at ${email}`);
    }
  };

  const handlePremiumSubscribe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPremium) {
      Alert.alert("Premium Active", "You already have an active premium subscription.");
      return;
    }
    Alert.alert(
      "Subscribe to Premium",
      `$${PREMIUM_MONTHLY_PRICE}/month includes:\n\n- ${PREMIUM_BONUS_CREDITS} bonus credits ($2 value)\n- Gender filter on daily cards\n- Priority matching\n\nFor this demo, premium will be activated for free.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Subscribe",
          onPress: () => {
            setPremium(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleGenderFilterPress = async () => {
    await Haptics.selectionAsync();
    if (!isPremium) {
      Alert.alert(
        "Premium Feature",
        "Gender filter is a premium feature. Subscribe to unlock it.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go Premium", onPress: handlePremiumSubscribe },
        ]
      );
      return;
    }
    
    Alert.alert(
      "Gender Preference",
      "Choose who you'd like to match with:",
      [
        { text: "Anyone", onPress: () => setPreferredGender("any") },
        { text: "Male Only", onPress: () => setPreferredGender("male") },
        { text: "Female Only", onPress: () => setPreferredGender("female") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const getGenderLabel = () => {
    if (!isPremium) return "Premium only";
    switch (preferredGender) {
      case "male": return "Male only";
      case "female": return "Female only";
      default: return "Anyone";
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <SettingsSection title="SUBSCRIPTION" delay={50}>
          <SettingsItem
            icon="star"
            title={isPremium ? "Premium Active" : "Go Premium"}
            subtitle={isPremium ? `$${PREMIUM_MONTHLY_PRICE}/month - Renews monthly` : `$${PREMIUM_MONTHLY_PRICE}/month for exclusive features`}
            onPress={handlePremiumSubscribe}
            isPremium={isPremium}
            delay={100}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="zap"
            title="Credits"
            subtitle={`${credits} credits available`}
            onPress={() => setShowCreditsStore(true)}
            delay={150}
          />
        </SettingsSection>

        <SettingsSection title="PREMIUM FEATURES" delay={200}>
          <SettingsItem
            icon="users"
            title="Gender Filter"
            subtitle={getGenderLabel()}
            onPress={handleGenderFilterPress}
            isPremium={isPremium}
            rightElement={
              isPremium ? (
                <View style={[styles.filterBadge, { backgroundColor: `${theme.success}20` }]}>
                  <ThemedText type="small" style={{ color: theme.success }}>
                    {preferredGender === "any" ? "All" : preferredGender === "male" ? "M" : "F"}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.lockBadge, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="lock" size={14} color={theme.textSecondary} />
                </View>
              )
            }
            delay={250}
          />
        </SettingsSection>

        <SettingsSection title="APPEARANCE" delay={300}>
          <Animated.View entering={FadeInUp.delay(320).duration(400)}>
            <View style={styles.themePickerContainer}>
              <ThemedText type="body" style={[styles.themePickerLabel, { color: theme.text }]}>
                App Theme
              </ThemedText>
              <View style={styles.themePicker}>
                <Pressable
                  onPress={() => handleAppThemeChange("sunny")}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      borderColor: appTheme === "sunny" ? theme.primary : theme.border,
                      borderWidth: appTheme === "sunny" ? 3 : 1,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.themePreview}>
                    <View style={[styles.themePreviewTop, { backgroundColor: "#FFF8E7" }]} />
                    <View style={styles.themePreviewBottom}>
                      <View style={[styles.themePreviewCard, { backgroundColor: "#FFB3C6" }]} />
                      <View style={[styles.themePreviewCard, { backgroundColor: "#A8E6CF" }]} />
                    </View>
                  </View>
                  <ThemedText type="small" style={{ color: theme.text, fontWeight: appTheme === "sunny" ? "700" : "400" }}>
                    Sunny
                  </ThemedText>
                  {appTheme === "sunny" ? (
                    <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                      <Feather name="check" size={12} color="#5A4A42" />
                    </View>
                  ) : null}
                </Pressable>

                <Pressable
                  onPress={() => handleAppThemeChange("coral")}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      borderColor: appTheme === "coral" ? "#FF6B4A" : theme.border,
                      borderWidth: appTheme === "coral" ? 3 : 1,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.themePreview}>
                    <View style={[styles.themePreviewTop, { backgroundColor: "#FFB8D0" }]} />
                    <View style={styles.themePreviewBottom}>
                      <View style={[styles.themePreviewCard, { backgroundColor: "#FF6B4A" }]} />
                      <View style={[styles.themePreviewCard, { backgroundColor: "#4CAF50" }]} />
                    </View>
                  </View>
                  <ThemedText type="small" style={{ color: theme.text, fontWeight: appTheme === "coral" ? "700" : "400" }}>
                    Coral
                  </ThemedText>
                  {appTheme === "coral" ? (
                    <View style={[styles.checkBadge, { backgroundColor: "#FF6B4A" }]}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>
          </Animated.View>
          <View style={[styles.divider, { backgroundColor: theme.border, marginLeft: 0 }]} />
          <SettingsItem
            icon={isDark ? "moon" : "sun"}
            title="Dark Mode"
            subtitle={isDark ? "Dark theme is active" : "Light theme is active"}
            rightElement={
              <Switch
                value={colorScheme === "dark"}
                onValueChange={handleThemeToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            }
            delay={350}
          />
        </SettingsSection>

        <SettingsSection title="SAFETY" delay={400}>
          <SettingsItem
            icon="user-x"
            title="Block Last Match"
            subtitle="Prevent matching with your last conversation partner"
            rightElement={
              <Switch
                value={blockLastMatch}
                onValueChange={handleBlockToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            }
            delay={450}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="shield"
            title="Report History"
            subtitle="View your submitted reports"
            onPress={() => Alert.alert("Report History", "No reports submitted yet.")}
            delay={500}
          />
        </SettingsSection>

        <SettingsSection title="LEGAL" delay={550}>
          <SettingsItem
            icon="file-text"
            title="Terms of Service"
            onPress={handleOpenTerms}
            delay={600}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="lock"
            title="Privacy Policy"
            onPress={handleOpenPrivacy}
            delay={650}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="database"
            title="Data Collection"
            subtitle="What data we collect and why"
            onPress={handleOpenDataCollection}
            delay={700}
          />
        </SettingsSection>

        <SettingsSection title="SUPPORT" delay={700}>
          <SettingsItem
            icon="mail"
            title="Contact Support"
            subtitle="Get help with the app"
            onPress={handleContactSupport}
            delay={750}
          />
        </SettingsSection>

        <SettingsSection title="ACCOUNT" delay={800}>
          <SettingsItem
            icon="download-cloud"
            title="Backup & Restore"
            subtitle="Save or recover your session"
            onPress={() => setShowBackupRestore(true)}
            delay={850}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="trash-2"
            title="Delete My Data"
            subtitle="Permanently remove all local data"
            onPress={handleDeleteData}
            isDestructive
            delay={900}
          />
        </SettingsSection>

        <Animated.View
          entering={FadeIn.delay(900).duration(400)}
          style={styles.footer}
        >
          <ThemedText
            type="caption"
            style={[styles.footerText, { color: theme.textDisabled }]}
          >
            EmoCall v1.0.0
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.footerText, { color: theme.textDisabled }]}
          >
            No Names. No Judgement. Just Talk.
          </ThemedText>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <CreditsStoreModal
        visible={showCreditsStore}
        onClose={() => setShowCreditsStore(false)}
      />

      <BackupRestoreModal
        visible={showBackupRestore}
        onClose={() => setShowBackupRestore(false)}
        onRestoreSuccess={() => {
          Alert.alert("Success", "Your session has been restored successfully!");
        }}
      />
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  settingsTitle: {
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 36 + Spacing.md,
  },
  filterBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    textAlign: "center",
  },
  themePickerContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  themePickerLabel: {
    fontWeight: "500",
  },
  themePicker: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  themeOption: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
    position: "relative",
  },
  themePreview: {
    width: "100%",
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  themePreviewTop: {
    height: 30,
  },
  themePreviewBottom: {
    flex: 1,
    flexDirection: "row",
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  themePreviewCard: {
    flex: 1,
    borderRadius: BorderRadius.sm,
  },
  checkBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
