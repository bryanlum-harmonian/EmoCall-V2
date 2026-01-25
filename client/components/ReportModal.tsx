import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "sexual_content", label: "Inappropriate sexual content" },
  { id: "scam", label: "Scam or fraud attempt" },
  { id: "hate_speech", label: "Hate speech or discrimination" },
  { id: "threats", label: "Threats of violence" },
  { id: "underage", label: "Underage user" },
  { id: "spam", label: "Spam or solicitation" },
  { id: "impersonation", label: "Impersonation" },
] as const;

export type ReportReasonId = typeof REPORT_REASONS[number]["id"];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reasons: ReportReasonId[], otherReason: string) => void;
  isSubmitting?: boolean;
}

export function ReportModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ReportModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedReasons, setSelectedReasons] = useState<Set<ReportReasonId>>(new Set());
  const [otherReason, setOtherReason] = useState("");
  const [showOther, setShowOther] = useState(false);

  const handleReasonToggle = async (reasonId: ReportReasonId) => {
    await Haptics.selectionAsync();
    setSelectedReasons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reasonId)) {
        newSet.delete(reasonId);
      } else {
        newSet.add(reasonId);
      }
      return newSet;
    });
  };

  const handleOtherToggle = async () => {
    await Haptics.selectionAsync();
    setShowOther((prev) => !prev);
    if (showOther) {
      setOtherReason("");
    }
  };

  const handleSubmit = async () => {
    if (selectedReasons.size === 0 && !otherReason.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(Array.from(selectedReasons), otherReason.trim());
  };

  const handleClose = () => {
    setSelectedReasons(new Set());
    setOtherReason("");
    setShowOther(false);
    onClose();
  };

  const canSubmit = selectedReasons.size > 0 || otherReason.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.modal, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.error + "20" }]}>
              <Feather name="flag" size={24} color={theme.error} />
            </View>
            <ThemedText type="h3" style={styles.title}>
              {t("report.title")}
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t("report.selectReasons")}
            </ThemedText>
          </View>

          <ScrollView 
            style={styles.reasonsContainer}
            showsVerticalScrollIndicator={false}
          >
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReasons.has(reason.id);
              return (
                <Pressable
                  key={reason.id}
                  onPress={() => handleReasonToggle(reason.id)}
                  style={({ pressed }) => [
                    styles.reasonItem,
                    {
                      backgroundColor: isSelected
                        ? theme.primary + "15"
                        : theme.backgroundSecondary,
                      borderColor: isSelected ? theme.primary : theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? theme.primary : "transparent",
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <ThemedText type="body" style={{ flex: 1 }}>
                    {t(`report.reasons.${reason.id}`)}
                  </ThemedText>
                </Pressable>
              );
            })}

            <Pressable
              onPress={handleOtherToggle}
              style={({ pressed }) => [
                styles.reasonItem,
                {
                  backgroundColor: showOther
                    ? theme.primary + "15"
                    : theme.backgroundSecondary,
                  borderColor: showOther ? theme.primary : theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: showOther ? theme.primary : "transparent",
                    borderColor: showOther ? theme.primary : theme.border,
                  },
                ]}
              >
                {showOther ? (
                  <Feather name="check" size={14} color="#FFFFFF" />
                ) : null}
              </View>
              <ThemedText type="body" style={{ flex: 1 }}>
                {t("report.reasons.other")}
              </ThemedText>
            </Pressable>

            {showOther ? (
              <View style={styles.otherInputContainer}>
                <TextInput
                  value={otherReason}
                  onChangeText={setOtherReason}
                  placeholder={t("report.placeholderDetails")}
                  placeholderTextColor={theme.textDisabled}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.otherInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  textAlignVertical="top"
                />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.cancelButton,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1 
                },
              ]}
            >
              <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                {t("report.cancelButton")}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: canSubmit ? theme.error : theme.textDisabled,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  {t("report.submitting")}
                </ThemedText>
              ) : (
                <>
                  <Feather name="send" size={16} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {t("report.submitButton")}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: "80%",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
  },
  reasonsContainer: {
    maxHeight: 320,
    marginBottom: Spacing.lg,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  otherInputContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  otherInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 80,
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    flex: 2,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
});
