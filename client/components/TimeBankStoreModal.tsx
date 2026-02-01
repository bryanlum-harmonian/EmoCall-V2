import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  useTimeBank,
  TIME_PACKAGES,
} from "@/contexts/TimeBankContext";
import { REFERRAL_REWARD_MINUTES } from "@shared/schema";

interface TimeBankStoreModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PurchaseConfirmation {
  type: "time" | "referral_success" | "referral_error";
  packageId?: string;
  name?: string;
  price?: number;
  message?: string;
}

export function TimeBankStoreModal({ visible, onClose }: TimeBankStoreModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, currentLanguage } = useLanguage();
  void currentLanguage;
  const { 
    timeBankMinutes, 
    referralCode, 
    referredByCode, 
    referralCount, 
    purchasePackage, 
    redeemReferral,
    isLoading,
  } = useTimeBank();
  const [confirmation, setConfirmation] = useState<PurchaseConfirmation | null>(null);
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);

  const handlePurchase = async (packageId: string, price: number, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmation({ type: "time", packageId, name, price });
  };

  const handleConfirmPurchase = async () => {
    if (confirmation?.type === "time" && confirmation.packageId) {
      await purchasePackage(confirmation.packageId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setConfirmation(null);
  };

  const handleCopyReferralCode = async () => {
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      setCopied(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRedeemReferral = async () => {
    if (!referralInput.trim()) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await redeemReferral(referralInput.trim());
    
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmation({ type: "referral_success", message: result.message });
      setReferralInput("");
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setConfirmation({ type: "referral_error", message: result.message });
    }
  };

  const getConfirmationContent = () => {
    if (!confirmation) return { title: "", message: "", confirmText: t("common.ok") };
    
    switch (confirmation.type) {
      case "time":
        return {
          title: "Purchase Time",
          message: `Purchase ${confirmation.name} for $${confirmation.price?.toFixed(2)}?`,
          confirmText: t("credits.buyNow"),
        };
      case "referral_success":
        return {
          title: "Success!",
          message: confirmation.message || `You earned ${REFERRAL_REWARD_MINUTES} minutes!`,
          confirmText: t("common.ok"),
        };
      case "referral_error":
        return {
          title: "Oops!",
          message: confirmation.message || "Failed to redeem referral code",
          confirmText: t("common.ok"),
        };
      default:
        return { title: "", message: "", confirmText: t("common.ok") };
    }
  };

  const formatMinutes = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remaining = mins % 60;
      return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    }
    return `${Math.round(mins)}m`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + Spacing.md,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.headerLeft} />
          <ThemedText type="h3" style={styles.headerTitle}>
            Time Bank
          </ThemedText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(400)} style={styles.timeBankSection}>
            <View
              style={[
                styles.timeBankCard,
                { backgroundColor: `${theme.primary}15`, borderColor: theme.primary },
              ]}
            >
              <View style={styles.timeBankHeader}>
                <View style={[styles.timeBankIcon, { backgroundColor: theme.primary }]}>
                  <Feather name="clock" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.timeBankInfo}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Your Time Bank
                  </ThemedText>
                  <ThemedText type="h2" style={{ color: theme.primary }}>
                    {formatMinutes(timeBankMinutes)}
                  </ThemedText>
                </View>
              </View>
              <ThemedText
                type="small"
                style={[styles.timeBankSubtext, { color: theme.textSecondary }]}
              >
                Use minutes to extend calls or unlock features
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Refer & Earn
            </ThemedText>
            <View
              style={[
                styles.referralCard,
                { backgroundColor: `${theme.success}10`, borderColor: theme.success },
              ]}
            >
              <View style={styles.referralHeader}>
                <View style={[styles.referralIcon, { backgroundColor: theme.success }]}>
                  <Feather name="gift" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.referralHeaderInfo}>
                  <ThemedText type="h4" style={{ color: theme.success }}>
                    Give {REFERRAL_REWARD_MINUTES}, Get {REFERRAL_REWARD_MINUTES}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    You both earn {REFERRAL_REWARD_MINUTES} min after their first 3+ min call!
                  </ThemedText>
                </View>
              </View>

              <View style={styles.referralCodeSection}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                  Your referral code
                </ThemedText>
                <Pressable
                  onPress={handleCopyReferralCode}
                  style={({ pressed }) => [
                    styles.referralCodeBox,
                    { 
                      backgroundColor: theme.surface, 
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText type="h3" style={{ letterSpacing: 3, color: theme.text }}>
                    {referralCode || "------"}
                  </ThemedText>
                  <Feather 
                    name={copied ? "check" : "copy"} 
                    size={20} 
                    color={copied ? theme.success : theme.textSecondary} 
                  />
                </Pressable>
                {referralCount > 0 ? (
                  <ThemedText type="small" style={{ color: theme.success, marginTop: Spacing.xs }}>
                    {referralCount} friend{referralCount !== 1 ? "s" : ""} referred!
                  </ThemedText>
                ) : null}
              </View>

              {!referredByCode ? (
                <View style={styles.redeemSection}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                    Have a friend's code?
                  </ThemedText>
                  <View style={styles.redeemInputRow}>
                    <TextInput
                      style={[
                        styles.redeemInput,
                        { 
                          backgroundColor: theme.surface, 
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder="Enter code"
                      placeholderTextColor={theme.textSecondary}
                      value={referralInput}
                      onChangeText={setReferralInput}
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                    <Pressable
                      onPress={handleRedeemReferral}
                      disabled={isLoading || !referralInput.trim()}
                      style={({ pressed }) => [
                        styles.redeemButton,
                        { 
                          backgroundColor: referralInput.trim() ? theme.success : theme.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Feather name="check" size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <ThemedText type="small" style={{ color: theme.success, marginTop: Spacing.sm }}>
                  You already used a referral code!
                </ThemedText>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Time Packages
            </ThemedText>
            <View style={styles.packagesContainer}>
              {TIME_PACKAGES.map((pkg) => (
                <Pressable
                  key={pkg.id}
                  onPress={() => handlePurchase(pkg.id, pkg.priceUsd, pkg.name)}
                  style={({ pressed }) => [
                    styles.packageCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.primary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {pkg.name}
                  </ThemedText>
                  <ThemedText type="h2" style={{ color: theme.primary }}>
                    ${pkg.priceUsd.toFixed(2)}
                  </ThemedText>
                  <ThemedText type="body" style={styles.packageMinutes}>
                    {pkg.minutes} minutes
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>


          <Animated.View
            entering={FadeInUp.delay(500).duration(400)}
            style={[styles.maxDurationCard, { backgroundColor: `${theme.secondary}10`, borderColor: theme.secondary }]}
          >
            <View style={styles.maxDurationHeader}>
              <Feather name="heart" size={18} color={theme.secondary} />
              <ThemedText type="body" style={{ color: theme.secondary, fontWeight: "600" }}>
                {t("credits.maxDuration")}
              </ThemedText>
            </View>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center", lineHeight: 20 }}
            >
              {t("credits.maxDurationDescription")}
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </View>
      
      <ConfirmDialog
        visible={confirmation !== null}
        title={getConfirmationContent().title}
        message={getConfirmationContent().message}
        confirmText={getConfirmationContent().confirmText}
        cancelText={confirmation?.type === "referral_success" || confirmation?.type === "referral_error" ? undefined : t("common.cancel")}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setConfirmation(null)}
      />
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
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    textAlign: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  timeBankSection: {
    marginBottom: Spacing.lg,
  },
  timeBankCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  timeBankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timeBankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  timeBankInfo: {
    flex: 1,
  },
  timeBankSubtext: {
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  referralCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  referralIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  referralHeaderInfo: {
    flex: 1,
  },
  referralCodeSection: {
    marginBottom: Spacing.md,
  },
  referralCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  redeemSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  redeemInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  redeemInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  redeemButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  packagesContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  packageCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    gap: Spacing.xs,
  },
  packageMinutes: {
    fontWeight: "600",
  },
  maxDurationCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  maxDurationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});

export default TimeBankStoreModal;
