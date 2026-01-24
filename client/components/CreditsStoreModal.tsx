import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  useCredits,
  CREDIT_PACKAGES,
  CALL_EXTENSIONS,
  PREMIUM_MONTHLY_PRICE,
  PREMIUM_BONUS_CREDITS,
} from "@/contexts/CreditsContext";

interface CreditsStoreModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PurchaseConfirmation {
  type: "credits" | "premium" | "premium_active";
  packageId?: string;
  name?: string;
  price?: number;
}

export function CreditsStoreModal({ visible, onClose }: CreditsStoreModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { credits, priorityTokens, isPremium, purchasePackage, setPremium } = useCredits();
  const [confirmation, setConfirmation] = useState<PurchaseConfirmation | null>(null);

  const handlePurchase = async (packageId: string, price: number, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmation({ type: "credits", packageId, name, price });
  };

  const handleConfirmPurchase = async () => {
    if (confirmation?.type === "credits" && confirmation.packageId) {
      await purchasePackage(confirmation.packageId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (confirmation?.type === "premium") {
      await setPremium(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setConfirmation(null);
  };

  const handlePremiumSubscribe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPremium) {
      setConfirmation({ type: "premium_active" });
      return;
    }
    setConfirmation({ type: "premium" });
  };

  const getConfirmationContent = () => {
    if (!confirmation) return { title: "", message: "", confirmText: "OK" };
    
    switch (confirmation.type) {
      case "credits":
        return {
          title: "Purchase Credits",
          message: `Buy ${confirmation.name} for $${confirmation.price?.toFixed(2)}?\n\nFor this demo, credits will be added for free.`,
          confirmText: "Buy Now",
        };
      case "premium":
        return {
          title: "Subscribe to Premium",
          message: `$${PREMIUM_MONTHLY_PRICE}/month includes:\n\n• ${PREMIUM_BONUS_CREDITS} bonus credits\n• Gender filter on daily cards\n• Priority matching\n\nFor this demo, premium will be activated for free.`,
          confirmText: "Subscribe",
        };
      case "premium_active":
        return {
          title: "Premium Active",
          message: "You already have an active premium subscription.",
          confirmText: "OK",
        };
      default:
        return { title: "", message: "", confirmText: "OK" };
    }
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
            Credits Store
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
                { backgroundColor: `${theme.success}10`, borderColor: theme.success },
              ]}
            >
              <View style={styles.timeBankHeader}>
                <View style={[styles.timeBankIcon, { backgroundColor: theme.success }]}>
                  <Feather name="shield" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.timeBankInfo}>
                  <ThemedText type="h4">Time Bank</ThemedText>
                  <ThemedText type="body" style={{ color: theme.success, fontWeight: "600" }}>
                    Priority Tokens: {priorityTokens}
                  </ThemedText>
                </View>
              </View>
              <ThemedText
                type="small"
                style={[styles.timeBankSubtext, { color: theme.textSecondary }]}
              >
                If a paid call drops, your refund appears here as Priority Tokens.
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.balanceCard}>
            <View
              style={[
                styles.balanceContainer,
                { backgroundColor: `${theme.primary}15` },
              ]}
            >
              <Feather name="zap" size={32} color={theme.primary} />
              <View style={styles.balanceInfo}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Your Balance
                </ThemedText>
                <ThemedText type="h2" style={{ color: theme.primary }}>
                  {credits} credits
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Credit Packages
            </ThemedText>
            <View style={styles.packagesContainer}>
              {CREDIT_PACKAGES.map((pkg) => (
                <Pressable
                  key={pkg.id}
                  onPress={() => handlePurchase(pkg.id, pkg.price, pkg.name)}
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
                    {pkg.label}
                  </ThemedText>
                  <ThemedText type="body" style={styles.packageCredits}>
                    {pkg.amount.toLocaleString()} credits
                  </ThemedText>
                  {pkg.bonus ? (
                    <View
                      style={[
                        styles.bonusBadge,
                        { backgroundColor: theme.success },
                      ]}
                    >
                      <ThemedText type="small" style={styles.bonusText}>
                        +{pkg.bonus} bonus
                      </ThemedText>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Premium Subscription
            </ThemedText>
            <Pressable
              onPress={handlePremiumSubscribe}
              style={({ pressed }) => [
                styles.premiumCard,
                {
                  backgroundColor: isPremium ? `${theme.success}15` : `${theme.primary}08`,
                  borderColor: isPremium ? theme.success : theme.primary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.premiumHeader}>
                <View
                  style={[
                    styles.premiumIcon,
                    { backgroundColor: isPremium ? theme.success : theme.primary },
                  ]}
                >
                  <Feather
                    name={isPremium ? "check" : "star"}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.premiumInfo}>
                  <ThemedText type="h4">
                    {isPremium ? "Premium Active" : "Go Premium"}
                  </ThemedText>
                  <ThemedText
                    type="body"
                    style={{ color: isPremium ? theme.success : theme.primary }}
                  >
                    ${PREMIUM_MONTHLY_PRICE}/month
                  </ThemedText>
                </View>
              </View>
              <View style={styles.premiumPerks}>
                <View style={styles.perkItem}>
                  <Feather name="gift" size={16} color={theme.textSecondary} />
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    {PREMIUM_BONUS_CREDITS} bonus credits monthly
                  </ThemedText>
                </View>
                <View style={styles.perkItem}>
                  <Feather name="users" size={16} color={theme.textSecondary} />
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    Gender filter on daily cards
                  </ThemedText>
                </View>
                <View style={styles.perkItem}>
                  <Feather name="zap" size={16} color={theme.textSecondary} />
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    Priority matching
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(400).duration(400)}
            style={styles.infoSection}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
              Extension Pricing:
            </ThemedText>
            <View style={styles.usageList}>
              {CALL_EXTENSIONS.map((ext) => (
                <ThemedText key={ext.id} type="small" style={{ color: theme.textSecondary }}>
                  - {ext.label}: {ext.cost} credits
                </ThemedText>
              ))}
            </View>
            <ThemedText
              type="small"
              style={[styles.refundNote, { color: theme.textSecondary }]}
            >
              Unused extension time is refunded to your Time Bank if a call ends early.
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(500).duration(400)}
            style={[styles.maxDurationCard, { backgroundColor: `${theme.secondary}10`, borderColor: theme.secondary }]}
          >
            <View style={styles.maxDurationHeader}>
              <Feather name="heart" size={18} color={theme.secondary} />
              <ThemedText type="body" style={{ color: theme.secondary, fontWeight: "600" }}>
                60-Minute Maximum
              </ThemedText>
            </View>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center", lineHeight: 20 }}
            >
              Beautiful moments don't need to last forever. Each call has a 60-minute limit—just enough time to share what matters, without overstaying. Keep the magic short and sweet; that's how real memories are made.
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </View>
      
      <ConfirmDialog
        visible={confirmation !== null}
        title={getConfirmationContent().title}
        message={getConfirmationContent().message}
        confirmText={getConfirmationContent().confirmText}
        cancelText={confirmation?.type === "premium_active" ? undefined : "Cancel"}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  timeBankInfo: {
    flex: 1,
  },
  timeBankSubtext: {
    marginLeft: 52,
  },
  balanceCard: {
    marginBottom: Spacing.xl,
  },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.lg,
  },
  balanceInfo: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  packagesContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  packageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    gap: Spacing.xs,
  },
  packageCredits: {
    fontWeight: "500",
  },
  bonusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  bonusText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  premiumCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: Spacing.xl,
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  premiumIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumInfo: {
    flex: 1,
  },
  premiumPerks: {
    gap: Spacing.sm,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  usageList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  refundNote: {
    marginTop: Spacing.md,
    fontStyle: "italic",
  },
  maxDurationCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
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
