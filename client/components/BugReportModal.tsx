import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSession } from "@/contexts/SessionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface BugReportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BugReportModal({ visible, onClose }: BugReportModalProps) {
  const { theme, isDark } = useTheme();
  const { session } = useSession();
  const { t } = useLanguage();
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const deviceInfo = `Platform: ${Platform.OS}, Version: ${Platform.Version}`;
      
      const response = await fetch(new URL("/api/bug-reports", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session?.id,
          description: description.trim(),
          deviceInfo,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("common.success"), t("settings.reportBugSuccess"));
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Bug report error:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("common.error"), t("settings.reportBugError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    await Haptics.selectionAsync();
    setDescription("");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.container, { backgroundColor: theme.surface }]}
        >
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${theme.warning}20` }]}>
              <Feather name="alert-circle" size={24} color={theme.warning} />
            </View>
            <ThemedText type="h3" style={styles.title}>
              {t("settings.reportBugTitle")}
            </ThemedText>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
            {t("settings.reportBugDescription")}
          </ThemedText>

          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder={t("settings.reportBugPlaceholder")}
            placeholderTextColor={theme.textDisabled}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
            editable={!isSubmitting}
          />

          <View style={styles.charCount}>
            <ThemedText type="caption" style={{ color: theme.textDisabled }}>
              {description.length}/1000
            </ThemedText>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            style={({ pressed }) => [
              styles.submitButton,
              { 
                backgroundColor: theme.primary,
                opacity: pressed ? 0.8 : isSubmitting || !description.trim() ? 0.5 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#5A4A42" />
            ) : (
              <>
                <Feather name="send" size={18} color="#5A4A42" />
                <ThemedText type="body" style={[styles.submitText, { color: "#5A4A42" }]}>
                  {t("settings.reportBugSubmit")}
                </ThemedText>
              </>
            )}
          </Pressable>
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
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  description: {
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    minHeight: 120,
    fontSize: 16,
  },
  charCount: {
    alignItems: "flex-end",
    marginTop: -Spacing.md,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  submitText: {
    fontWeight: "600",
  },
});
