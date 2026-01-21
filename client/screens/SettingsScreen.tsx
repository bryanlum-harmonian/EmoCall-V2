import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, Alert, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
  delay?: number;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  isDestructive = false,
  delay = 0,
}: SettingsItemProps) {
  const { theme } = useTheme();

  const iconColor = isDestructive ? theme.error : theme.primary;
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
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [blockLastMatch, setBlockLastMatch] = useState(false);

  const handleBlockToggle = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlockLastMatch(value);
  };

  const handleOpenTerms = async () => {
    await Haptics.selectionAsync();
    // In a real app, this would open a terms page
    Alert.alert("Terms of Service", "Terms and conditions content would be displayed here.");
  };

  const handleOpenPrivacy = async () => {
    await Haptics.selectionAsync();
    // In a real app, this would open a privacy page
    Alert.alert("Privacy Policy", "Privacy policy content would be displayed here.");
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
        <SettingsSection title="SAFETY" delay={200}>
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
            delay={300}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="shield"
            title="Report History"
            subtitle="View your submitted reports"
            onPress={() => Alert.alert("Report History", "No reports submitted yet.")}
            delay={400}
          />
        </SettingsSection>

        <SettingsSection title="LEGAL" delay={500}>
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
            delay={700}
          />
        </SettingsSection>

        <SettingsSection title="SUPPORT" delay={800}>
          <SettingsItem
            icon="mail"
            title="Contact Support"
            subtitle="Get help with the app"
            onPress={handleContactSupport}
            delay={900}
          />
        </SettingsSection>

        <SettingsSection title="ACCOUNT" delay={1000}>
          <SettingsItem
            icon="trash-2"
            title="Delete My Data"
            subtitle="Permanently remove all local data"
            onPress={handleDeleteData}
            isDestructive
            delay={1100}
          />
        </SettingsSection>

        <Animated.View
          entering={FadeIn.delay(1200).duration(400)}
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
});
