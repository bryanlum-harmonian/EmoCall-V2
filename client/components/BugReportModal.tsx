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
  ScrollView,
  Image,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
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

interface MediaAsset {
  uri: string;
  type: "image" | "video";
  fileName?: string;
}

const MAX_ATTACHMENTS = 5;

export function BugReportModal({ visible, onClose }: BugReportModalProps) {
  const { theme, isDark } = useTheme();
  const { session } = useSession();
  const { t } = useLanguage();
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<MediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pickMedia = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t("common.error"), t("settings.maxAttachmentsReached"));
      return;
    }

    await Haptics.selectionAsync();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newAssets: MediaAsset[] = result.assets.map((asset: ImagePicker.ImagePickerAsset) => ({
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        fileName: asset.fileName || `media-${Date.now()}`,
      }));
      setAttachments((prev) => [...prev, ...newAssets].slice(0, MAX_ATTACHMENTS));
    }
  };

  const removeAttachment = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];

    setIsUploading(true);
    try {
      const formData = new FormData();
      
      for (const attachment of attachments) {
        const fileExtension = attachment.uri.split(".").pop() || "jpg";
        const mimeType = attachment.type === "video" 
          ? `video/${fileExtension === "mov" ? "quicktime" : fileExtension}`
          : `image/${fileExtension}`;
        
        formData.append("files", {
          uri: attachment.uri,
          name: attachment.fileName || `file-${Date.now()}.${fileExtension}`,
          type: mimeType,
        } as unknown as Blob);
      }

      const response = await fetch(new URL("/api/upload", getApiUrl()).toString(), {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.urls || [];
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Upload attachments first if any
      let uploadedUrls: string[] = [];
      if (attachments.length > 0) {
        uploadedUrls = await uploadAttachments();
      }

      const deviceInfo = `Platform: ${Platform.OS}, Version: ${Platform.Version}`;
      
      const response = await fetch(new URL("/api/bug-reports", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session?.id,
          description: description.trim(),
          deviceInfo,
          attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("common.success"), t("settings.reportBugSuccess"));
      setDescription("");
      setAttachments([]);
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
    setAttachments([]);
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

          {/* Attachments Section */}
          <View style={styles.attachmentsSection}>
            <View style={styles.attachmentsHeader}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {t("settings.attachments")} ({attachments.length}/{MAX_ATTACHMENTS})
              </ThemedText>
              <Pressable
                onPress={pickMedia}
                disabled={isSubmitting || attachments.length >= MAX_ATTACHMENTS}
                style={({ pressed }) => [
                  styles.addButton,
                  { 
                    backgroundColor: `${theme.primary}20`,
                    opacity: pressed ? 0.7 : attachments.length >= MAX_ATTACHMENTS ? 0.4 : 1,
                  },
                ]}
              >
                <Feather name="plus" size={18} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                  {t("settings.addMedia")}
                </ThemedText>
              </Pressable>
            </View>

            {attachments.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsContainer}
              >
                {attachments.map((attachment, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{ uri: attachment.uri }} style={styles.thumbnail} />
                    {attachment.type === "video" && (
                      <View style={[styles.videoIndicator, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                        <Feather name="play" size={16} color="#fff" />
                      </View>
                    )}
                    <Pressable
                      onPress={() => removeAttachment(index)}
                      style={[styles.removeButton, { backgroundColor: theme.error }]}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.emptyAttachments, { borderColor: theme.border }]}>
                <Feather name="image" size={24} color={theme.textDisabled} />
                <ThemedText type="caption" style={{ color: theme.textDisabled, textAlign: "center" }}>
                  {t("settings.noAttachments")}
                </ThemedText>
              </View>
            )}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || isUploading || !description.trim()}
            style={({ pressed }) => [
              styles.submitButton,
              { 
                backgroundColor: theme.primary,
                opacity: pressed ? 0.8 : isSubmitting || isUploading || !description.trim() ? 0.5 : 1,
              },
            ]}
          >
            {isSubmitting || isUploading ? (
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
    maxHeight: "85%",
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
    minHeight: 100,
    fontSize: 16,
  },
  charCount: {
    alignItems: "flex-end",
    marginTop: -Spacing.md,
  },
  attachmentsSection: {
    gap: Spacing.sm,
  },
  attachmentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  thumbnailsContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  thumbnailWrapper: {
    position: "relative",
    marginRight: Spacing.sm,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
  },
  videoIndicator: {
    position: "absolute",
    bottom: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAttachments: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
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
