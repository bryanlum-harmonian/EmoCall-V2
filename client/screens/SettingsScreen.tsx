import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Switch, Alert, Linking, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
import { TimeBankStoreModal } from "@/components/TimeBankStoreModal";
import { BackupRestoreModal } from "@/components/BackupRestoreModal";
import { BugReportModal } from "@/components/BugReportModal";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useTimeBank } from "@/contexts/TimeBankContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { getApiUrl } from "@/lib/query-client";
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
  const { timeBankMinutes } = useTimeBank();
  const { getCurrentLanguageInfo, t, currentLanguage } = useLanguage();
  const { session } = useSession();

  // Force re-render when language changes by using currentLanguage as key dependency
  void currentLanguage;

  const [blockLastMatch, setBlockLastMatch] = useState(false);
  const [hasLastMatch, setHasLastMatch] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [showCreditsStore, setShowCreditsStore] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);

  // Fetch block status when screen gains focus
  const fetchBlockStatus = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await fetch(
        new URL(`/api/sessions/${session.id}/block-status`, getApiUrl()).toString()
      );
      const data = await response.json();

      if (response.ok) {
        setHasLastMatch(data.hasLastMatch);
        setBlockLastMatch(data.isBlocked);
      }
    } catch (error) {
      console.error("Error fetching block status:", error);
    }
  }, [session?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchBlockStatus();
    }, [fetchBlockStatus])
  );

  const handleBlockToggle = async (value: boolean) => {
    if (!session?.id || !hasLastMatch) return;

    setIsBlockLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const url = new URL(`/api/sessions/${session.id}/block-last-match`, getApiUrl()).toString();
      const response = await fetch(url, {
        method: value ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setBlockLastMatch(value);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(t("common.error"), data.error || t("settings.blockFailed"));
      }
    } catch (error) {
      console.error("Error toggling block:", error);
      Alert.alert(t("common.error"), t("settings.blockFailed"));
    } finally {
      setIsBlockLoading(false);
    }
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
      t("settings.deleteDataTitle"),
      t("settings.deleteDataMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.deleteDataConfirm"),
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(t("settings.dataDeleted"), t("settings.dataDeletedMessage"));
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
        Alert.alert(t("settings.contactSupport"), t("settings.contactSupportEmail", { email }));
      }
    } else {
      Alert.alert(t("settings.contactSupport"), t("settings.contactSupportEmail", { email }));
    }
  };

  const handleOpenLanguage = async () => {
    await Haptics.selectionAsync();
    navigation.navigate("Language");
  };

  const currentLang = getCurrentLanguageInfo();

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
        <SettingsSection title={t("settings.sections.subscription")} delay={50}>
          <SettingsItem
            icon="clock"
            title="Time Bank"
            subtitle={`${Math.round(timeBankMinutes)} minutes available`}
            onPress={() => setShowCreditsStore(true)}
            delay={100}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.sections.language")} delay={200}>
          <SettingsItem
            icon="globe"
            title={t("settings.language")}
            subtitle={currentLang?.nativeName || "English"}
            onPress={handleOpenLanguage}
            delay={250}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.sections.appearance")} delay={300}>
          <SettingsItem
            icon={isDark ? "moon" : "sun"}
            title={t("settings.darkMode")}
            subtitle={isDark ? t("settings.darkModeActive") : t("settings.lightModeActive")}
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

        <SettingsSection title={t("settings.sections.safety")} delay={400}>
          <SettingsItem
            icon="user-x"
            title={t("settings.blockLastMatch")}
            subtitle={hasLastMatch ? t("settings.blockLastMatchSubtitle") : t("settings.noLastMatch")}
            rightElement={
              <Switch
                value={blockLastMatch}
                onValueChange={handleBlockToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
                disabled={!hasLastMatch || isBlockLoading}
              />
            }
            delay={450}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="shield"
            title={t("settings.reportHistory")}
            subtitle={t("settings.reportHistorySubtitle")}
            onPress={() => Alert.alert(t("settings.reportHistory"), t("settings.reportHistoryEmpty"))}
            delay={500}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.sections.legal")} delay={550}>
          <SettingsItem
            icon="file-text"
            title={t("settings.termsOfService")}
            onPress={handleOpenTerms}
            delay={600}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="lock"
            title={t("settings.privacyPolicy")}
            onPress={handleOpenPrivacy}
            delay={650}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="database"
            title={t("settings.dataCollection")}
            subtitle={t("settings.dataCollectionSubtitle")}
            onPress={handleOpenDataCollection}
            delay={700}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.sections.support")} delay={700}>
          <SettingsItem
            icon="mail"
            title={t("settings.contactSupport")}
            subtitle={t("settings.contactSupportSubtitle")}
            onPress={handleContactSupport}
            delay={750}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="alert-circle"
            title={t("settings.reportBug")}
            subtitle={t("settings.reportBugSubtitle")}
            onPress={() => setShowBugReport(true)}
            delay={800}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.sections.account")} delay={800}>
          <SettingsItem
            icon="download-cloud"
            title={t("settings.backupRestore")}
            subtitle={t("settings.backupRestoreSubtitle")}
            onPress={() => setShowBackupRestore(true)}
            delay={850}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="trash-2"
            title={t("settings.deleteData")}
            subtitle={t("settings.deleteDataSubtitle")}
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
            {t("settings.footerVersion", { version: "1.0.0" })}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.footerText, { color: theme.textDisabled }]}
          >
            {t("settings.footerTagline")}
          </ThemedText>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <TimeBankStoreModal
        visible={showCreditsStore}
        onClose={() => setShowCreditsStore(false)}
      />

      <BackupRestoreModal
        visible={showBackupRestore}
        onClose={() => setShowBackupRestore(false)}
        onRestoreSuccess={() => {
          Alert.alert(t("common.success"), t("settings.restoreSuccess"));
        }}
      />

      <BugReportModal
        visible={showBugReport}
        onClose={() => setShowBugReport(false)}
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
  themePreviewRainbow: {
    height: 30,
    flexDirection: "row",
  },
  rainbowStripe: {
    flex: 1,
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
