import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Modal, Dimensions, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useCredits, CALL_EXTENSIONS } from "@/contexts/CreditsContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const INITIAL_TIME = 300;
const WARNING_TIME = 10;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ExtensionModalProps {
  visible: boolean;
  onSelectExtension: (extensionId: string) => void;
  onEndCall: () => void;
  timeLeft: number;
  credits: number;
}

function ExtensionModal({ 
  visible, 
  onSelectExtension, 
  onEndCall, 
  timeLeft,
  credits,
}: ExtensionModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[styles.modalContent, { backgroundColor: theme.surface }]}
        >
          <View
            style={[styles.modalBadge, { backgroundColor: theme.primary }]}
          >
            <Feather name="clock" size={16} color="#FFFFFF" />
            <ThemedText style={styles.modalBadgeText}>
              {timeLeft}s left
            </ThemedText>
          </View>

          <ThemedText type="h2" style={styles.modalTitle}>
            Extend Your Call?
          </ThemedText>
          
          <ThemedText
            type="body"
            style={[styles.modalDescription, { color: theme.textSecondary }]}
          >
            Choose how long you want to continue talking
          </ThemedText>

          <View style={styles.creditsBalance}>
            <Feather name="zap" size={16} color={theme.primary} />
            <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
              {credits} credits available
            </ThemedText>
          </View>

          <ScrollView 
            style={styles.extensionsList}
            showsVerticalScrollIndicator={false}
          >
            {CALL_EXTENSIONS.map((ext) => {
              const canAfford = credits >= ext.cost;
              return (
                <Pressable
                  key={ext.id}
                  onPress={() => canAfford && onSelectExtension(ext.id)}
                  disabled={!canAfford}
                  style={({ pressed }) => [
                    styles.extensionOption,
                    {
                      backgroundColor: canAfford 
                        ? (pressed ? `${theme.primary}15` : theme.backgroundSecondary)
                        : theme.backgroundSecondary,
                      borderColor: canAfford ? theme.primary : theme.border,
                      opacity: canAfford ? (pressed ? 0.9 : 1) : 0.5,
                    },
                  ]}
                >
                  <View style={styles.extensionInfo}>
                    <ThemedText type="h4" style={{ color: canAfford ? theme.text : theme.textDisabled }}>
                      +{ext.minutes} minutes
                    </ThemedText>
                    <ThemedText 
                      type="small" 
                      style={{ color: canAfford ? theme.textSecondary : theme.textDisabled }}
                    >
                      {ext.cost} credits
                    </ThemedText>
                  </View>
                  {canAfford ? (
                    <Feather name="chevron-right" size={20} color={theme.primary} />
                  ) : (
                    <ThemedText type="small" style={{ color: theme.textDisabled }}>
                      Need more
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText
            type="small"
            style={[styles.refundNote, { color: theme.textSecondary }]}
          >
            Unused time will be refunded as credits if call ends early
          </ThemedText>

          <Pressable
            onPress={onEndCall}
            style={({ pressed }) => [
              styles.endCallButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText
              type="body"
              style={[styles.endCallText, { color: theme.textSecondary }]}
            >
              End Call Instead
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ControlButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  isActive?: boolean;
  isDestructive?: boolean;
}

function ControlButton({
  icon,
  label,
  onPress,
  isActive = false,
  isDestructive = false,
}: ControlButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const backgroundColor = isDestructive
    ? theme.error
    : isActive
    ? theme.primary
    : theme.backgroundSecondary;

  const iconColor = isDestructive || isActive ? "#FFFFFF" : theme.text;

  return (
    <View style={styles.controlButtonContainer}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.controlButton,
          { backgroundColor },
          animatedStyle,
        ]}
      >
        <Feather name={icon} size={28} color={iconColor} />
      </AnimatedPressable>
      <ThemedText
        type="caption"
        style={[styles.controlLabel, { color: theme.textSecondary }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export default function ActiveCallScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { credits, purchaseCallExtension, refundUnusedMinutes } = useCredits();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ActiveCall">>();

  const [timeRemaining, setTimeRemaining] = useState(INITIAL_TIME);
  const [isMuted, setIsMuted] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [hasExtended, setHasExtended] = useState(false);
  const [currentExtension, setCurrentExtension] = useState<string | null>(null);
  const [extensionStartTime, setExtensionStartTime] = useState<number | null>(null);

  const timerPulse = useSharedValue(1);
  const connectionPulse = useSharedValue(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isWarningTime = timeRemaining <= WARNING_TIME && !hasExtended;
  const isUrgent = timeRemaining <= WARNING_TIME;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const connectTimeout = setTimeout(() => {
      setIsConnecting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2000);

    return () => clearTimeout(connectTimeout);
  }, []);

  useEffect(() => {
    if (isConnecting) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          navigation.replace("CallEnded", { reason: "timeout" });
          return 0;
        }
        
        if (prev === WARNING_TIME + 1 && !hasExtended) {
          setShowExtensionModal(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnecting, hasExtended, navigation]);

  useEffect(() => {
    if (isUrgent && !hasExtended) {
      timerPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(timerPulse);
      timerPulse.value = withSpring(1);
    }
  }, [isUrgent, hasExtended]);

  useEffect(() => {
    if (isConnecting) {
      connectionPulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(connectionPulse);
      connectionPulse.value = 1;
    }
  }, [isConnecting]);

  const timerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerPulse.value }],
  }));

  const connectionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: connectionPulse.value }],
    opacity: connectionPulse.value > 1 ? 0.7 : 1,
  }));

  const handleMuteToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
  };

  const handleEndCall = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setShowExtensionModal(false);

    if (currentExtension && extensionStartTime !== null) {
      const ext = CALL_EXTENSIONS.find((e) => e.id === currentExtension);
      if (ext) {
        const elapsedMinutes = (Date.now() - extensionStartTime) / 60000;
        const unusedMinutes = Math.max(0, ext.minutes - elapsedMinutes);
        if (unusedMinutes > 1) {
          refundUnusedMinutes(unusedMinutes, currentExtension);
        }
      }
    }

    navigation.replace("CallEnded", { reason: "ended" });
  }, [currentExtension, extensionStartTime, refundUnusedMinutes, navigation]);

  const handleReport = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    navigation.replace("CallEnded", { reason: "reported" });
  };

  const handleSelectExtension = async (extensionId: string) => {
    const result = purchaseCallExtension(extensionId);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowExtensionModal(false);
      setHasExtended(true);
      setCurrentExtension(extensionId);
      setExtensionStartTime(Date.now());
      setTimeRemaining((prev) => prev + (result.minutes * 60));
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        isUrgent && !hasExtended && { backgroundColor: theme.error },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.reportButton}>
          <Pressable
            onPress={handleReport}
            style={({ pressed }) => [
              styles.reportPressable,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather
              name="flag"
              size={20}
              color={isUrgent && !hasExtended ? "#FFFFFF" : theme.textSecondary}
            />
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.content}>
        {isConnecting ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.connectingContainer}>
            <Animated.View
              style={[
                styles.connectingCircle,
                { backgroundColor: `${theme.primary}30` },
                connectionAnimatedStyle,
              ]}
            >
              <View
                style={[
                  styles.connectingInner,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Feather name="phone-call" size={40} color="#FFFFFF" />
              </View>
            </Animated.View>
            <ThemedText type="h3" style={styles.connectingText}>
              Connecting...
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.connectingSubtext, { color: theme.textSecondary }]}
            >
              Finding someone for you
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.timerContainer}>
            <ThemedText
              type="body"
              style={[
                styles.statusText,
                {
                  color: isUrgent && !hasExtended ? "#FFFFFF" : theme.success,
                },
              ]}
            >
              {isUrgent && !hasExtended ? "Time Almost Up!" : "Connected"}
            </ThemedText>

            <Animated.View
              style={[
                styles.timerCircle,
                {
                  backgroundColor:
                    isUrgent && !hasExtended
                      ? "rgba(255,255,255,0.2)"
                      : theme.backgroundSecondary,
                  borderColor:
                    isUrgent && !hasExtended ? "#FFFFFF" : theme.border,
                },
                timerAnimatedStyle,
              ]}
            >
              <ThemedText
                type="h1"
                style={[
                  styles.timerText,
                  {
                    color: isUrgent && !hasExtended ? "#FFFFFF" : theme.text,
                  },
                ]}
              >
                {formatTime(timeRemaining)}
              </ThemedText>
              <ThemedText
                type="small"
                style={{
                  color:
                    isUrgent && !hasExtended
                      ? "rgba(255,255,255,0.7)"
                      : theme.textSecondary,
                }}
              >
                {hasExtended ? "Extended" : "Remaining"}
              </ThemedText>
            </Animated.View>

            {hasExtended ? (
              <View style={[styles.extendedBadge, { backgroundColor: `${theme.success}20` }]}>
                <Feather name="check-circle" size={14} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.success }}>
                  Call Extended
                </ThemedText>
              </View>
            ) : null}
          </Animated.View>
        )}
      </View>

      <Animated.View
        entering={FadeInUp.delay(500).duration(400)}
        style={[
          styles.controls,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        <ControlButton
          icon={isMuted ? "mic-off" : "mic"}
          label={isMuted ? "Unmute" : "Mute"}
          onPress={handleMuteToggle}
          isActive={isMuted}
        />
        <ControlButton
          icon="phone-off"
          label="End Call"
          onPress={handleEndCall}
          isDestructive
        />
      </Animated.View>

      <ExtensionModal
        visible={showExtensionModal}
        onSelectExtension={handleSelectExtension}
        onEndCall={handleEndCall}
        timeLeft={timeRemaining}
        credits={credits}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.xl,
  },
  reportButton: {
    padding: Spacing.sm,
  },
  reportPressable: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  connectingContainer: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  connectingCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  connectingInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  connectingText: {
    textAlign: "center",
  },
  connectingSubtext: {
    textAlign: "center",
  },
  timerContainer: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  statusText: {
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  timerCircle: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
  },
  timerText: {
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: 2,
  },
  extendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing["5xl"],
    paddingHorizontal: Spacing.xl,
  },
  controlButtonContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["2xl"],
    alignItems: "center",
    maxHeight: "80%",
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  modalBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  modalDescription: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  creditsBalance: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  extensionsList: {
    width: "100%",
    maxHeight: 200,
  },
  extensionOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  extensionInfo: {
    gap: 2,
  },
  refundNote: {
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    fontStyle: "italic",
  },
  endCallButton: {
    padding: Spacing.md,
    alignItems: "center",
  },
  endCallText: {
    fontWeight: "500",
  },
});
