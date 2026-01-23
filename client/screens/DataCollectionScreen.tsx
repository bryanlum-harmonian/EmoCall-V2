import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface DataRowProps {
  icon: keyof typeof Feather.glyphMap;
  dataType: string;
  collected: boolean;
  purpose: string;
  shared: string;
}

function DataRow({ icon, dataType, collected, purpose, shared }: DataRowProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.dataRow, { borderBottomColor: theme.border }]}>
      <View style={styles.dataRowHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}15` }]}>
          <Feather name={icon} size={18} color={theme.primary} />
        </View>
        <View style={styles.dataRowInfo}>
          <ThemedText type="body" style={styles.dataType}>{dataType}</ThemedText>
          <View style={[
            styles.collectedBadge,
            { backgroundColor: collected ? `${theme.success}20` : `${theme.textSecondary}15` }
          ]}>
            <Feather 
              name={collected ? "check" : "x"} 
              size={12} 
              color={collected ? theme.success : theme.textSecondary} 
            />
            <ThemedText 
              type="caption" 
              style={{ color: collected ? theme.success : theme.textSecondary, marginLeft: 4 }}
            >
              {collected ? "Collected" : "Not Collected"}
            </ThemedText>
          </View>
        </View>
      </View>
      {collected ? (
        <View style={styles.dataDetails}>
          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Purpose:</ThemedText>
            <ThemedText type="caption" style={styles.detailValue}>{purpose}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Shared:</ThemedText>
            <ThemedText type="caption" style={styles.detailValue}>{shared}</ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function DataCollectionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: `${theme.primary}10` }]}>
          <View style={styles.summaryHeader}>
            <Feather name="shield" size={24} color={theme.primary} />
            <ThemedText type="h4" style={styles.summaryTitle}>Privacy First</ThemedText>
          </View>
          <ThemedText type="body" style={[styles.summaryText, { color: theme.textSecondary }]}>
            EmoCall is designed for anonymity. We collect minimal data required to connect you with others - no names, no emails, no profiles.
          </ThemedText>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>Data We Collect</ThemedText>

        <View style={[styles.dataCard, { backgroundColor: theme.backgroundSecondary }]}>
          <DataRow
            icon="smartphone"
            dataType="Device Identifier"
            collected={true}
            purpose="Create anonymous session"
            shared="Never shared"
          />
          <DataRow
            icon="mic"
            dataType="Voice Audio"
            collected={true}
            purpose="Live call functionality only"
            shared="Call partner (real-time only)"
          />
          <DataRow
            icon="activity"
            dataType="App Activity"
            collected={true}
            purpose="Aura points, streaks, ratings"
            shared="Never shared"
          />
          <DataRow
            icon="credit-card"
            dataType="Purchase History"
            collected={true}
            purpose="Credit transactions"
            shared="Payment processor only"
          />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>Data We Don't Collect</ThemedText>

        <View style={[styles.dataCard, { backgroundColor: theme.backgroundSecondary }]}>
          <DataRow
            icon="user"
            dataType="Name"
            collected={false}
            purpose=""
            shared=""
          />
          <DataRow
            icon="mail"
            dataType="Email Address"
            collected={false}
            purpose=""
            shared=""
          />
          <DataRow
            icon="map-pin"
            dataType="Location"
            collected={false}
            purpose=""
            shared=""
          />
          <DataRow
            icon="users"
            dataType="Contacts"
            collected={false}
            purpose=""
            shared=""
          />
          <DataRow
            icon="image"
            dataType="Photos/Media"
            collected={false}
            purpose=""
            shared=""
          />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>Security Practices</ThemedText>

        <View style={[styles.securityCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.securityRow}>
            <Feather name="lock" size={18} color={theme.success} />
            <ThemedText type="body" style={styles.securityText}>Data encrypted in transit (HTTPS/TLS)</ThemedText>
          </View>
          <View style={styles.securityRow}>
            <Feather name="trash-2" size={18} color={theme.success} />
            <ThemedText type="body" style={styles.securityText}>Voice audio not stored after calls</ThemedText>
          </View>
          <View style={styles.securityRow}>
            <Feather name="eye-off" size={18} color={theme.success} />
            <ThemedText type="body" style={styles.securityText}>Anonymous sessions - no login required</ThemedText>
          </View>
          <View style={styles.securityRow}>
            <Feather name="refresh-cw" size={18} color={theme.success} />
            <ThemedText type="body" style={styles.securityText}>Clear data anytime via Settings</ThemedText>
          </View>
        </View>

        <View style={[styles.footerCard, { backgroundColor: `${theme.textSecondary}10` }]}>
          <ThemedText type="caption" style={[styles.footerText, { color: theme.textSecondary }]}>
            This information is provided for transparency and to help complete app store data safety declarations. 
            For full details, see our Privacy Policy.
          </ThemedText>
          <ThemedText type="caption" style={[styles.footerCompany, { color: theme.textSecondary }]}>
            Harmonian Software (M) Sdn Bhd
          </ThemedText>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontWeight: "700",
  },
  summaryText: {
    lineHeight: 22,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  dataCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  dataRow: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  dataRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dataRowInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dataType: {
    fontWeight: "600",
  },
  collectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  dataDetails: {
    marginTop: Spacing.sm,
    marginLeft: 52,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  detailValue: {
    flex: 1,
  },
  securityCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  securityText: {
    flex: 1,
  },
  footerCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  footerCompany: {
    fontWeight: "600",
  },
});
