import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Share,
  ScrollView,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Button } from "./Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSession } from "@/contexts/SessionContext";
import { apiRequest } from "@/lib/query-client";

interface BackupRestoreModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

type Mode = "menu" | "backup" | "restore";

export function BackupRestoreModal({ visible, onClose, onRestoreSuccess }: BackupRestoreModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { session, refreshSession } = useSession();
  const sessionId = session?.id;
  
  const [mode, setMode] = useState<Mode>("menu");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupData, setBackupData] = useState<string | null>(null);

  const resetState = () => {
    setMode("menu");
    setPin("");
    setConfirmPin("");
    setError(null);
    setSuccess(null);
    setBackupData(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGenerateBackup = async () => {
    if (pin.length !== 6) {
      setError("Please enter a 6-digit PIN");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", `/api/sessions/${sessionId}/generate-backup`, { pin });
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setBackupData(data.backupData);
      setSuccess("Backup generated! Save this file securely.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError("Failed to generate backup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBackup = async () => {
    if (!backupData) return;

    try {
      const fileName = `emocall-backup-${new Date().toISOString().split("T")[0]}.enc`;
      
      if (Platform.OS === "web") {
        const blob = new Blob([backupData], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess("Backup file downloaded!");
      } else {
        await Share.share({ 
          message: backupData, 
          title: "EmoCall Backup" 
        });
        setSuccess("Save this backup code securely!");
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError("Failed to save backup");
    }
  };

  const handleCopyBackup = async () => {
    if (!backupData) return;
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(backupData);
      } else {
        Clipboard.setString(backupData);
      }
      setSuccess("Backup code copied to clipboard!");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError("Failed to copy backup code");
    }
  };

  const handleRestore = async () => {
    if (pin.length !== 6) {
      setError("Please enter your 6-digit PIN");
      return;
    }
    if (!backupData) {
      setError("Please select a backup file first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", `/api/sessions/restore`, {
        backupData,
        pin,
        newSessionId: sessionId,
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSuccess("Session restored successfully!");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      await refreshSession();
      
      setTimeout(() => {
        handleClose();
        onRestoreSuccess();
      }, 1500);
    } catch (err) {
      setError("Failed to restore. Check your PIN and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <ThemedText type="body" style={[styles.menuDescription, { color: theme.textSecondary }]}>
        Backup your session to restore on a new device, or restore from a previous backup.
      </ThemedText>

      <Pressable
        onPress={() => { setMode("backup"); Haptics.selectionAsync(); }}
        style={({ pressed }) => [
          styles.menuOption,
          { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: `${theme.primary}20` }]}>
          <Feather name="download" size={24} color={theme.primary} />
        </View>
        <View style={styles.menuOptionContent}>
          <ThemedText type="h4">Create Backup</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Download encrypted backup file
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => { setMode("restore"); Haptics.selectionAsync(); }}
        style={({ pressed }) => [
          styles.menuOption,
          { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: `${theme.success}20` }]}>
          <Feather name="upload" size={24} color={theme.success} />
        </View>
        <View style={styles.menuOptionContent}>
          <ThemedText type="h4">Restore from Backup</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Recover session from backup file
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );

  const renderBackup = () => (
    <View style={styles.formContainer}>
      {!backupData ? (
        <>
          <ThemedText type="body" style={[styles.formDescription, { color: theme.textSecondary }]}>
            Create a 6-digit PIN to protect your backup. You'll need this PIN to restore on a new device.
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Create PIN
            </ThemedText>
            <TextInput
              style={[
                styles.pinInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
              ]}
              value={pin}
              onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Confirm PIN
            </ThemedText>
            <TextInput
              style={[
                styles.pinInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
              ]}
              value={confirmPin}
              onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
          </View>

          <Button
            onPress={handleGenerateBackup}
            disabled={isLoading || pin.length !== 6 || confirmPin.length !== 6}
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : "Generate Backup"}
          </Button>
        </>
      ) : (
        <>
          <View style={[styles.successBox, { backgroundColor: `${theme.success}20`, flexDirection: "column" }]}>
            <Feather name="check-circle" size={32} color={theme.success} />
            <ThemedText type="body" style={{ color: theme.success, textAlign: "center", marginTop: Spacing.sm }}>
              Backup ready!
            </ThemedText>
          </View>

          <View style={styles.buttonRow}>
            <Button
              onPress={handleCopyBackup}
              style={[styles.halfButton, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.primary }]}
            >
              <View style={styles.buttonContent}>
                <Feather name="copy" size={18} color={theme.primary} />
                <ThemedText style={{ color: theme.primary, marginLeft: Spacing.xs }}>Copy</ThemedText>
              </View>
            </Button>
            <Button
              onPress={handleSaveBackup}
              style={[styles.halfButton, { backgroundColor: theme.primary }]}
            >
              <View style={styles.buttonContent}>
                <Feather name="share" size={18} color="#fff" />
                <ThemedText style={{ color: "#fff", marginLeft: Spacing.xs }}>Share</ThemedText>
              </View>
            </Button>
          </View>

          <ThemedText type="caption" style={[styles.warningText, { color: theme.textSecondary }]}>
            Save this backup code securely. You'll need both the code and your PIN to restore.
          </ThemedText>
        </>
      )}
    </View>
  );

  const renderRestore = () => (
    <ScrollView style={styles.formScrollView} contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
      <ThemedText type="body" style={[styles.formDescription, { color: theme.textSecondary }]}>
        Paste your backup code and enter the PIN you created.
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText type="caption" style={[styles.inputLabel, { color: theme.textSecondary }]}>
          Paste Backup Code
        </ThemedText>
        <TextInput
          style={[
            styles.backupCodeInput,
            { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
          ]}
          value={backupData || ""}
          onChangeText={setBackupData}
          placeholder="Paste your backup code here..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="caption" style={[styles.inputLabel, { color: theme.textSecondary }]}>
          Enter your PIN
        </ThemedText>
        <TextInput
          style={[
            styles.pinInput,
            { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border },
          ]}
          value={pin}
          onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
        />
      </View>

      <View style={[styles.warningBox, { backgroundColor: `${theme.warning}20` }]}>
        <Feather name="alert-triangle" size={18} color={theme.warning} />
        <ThemedText type="caption" style={{ color: theme.warning, marginLeft: Spacing.sm, flex: 1 }}>
          This will replace your current session data with the backup.
        </ThemedText>
      </View>

      <Button
        onPress={handleRestore}
        disabled={isLoading || pin.length !== 6 || !backupData}
        style={[styles.actionButton, { backgroundColor: theme.success }]}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : "Restore Session"}
      </Button>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          {mode !== "menu" ? (
            <Pressable
              onPress={() => { resetState(); setMode("menu"); }}
              style={({ pressed }) => [
                styles.headerButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="arrow-left" size={20} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
          <ThemedText type="h3">
            {mode === "menu" ? "Backup & Restore" : mode === "backup" ? "Create Backup" : "Restore Backup"}
          </ThemedText>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.headerButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="x" size={20} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${theme.error}20` }]}>
              <Feather name="alert-circle" size={18} color={theme.error} />
              <ThemedText type="caption" style={{ color: theme.error, marginLeft: Spacing.sm, flex: 1 }}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          {success && !error ? (
            <View style={[styles.successBox, { backgroundColor: `${theme.success}20` }]}>
              <Feather name="check-circle" size={18} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, marginLeft: Spacing.sm, flex: 1 }}>
                {success}
              </ThemedText>
            </View>
          ) : null}

          {mode === "menu" && renderMenu()}
          {mode === "backup" && renderBackup()}
          {mode === "restore" && renderRestore()}
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  menuContainer: {
    gap: Spacing.md,
  },
  menuDescription: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  menuOptionContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  formContainer: {
    gap: Spacing.lg,
  },
  formDescription: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    marginLeft: Spacing.xs,
  },
  pinInput: {
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 8,
    textAlign: "center",
  },
  actionButton: {
    marginTop: Spacing.md,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  formScrollView: {
    flex: 1,
  },
  backupCodeInput: {
    minHeight: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 12,
    textAlignVertical: "top",
  },
});
