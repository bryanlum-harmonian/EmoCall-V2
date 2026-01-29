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
import { TimeBankStoreModal } from "@/components/TimeBankStoreModal";
import { BackupRestoreModal } from "@/components/BackupRestoreModal";
import { BugReportModal } from "@/components/BugReportModal";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useTimeBank, PREMIUM_MONTHLY_PRICE, PREMIUM_BONUS_MINUTES } from "@/contexts/TimeBankContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { timeBankMinutes, isPremium, setPremium } = useTimeBank();
  const { getCurrentLanguageInfo, t, currentLanguage } = useLanguage();
  
  // Force re-render when language changes by using currentLanguage as key dependency
  void currentLanguage;

  const [blockLastMatch, setBlockLastMatch] = useState(false);
  const [showCreditsStore, setShowCreditsStore] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);

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

  const handlePremiumSubscribe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPremium) {
      Alert.alert(t("settings.premiumAlreadyActive"), t("settings.premiumAlreadyActiveMessage"));
      return;
    }
    Alert.alert(
      t("settings.subscribeToPremium"),
      t("settings.subscribeToPremiumMessage", { price: PREMIUM_MONTHLY_PRICE, credits: PREMIUM_BONUS_MINUTES }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.subscribe"),
          onPress: () => {
            setPremium(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
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
            icon="star"
            title={isPremium ? t("settings.premiumActive") : t("settings.goPremium")}
            subtitle={isPremium ? t("settings.premiumActiveSubtitle", { price: PREMIUM_MONTHLY_PRICE }) : t("settings.goPremiumSubtitle", { price: PREMIUM_MONTHLY_PRICE })}
            onPress={handlePremiumSubscribe}
            isPremium={isPremium}
            delay={100}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="clock"
            title="Time Bank"
            subtitle={`${Math.round(timeBankMinutes)} minutes available`}
            onPress={() => setShowCreditsStore(true)}
            delay={150}
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
          <Animated.View entering={FadeInUp.delay(320).duration(400)}>
            <View style={styles.themePickerContainer}>
              <ThemedText type="body" style={[styles.themePickerLabel, { color: theme.text }]}>
                {t("settings.appTheme")}
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
                    {t("settings.themeSunny")}
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
                    {t("settings.themeCoral")}
                  </ThemedText>
                  {appTheme === "coral" ? (
                    <View style={[styles.checkBadge, { backgroundColor: "#FF6B4A" }]}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  ) : null}
                </Pressable>

                <Pressable
                  onPress={() => handleAppThemeChange("rainbow")}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      borderColor: appTheme === "rainbow" ? "#FF3366" : theme.border,
                      borderWidth: appTheme === "rainbow" ? 3 : 1,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.themePreview}>
                    <View style={styles.themePreviewRainbow}>
                      <View style={[styles.rainbowStripe, { backgroundColor: "#FF3366" }]} />
                      <View style={[styles.rainbowStripe, { backgroundColor: "#FFCC00" }]} />
                      <View style={[styles.rainbowStripe, { backgroundColor: "#33CC99" }]} />
                      <View style={[styles.rainbowStripe, { backgroundColor: "#3366FF" }]} />
                    </View>
                    <View style={styles.themePreviewBottom}>
                      <View style={[styles.themePreviewCard, { backgroundColor: "#FF3366" }]} />
                      <View style={[styles.themePreviewCard, { backgroundColor: "#33CC99" }]} />
                    </View>
                  </View>
                  <ThemedText type="small" style={{ color: theme.text, fontWeight: appTheme === "rainbow" ? "700" : "400" }}>
                    {t("settings.themeRainbow")}
                  </ThemedText>
                  {appTheme === "rainbow" ? (
                    <View style={[styles.checkBadge, { backgroundColor: "#FF3366" }]}>
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
            subtitle={t("settings.blockLastMatchSubtitle")}
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
