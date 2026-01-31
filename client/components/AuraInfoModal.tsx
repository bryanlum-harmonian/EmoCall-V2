import React from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAura, AURA_LEVELS, AURA_REWARDS } from "@/contexts/AuraContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface AuraInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

interface EarnItemProps {
  icon: keyof typeof Feather.glyphMap;
  labelKey: string;
  amount: number;
  theme: ReturnType<typeof useTheme>["theme"];
  isNegative?: boolean;
  t: (key: string, options?: object) => string;
}

function EarnItem({ icon, labelKey, amount, theme, isNegative, t }: EarnItemProps) {
  const amountColor = isNegative ? theme.error : "#4CAF50";
  const amountText = isNegative ? `${amount}` : `+${amount}`;
  
  return (
    <View style={[styles.earnItem, { backgroundColor: `${theme.primary}10` }]}>
      <View style={styles.earnItemLeft}>
        <View style={[styles.earnIcon, { backgroundColor: `${theme.primary}20` }]}>
          <Feather name={icon} size={18} color={theme.primary} />
        </View>
        <ThemedText type="body" style={{ color: theme.textSecondary, flex: 1 }}>
          {t(labelKey)}
        </ThemedText>
      </View>
      <View style={[styles.earnBadge, { backgroundColor: `${amountColor}20` }]}>
        <Feather name="star" size={12} color={amountColor} />
        <ThemedText type="small" style={{ color: amountColor, fontWeight: "700", marginLeft: 4 }}>
          {amountText}
        </ThemedText>
      </View>
    </View>
  );
}

interface LevelItemProps {
  level: { level: number; name: string; minAura: number };
  isCurrentLevel: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string, options?: object) => string;
}

function LevelItem({ level, isCurrentLevel, theme, t }: LevelItemProps) {
  return (
    <View 
      style={[
        styles.levelItem, 
        { 
          backgroundColor: isCurrentLevel ? `${theme.primary}15` : `${theme.backgroundSecondary}80`,
          borderColor: isCurrentLevel ? theme.primary : "transparent",
          borderWidth: isCurrentLevel ? 2 : 0,
        }
      ]}
    >
      <View style={styles.levelLeft}>
        <View style={[styles.levelNumber, { backgroundColor: isCurrentLevel ? theme.primary : theme.backgroundSecondary }]}>
          <ThemedText 
            type="small" 
            style={{ 
              color: isCurrentLevel ? "#FFFFFF" : theme.textSecondary, 
              fontWeight: "700" 
            }}
          >
            {level.level}
          </ThemedText>
        </View>
        <ThemedText 
          type="body" 
          style={{ 
            color: isCurrentLevel ? theme.primary : theme.text, 
            fontWeight: isCurrentLevel ? "600" : "400" 
          }}
        >
          {level.name}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {t("aura.minAura", { min: level.minAura })}
      </ThemedText>
    </View>
  );
}

export function AuraInfoModal({ visible, onClose }: AuraInfoModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, currentLanguage } = useLanguage();
  void currentLanguage; // Trigger re-render on language change
  const { aura, currentLevel, nextLevel, progressToNextLevel } = useAura();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <Animated.View
          entering={ZoomIn.duration(250).springify()}
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundDefault,
              marginTop: insets.top + 60,
              marginBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitle}>
              <Feather name="star" size={24} color={theme.primary} />
              <ThemedText type="h4" style={{ marginLeft: 10 }}>
                {t("aura.yourAura")}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.currentAuraCard, { backgroundColor: `${theme.primary}15` }]}>
              <View style={styles.auraDisplay}>
                <Feather name="star" size={32} color={theme.primary} />
                <ThemedText type="h1" style={{ color: theme.primary, marginLeft: 12 }}>
                  {aura}
                </ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                {currentLevel.name}
              </ThemedText>
              {nextLevel ? (
                <View style={styles.progressSection}>
                  <View style={[styles.progressBar, { backgroundColor: `${theme.primary}30` }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          backgroundColor: theme.primary, 
                          width: `${progressToNextLevel}%` 
                        }
                      ]} 
                    />
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
                    {t("aura.auraToNext", { aura: nextLevel.minAura - aura, level: nextLevel.name })}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 8 }}>
                  {t("aura.maxLevelReached")}
                </ThemedText>
              )}
            </View>

            <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginTop: Spacing.lg }}>
              {t("aura.howToEarn")}
            </ThemedText>

            <View style={styles.earnList}>
              <EarnItem
                icon="clock"
                labelKey="aura.earnMethods.callMinute"
                amount={AURA_REWARDS.CALL_MINUTE}
                theme={theme}
                t={t}
              />
              <EarnItem
                icon="check-circle"
                labelKey="aura.earnMethods.completeCall"
                amount={AURA_REWARDS.COMPLETE_CALL}
                theme={theme}
                t={t}
              />
              <EarnItem
                icon="plus-circle"
                labelKey="aura.earnMethods.extendCallLong"
                amount={AURA_REWARDS.EXTEND_CALL_LONG}
                theme={theme}
                t={t}
              />
              <EarnItem
                icon="plus"
                labelKey="aura.earnMethods.extendCallShort"
                amount={AURA_REWARDS.EXTEND_CALL_SHORT}
                theme={theme}
                t={t}
              />
              <EarnItem
                icon="alert-triangle"
                labelKey="aura.earnMethods.getReported"
                amount={AURA_REWARDS.REPORTED}
                theme={theme}
                t={t}
                isNegative
              />
            </View>

            <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginTop: Spacing.xl }}>
              {t("aura.auraLevels")}
            </ThemedText>

            <View style={styles.levelsList}>
              {AURA_LEVELS.map((level) => (
                <LevelItem
                  key={level.level}
                  level={level}
                  isCurrentLevel={level.level === currentLevel.level}
                  theme={theme}
                  t={t}
                />
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    maxHeight: "80%",
    minHeight: 400,
    flex: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  currentAuraCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  auraDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressSection: {
    width: "100%",
    marginTop: Spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  earnList: {
    gap: Spacing.sm,
  },
  earnItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  earnItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  earnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  earnBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  levelsList: {
    gap: Spacing.sm,
  },
  levelItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  levelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  levelNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
