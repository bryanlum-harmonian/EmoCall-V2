import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  useCredits,
  CREDIT_PACKAGES,
  PREMIUM_MONTHLY_PRICE,
  PREMIUM_BONUS_CREDITS,
} from "@/contexts/CreditsContext";

interface CreditsStoreModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreditsStoreModal({ visible, onClose }: CreditsStoreModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { credits, isPremium, purchasePackage, setPremium } = useCredits();

  const handlePurchase = async (packageId: string, price: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Purchase Credits",
      `This would charge $${price} to your payment method. For this demo, credits will be added for free.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Credits",
          onPress: () => {
            purchasePackage(packageId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handlePremiumSubscribe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPremium) {
      Alert.alert("Premium Active", "You already have an active premium subscription.");
      return;
    }
    Alert.alert(
      "Subscribe to Premium",
      `$${PREMIUM_MONTHLY_PRICE}/month includes:\n\n- ${PREMIUM_BONUS_CREDITS} bonus credits ($2 value)\n- Gender filter on daily cards\n- Priority matching\n\nFor this demo, premium will be activated for free.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Subscribe",
          onPress: () => {
            setPremium(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
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
          <Animated.View entering={FadeIn.duration(400)} style={styles.balanceCard}>
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

          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Credit Packages
            </ThemedText>
            <View style={styles.packagesGrid}>
              {CREDIT_PACKAGES.map((pkg, index) => (
                <Pressable
                  key={pkg.id}
                  onPress={() => handlePurchase(pkg.id, pkg.price)}
                  style={({ pressed }) => [
                    styles.packageCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText type="h3" style={{ color: theme.primary }}>
                    {pkg.label}
                  </ThemedText>
                  <ThemedText type="body" style={styles.packageCredits}>
                    {pkg.amount} credits
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

          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
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
                    {PREMIUM_BONUS_CREDITS} bonus credits monthly ($2 value)
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
            entering={FadeInUp.delay(300).duration(400)}
            style={styles.infoSection}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Credit Usage:
            </ThemedText>
            <View style={styles.usageList}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                - Refresh daily cards: 100 credits ($1)
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                - Extend call +5 min: 50 credits
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                - Extend call +15 min: 120 credits
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                - Extend call +30 min: 200 credits
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                - Extend call +60 min: 350 credits
              </ThemedText>
            </View>
            <ThemedText
              type="small"
              style={[styles.refundNote, { color: theme.textSecondary }]}
            >
              Unused extension time is refunded as credits when a call ends early.
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </View>
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
  packagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  packageCard: {
    width: "47%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  packageCredits: {
    fontWeight: "500",
  },
  bonusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
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
});
