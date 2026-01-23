import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Modal, FlatList, Share, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSession } from "@/contexts/SessionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface GlobalRankingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface CountryRanking {
  countryCode: string;
  countryName: string;
  totalAura: number;
  userCount: number;
  rank: number;
}

interface RankingsResponse {
  rankings: CountryRanking[];
  lastUpdated: string;
  nextUpdate: string;
}

const FLAG_EMOJI: Record<string, string> = {
  AF: "\u{1F1E6}\u{1F1EB}", AL: "\u{1F1E6}\u{1F1F1}", DZ: "\u{1F1E9}\u{1F1FF}", AD: "\u{1F1E6}\u{1F1E9}", AO: "\u{1F1E6}\u{1F1F4}",
  AR: "\u{1F1E6}\u{1F1F7}", AM: "\u{1F1E6}\u{1F1F2}", AU: "\u{1F1E6}\u{1F1FA}", AT: "\u{1F1E6}\u{1F1F9}", AZ: "\u{1F1E6}\u{1F1FF}",
  BS: "\u{1F1E7}\u{1F1F8}", BH: "\u{1F1E7}\u{1F1ED}", BD: "\u{1F1E7}\u{1F1E9}", BB: "\u{1F1E7}\u{1F1E7}", BY: "\u{1F1E7}\u{1F1FE}",
  BE: "\u{1F1E7}\u{1F1EA}", BZ: "\u{1F1E7}\u{1F1FF}", BJ: "\u{1F1E7}\u{1F1EF}", BT: "\u{1F1E7}\u{1F1F9}", BO: "\u{1F1E7}\u{1F1F4}",
  BA: "\u{1F1E7}\u{1F1E6}", BW: "\u{1F1E7}\u{1F1FC}", BR: "\u{1F1E7}\u{1F1F7}", BN: "\u{1F1E7}\u{1F1F3}", BG: "\u{1F1E7}\u{1F1EC}",
  KH: "\u{1F1F0}\u{1F1ED}", CM: "\u{1F1E8}\u{1F1F2}", CA: "\u{1F1E8}\u{1F1E6}", CL: "\u{1F1E8}\u{1F1F1}", CN: "\u{1F1E8}\u{1F1F3}",
  CO: "\u{1F1E8}\u{1F1F4}", CR: "\u{1F1E8}\u{1F1F7}", HR: "\u{1F1ED}\u{1F1F7}", CU: "\u{1F1E8}\u{1F1FA}", CY: "\u{1F1E8}\u{1F1FE}",
  CZ: "\u{1F1E8}\u{1F1FF}", DK: "\u{1F1E9}\u{1F1F0}", DO: "\u{1F1E9}\u{1F1F4}", EC: "\u{1F1EA}\u{1F1E8}", EG: "\u{1F1EA}\u{1F1EC}",
  SV: "\u{1F1F8}\u{1F1FB}", EE: "\u{1F1EA}\u{1F1EA}", ET: "\u{1F1EA}\u{1F1F9}", FI: "\u{1F1EB}\u{1F1EE}", FR: "\u{1F1EB}\u{1F1F7}",
  GE: "\u{1F1EC}\u{1F1EA}", DE: "\u{1F1E9}\u{1F1EA}", GH: "\u{1F1EC}\u{1F1ED}", GR: "\u{1F1EC}\u{1F1F7}", GT: "\u{1F1EC}\u{1F1F9}",
  HK: "\u{1F1ED}\u{1F1F0}", HU: "\u{1F1ED}\u{1F1FA}", IS: "\u{1F1EE}\u{1F1F8}", IN: "\u{1F1EE}\u{1F1F3}", ID: "\u{1F1EE}\u{1F1E9}",
  IR: "\u{1F1EE}\u{1F1F7}", IQ: "\u{1F1EE}\u{1F1F6}", IE: "\u{1F1EE}\u{1F1EA}", IL: "\u{1F1EE}\u{1F1F1}", IT: "\u{1F1EE}\u{1F1F9}",
  JM: "\u{1F1EF}\u{1F1F2}", JP: "\u{1F1EF}\u{1F1F5}", JO: "\u{1F1EF}\u{1F1F4}", KZ: "\u{1F1F0}\u{1F1FF}", KE: "\u{1F1F0}\u{1F1EA}",
  KR: "\u{1F1F0}\u{1F1F7}", KW: "\u{1F1F0}\u{1F1FC}", LV: "\u{1F1F1}\u{1F1FB}", LB: "\u{1F1F1}\u{1F1E7}", LT: "\u{1F1F1}\u{1F1F9}",
  LU: "\u{1F1F1}\u{1F1FA}", MY: "\u{1F1F2}\u{1F1FE}", MV: "\u{1F1F2}\u{1F1FB}", MX: "\u{1F1F2}\u{1F1FD}", MA: "\u{1F1F2}\u{1F1E6}",
  MM: "\u{1F1F2}\u{1F1F2}", NP: "\u{1F1F3}\u{1F1F5}", NL: "\u{1F1F3}\u{1F1F1}", NZ: "\u{1F1F3}\u{1F1FF}", NG: "\u{1F1F3}\u{1F1EC}",
  NO: "\u{1F1F3}\u{1F1F4}", OM: "\u{1F1F4}\u{1F1F2}", PK: "\u{1F1F5}\u{1F1F0}", PA: "\u{1F1F5}\u{1F1E6}", PY: "\u{1F1F5}\u{1F1FE}",
  PE: "\u{1F1F5}\u{1F1EA}", PH: "\u{1F1F5}\u{1F1ED}", PL: "\u{1F1F5}\u{1F1F1}", PT: "\u{1F1F5}\u{1F1F9}", QA: "\u{1F1F6}\u{1F1E6}",
  RO: "\u{1F1F7}\u{1F1F4}", RU: "\u{1F1F7}\u{1F1FA}", SA: "\u{1F1F8}\u{1F1E6}", RS: "\u{1F1F7}\u{1F1F8}", SG: "\u{1F1F8}\u{1F1EC}",
  SK: "\u{1F1F8}\u{1F1F0}", SI: "\u{1F1F8}\u{1F1EE}", ZA: "\u{1F1FF}\u{1F1E6}", ES: "\u{1F1EA}\u{1F1F8}", LK: "\u{1F1F1}\u{1F1F0}",
  SE: "\u{1F1F8}\u{1F1EA}", CH: "\u{1F1E8}\u{1F1ED}", TW: "\u{1F1F9}\u{1F1FC}", TH: "\u{1F1F9}\u{1F1ED}", TR: "\u{1F1F9}\u{1F1F7}",
  UA: "\u{1F1FA}\u{1F1E6}", AE: "\u{1F1E6}\u{1F1EA}", GB: "\u{1F1EC}\u{1F1E7}", US: "\u{1F1FA}\u{1F1F8}", UY: "\u{1F1FA}\u{1F1FE}",
  UZ: "\u{1F1FA}\u{1F1FF}", VE: "\u{1F1FB}\u{1F1EA}", VN: "\u{1F1FB}\u{1F1F3}", ZW: "\u{1F1FF}\u{1F1FC}",
};

function getFlag(countryCode: string): string {
  return FLAG_EMOJI[countryCode.toUpperCase()] || "\u{1F3F3}\u{FE0F}";
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

interface RankingItemProps {
  item: CountryRanking;
  isUserCountry: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
}

function RankingItem({ item, isUserCountry, theme }: RankingItemProps) {
  const isTop3 = item.rank <= 3;
  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const medalColor = isTop3 ? medalColors[item.rank - 1] : undefined;

  return (
    <View 
      style={[
        styles.rankingItem, 
        { 
          backgroundColor: isUserCountry 
            ? `${theme.primary}15` 
            : theme.backgroundSecondary,
          borderColor: isUserCountry ? theme.primary : "transparent",
          borderWidth: isUserCountry ? 2 : 0,
        }
      ]}
    >
      <View style={styles.rankColumn}>
        {isTop3 ? (
          <View style={[styles.medalBadge, { backgroundColor: medalColor }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              {item.rank}
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600" }}>
            #{item.rank}
          </ThemedText>
        )}
      </View>

      <View style={styles.flagContainer}>
        <ThemedText style={styles.flag}>{getFlag(item.countryCode)}</ThemedText>
      </View>

      <View style={styles.countryInfo}>
        <ThemedText type="body" style={{ fontWeight: "600", color: theme.text }} numberOfLines={1}>
          {item.countryName}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {item.userCount} soul{item.userCount !== 1 ? "s" : ""}
        </ThemedText>
      </View>

      <View style={styles.auraColumn}>
        <View style={[styles.auraBadge, { backgroundColor: `${theme.primary}20` }]}>
          <Feather name="star" size={14} color={theme.primary} />
          <ThemedText type="body" style={{ color: theme.primary, fontWeight: "700", marginLeft: 4 }}>
            {formatNumber(item.totalAura)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export function GlobalRankingsModal({ visible, onClose }: GlobalRankingsModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { session } = useSession();
  
  const { data: rankingsData, isLoading, refetch } = useQuery<RankingsResponse>({
    queryKey: ["/api/rankings/countries"],
    enabled: visible,
  });

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleShare = useCallback(async () => {
    const sessionCountryCode = (session as any)?.countryCode as string | undefined;
    if (!rankingsData?.rankings || !sessionCountryCode) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const userRanking = rankingsData.rankings.find(r => r.countryCode === sessionCountryCode);
    if (!userRanking) return;

    const message = `${getFlag(userRanking.countryCode)} ${userRanking.countryName} is ranked #${userRanking.rank} globally on EmoCall with ${formatNumber(userRanking.totalAura)} total Aura! Join us and help boost our ranking!`;
    
    try {
      await Share.share({
        message,
        title: "EmoCall Global Rankings",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, [rankingsData, session]);

  const userCountryCode = (session as any)?.countryCode as string | undefined;
  const userRanking = rankingsData?.rankings?.find(r => r.countryCode === userCountryCode);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(150)}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.springify().damping(15)}
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.backgroundDefault,
              marginTop: insets.top + Spacing.lg,
              marginBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText type="h2" style={{ color: theme.text }}>
              Global Rankings
            </ThemedText>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {userRanking ? (
            <View style={[styles.userCountryBanner, { backgroundColor: `${theme.primary}10` }]}>
              <ThemedText style={styles.bannerFlag}>{getFlag(userRanking.countryCode)}</ThemedText>
              <View style={styles.bannerInfo}>
                <ThemedText type="h4" style={{ color: theme.text }}>
                  {userRanking.countryName}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Ranked #{userRanking.rank} worldwide
                </ThemedText>
              </View>
              <Pressable 
                onPress={handleShare}
                style={[styles.shareButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="share-2" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Loading rankings...
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={rankingsData?.rankings || []}
              keyExtractor={(item) => item.countryCode}
              renderItem={({ item }) => (
                <RankingItem 
                  item={item} 
                  isUserCountry={item.countryCode === userCountryCode}
                  theme={theme}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Feather name="globe" size={48} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                    No rankings yet
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    Be the first to earn Aura!
                  </ThemedText>
                </View>
              }
            />
          )}

          {rankingsData?.lastUpdated ? (
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                Updated {new Date(rankingsData.lastUpdated).toLocaleString()}
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    borderRadius: BorderRadius.xl,
    maxHeight: "85%",
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
  closeButton: {
    padding: Spacing.xs,
  },
  userCountryBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bannerFlag: {
    fontSize: 32,
  },
  bannerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rankingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  rankColumn: {
    width: 40,
    alignItems: "center",
  },
  medalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  flagContainer: {
    width: 40,
    alignItems: "center",
  },
  flag: {
    fontSize: 24,
  },
  countryInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  auraColumn: {
    alignItems: "flex-end",
  },
  auraBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
});
