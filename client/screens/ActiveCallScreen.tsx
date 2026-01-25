import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Modal, Dimensions, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CreditsStoreModal } from "@/components/CreditsStoreModal";
import { ReportModal, ReportReasonId } from "@/components/ReportModal";
import { AuraInfoModal } from "@/components/AuraInfoModal";
import { useTheme } from "@/hooks/useTheme";
import { useAgoraVoice } from "@/hooks/useAgoraVoice";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useCredits, CALL_EXTENSIONS } from "@/contexts/CreditsContext";
import { useAura } from "@/contexts/AuraContext";
import { useSession } from "@/contexts/SessionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const INITIAL_TIME = 300;
const WARNING_TIME = 10;
const MINUTE_REMINDER_INTERVAL = 60;
const TOPUP_REMINDER_THRESHOLD = 600; // Start showing reminders when 10 minutes or less remaining
const SAFETY_CHECK_INTERVAL = 120; // Show safety check every 2 minutes
const AURA_AWARD_INTERVAL = 60; // Award aura every 1 minute
const MAX_CALL_DURATION = 3600; // Maximum call duration: 60 minutes
const MAX_DURATION_WARNING = 300; // Show warning 5 minutes before max

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FATE_MESSAGES = [
  "This connection is unique. Will you let it slip away?",
  "Fate brought you together. Every second counts.",
  "Once this call ends, this moment is gone forever.",
  "Two strangers, one moment. Make it last.",
  "The universe connected you. Keep the conversation alive.",
  "This person may understand you like no one else.",
];

function SoundWaveBar({ delay, isActive }: { delay: number; isActive: boolean }) {
  const { theme } = useTheme();
  const height = useSharedValue(20);

  useEffect(() => {
    if (isActive) {
      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.random() * 30 + 15, { duration: 200 + Math.random() * 100 }),
            withTiming(Math.random() * 20 + 10, { duration: 200 + Math.random() * 100 }),
            withTiming(Math.random() * 35 + 20, { duration: 150 + Math.random() * 100 }),
            withTiming(Math.random() * 15 + 8, { duration: 200 + Math.random() * 100 })
          ),
          -1,
          false
        )
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(8, { duration: 300 });
    }
  }, [isActive, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.soundWaveBar,
        { backgroundColor: isActive ? theme.primary : theme.border },
        animatedStyle,
      ]}
    />
  );
}

function SoundWaveVisualizer({ isActive, isMuted }: { isActive: boolean; isMuted?: boolean }) {
  const { theme } = useTheme();
  const bars = Array(5).fill(0);
  const showActive = isActive && !isMuted;

  return (
    <View style={styles.soundWaveContainer}>
      {bars.map((_, index) => (
        <SoundWaveBar key={index} delay={index * 50} isActive={showActive} />
      ))}
    </View>
  );
}

interface UserAvatarProps {
  label: string;
  isYou?: boolean;
  isSpeaking: boolean;
  isMuted?: boolean;
}

function UserAvatar({ label, isYou = false, isSpeaking, isMuted }: UserAvatarProps) {
  const { theme } = useTheme();
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isSpeaking && !isMuted) {
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(glowScale);
      cancelAnimation(glowOpacity);
      glowScale.value = withSpring(1);
      glowOpacity.value = withTiming(0.1, { duration: 300 });
    }
  }, [isSpeaking, isMuted]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const avatarColor = isYou ? (theme as any).avatarYou || "#FF8574" : (theme as any).avatarThem || theme.success;

  return (
    <View style={styles.userAvatarContainer}>
      <View style={styles.avatarWrapper}>
        <Animated.View
          style={[
            styles.avatarGlow,
            { backgroundColor: avatarColor },
            glowStyle,
          ]}
        />
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Feather name="user" size={24} color="#FFFFFF" />
          {isMuted ? (
            <View style={[styles.mutedBadge, { backgroundColor: theme.error }]}>
              <Feather name="mic-off" size={10} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      </View>
      <ThemedText type="caption" style={[styles.avatarLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <SoundWaveVisualizer isActive={isSpeaking} isMuted={isMuted} />
    </View>
  );
}

interface MinuteReminderModalProps {
  visible: boolean;
  message: string;
  timeLeft: number;
  onExtend: () => void;
  onDismiss: () => void;
}

function MinuteReminderModal({ visible, message, timeLeft, onExtend, onDismiss }: MinuteReminderModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.reminderOverlay}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[styles.reminderContent, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.reminderIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="heart" size={24} color={theme.primary} />
          </View>

          <ThemedText type="h3" style={styles.reminderTitle}>
            {t("reminder.title", { time: formatTime(timeLeft) })}
          </ThemedText>

          <ThemedText
            type="body"
            style={[styles.reminderMessage, { color: theme.textSecondary }]}
          >
            {message}
          </ThemedText>

          <View style={styles.reminderButtons}>
            <Pressable
              onPress={onExtend}
              style={({ pressed }) => [
                styles.reminderButton,
                styles.reminderButtonPrimary,
                { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Feather name="plus-circle" size={18} color="#FFFFFF" />
              <ThemedText style={styles.reminderButtonText}>{t("call.extendCall")}</ThemedText>
            </Pressable>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.reminderButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ThemedText style={[styles.reminderButtonTextSecondary, { color: theme.textSecondary }]}>
                {t("reminder.laterButton")}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface SafetyCheckModalProps {
  visible: boolean;
  onFeelSafe: () => void;
  onNotSafe: () => void;
  onContinueAnyway: () => void;
  onEndCall: () => void;
  showFollowUp: boolean;
}

function SafetyCheckModal({ 
  visible, 
  onFeelSafe, 
  onNotSafe, 
  onContinueAnyway, 
  onEndCall,
  showFollowUp 
}: SafetyCheckModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.reminderOverlay}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[styles.reminderContent, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.reminderIcon, { backgroundColor: showFollowUp ? `${theme.warning}15` : `${theme.success}15` }]}>
            <Feather 
              name={showFollowUp ? "alert-circle" : "shield"} 
              size={24} 
              color={showFollowUp ? theme.warning : theme.success} 
            />
          </View>

          {showFollowUp ? (
            <>
              <ThemedText type="h3" style={styles.reminderTitle}>
                {t("safety.followUpTitle")}
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.reminderMessage, { color: theme.textSecondary }]}
              >
                {t("safety.followUpMessage")}
              </ThemedText>
              <View style={styles.reminderButtons}>
                <Pressable
                  onPress={onEndCall}
                  style={({ pressed }) => [
                    styles.reminderButton,
                    styles.reminderButtonPrimary,
                    { backgroundColor: theme.error, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Feather name="phone-off" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.reminderButtonText}>{t("safety.endCallButton")}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={onContinueAnyway}
                  style={({ pressed }) => [
                    styles.reminderButton,
                    { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.reminderButtonTextSecondary, { color: theme.textSecondary }]}>
                    {t("safety.continueButton")}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ThemedText type="h3" style={styles.reminderTitle}>
                {t("safety.title")}
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.reminderMessage, { color: theme.textSecondary }]}
              >
                {t("safety.question")}
              </ThemedText>
              <View style={styles.reminderButtons}>
                <Pressable
                  onPress={onFeelSafe}
                  style={({ pressed }) => [
                    styles.reminderButton,
                    styles.reminderButtonPrimary,
                    { backgroundColor: theme.success, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Feather name="check-circle" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.reminderButtonText}>{t("safety.safeButton")}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={onNotSafe}
                  style={({ pressed }) => [
                    styles.reminderButton,
                    { backgroundColor: theme.warning, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.reminderButtonText, { color: "#FFFFFF" }]}>
                    {t("safety.notSafeButton")}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface EndCallConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function EndCallConfirmModal({ visible, onConfirm, onCancel }: EndCallConfirmModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.reminderOverlay}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[styles.reminderContent, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.reminderIcon, { backgroundColor: `${theme.error}15` }]}>
            <Feather name="phone-off" size={24} color={theme.error} />
          </View>

          <ThemedText type="h3" style={styles.reminderTitle}>
            {t("callEnd.title")}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.reminderMessage, { color: theme.textSecondary }]}
          >
            {t("callEnd.message")}
          </ThemedText>

          <View style={styles.reminderButtons}>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.reminderButton,
                styles.reminderButtonPrimary,
                { backgroundColor: theme.error, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Feather name="phone-off" size={18} color="#FFFFFF" />
              <ThemedText style={styles.reminderButtonText}>{t("callEnd.confirmButton")}</ThemedText>
            </Pressable>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.reminderButton,
                { backgroundColor: theme.success, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <ThemedText style={[styles.reminderButtonText, { color: "#FFFFFF" }]}>
                {t("callEnd.cancelButton")}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ExtensionModalProps {
  visible: boolean;
  onSelectExtension: (extensionId: string) => void;
  onEndCall: () => void;
  onOpenStore: () => void;
  timeLeft: number;
  credits: number;
  isFinalWarning?: boolean;
}

function ExtensionModal({ 
  visible, 
  onSelectExtension, 
  onEndCall,
  onOpenStore,
  timeLeft,
  credits,
  isFinalWarning = false,
}: ExtensionModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[styles.modalContent, { backgroundColor: theme.surface }]}
        >
          <View
            style={[styles.modalBadge, { backgroundColor: isFinalWarning ? theme.error : theme.primary }]}
          >
            <Feather name={isFinalWarning ? "alert-circle" : "clock"} size={16} color="#FFFFFF" />
            <ThemedText style={styles.modalBadgeText}>
              {t("extension.timeLeft", { time: timeLeft })}
            </ThemedText>
          </View>

          <ThemedText type="h2" style={styles.modalTitle}>
            {isFinalWarning ? t("extension.lastChanceTitle") : t("extension.title")}
          </ThemedText>
          
          <ThemedText
            type="body"
            style={[styles.modalDescription, { color: theme.textSecondary }]}
          >
            {isFinalWarning 
              ? t("extension.lastChanceDescription")
              : t("extension.description")}
          </ThemedText>

          <Pressable
            onPress={onOpenStore}
            style={({ pressed }) => [
              styles.creditsBalance,
              { 
                backgroundColor: theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              }
            ]}
          >
            <Feather name="zap" size={16} color={theme.primary} />
            <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
              {credits} {t("call.credits")}
            </ThemedText>
            <Feather name="plus" size={14} color={theme.primary} />
          </Pressable>

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
                      {t("extension.minutes", { count: ext.minutes })}
                    </ThemedText>
                    <ThemedText 
                      type="small" 
                      style={{ color: canAfford ? theme.textSecondary : theme.textDisabled }}
                    >
                      {ext.cost} {t("call.credits")}
                    </ThemedText>
                  </View>
                  {canAfford ? (
                    <Feather name="chevron-right" size={20} color={theme.primary} />
                  ) : (
                    <Pressable
                      onPress={onOpenStore}
                      style={({ pressed }) => [
                        styles.buyCreditsButton,
                        { backgroundColor: `${theme.primary}30`, opacity: pressed ? 0.7 : 1 }
                      ]}
                    >
                      <ThemedText type="small" style={{ color: theme.text, fontWeight: "600" }}>
                        {t("call.getCredits")}
                      </ThemedText>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText
            type="small"
            style={[styles.refundNote, { color: theme.textSecondary }]}
          >
            {t("extension.refundNote")}
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
              style={[styles.endCallText, { color: theme.error }]}
            >
              {t("extension.endCallButton")}
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
  isHighlighted?: boolean;
}

function ControlButton({
  icon,
  label,
  onPress,
  isActive = false,
  isDestructive = false,
  isHighlighted = false,
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
    : isHighlighted
    ? theme.success
    : isActive
    ? theme.primary
    : theme.backgroundSecondary;

  const iconColor = isDestructive || isActive || isHighlighted ? "#FFFFFF" : theme.text;

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
  const { t } = useLanguage();
  const { credits, purchaseCallExtension, refundUnusedMinutes } = useCredits();
  const { awardCallCompletion, awardCallExtension, awardCallMinute, aura } = useAura();
  const { session } = useSession();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ActiveCall">>();

  const callId = route.params?.callId || "default-channel";
  const partnerId = route.params?.partnerId || "unknown";
  const initialDuration = route.params?.duration || 300;
  const startedAtParam = route.params?.startedAt;
  const isPreview = route.params?.isPreview || false;
  
  // Calculate initial time remaining based on server-provided startedAt
  // This ensures both users have synchronized timers
  const getInitialTimeRemaining = () => {
    if (startedAtParam) {
      const startedAtMs = new Date(startedAtParam).getTime();
      const elapsedMs = Date.now() - startedAtMs;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, initialDuration - elapsedSeconds);
      console.log("[ActiveCall] Synced timer - startedAt:", startedAtParam, "elapsed:", elapsedSeconds, "remaining:", remaining);
      return remaining;
    }
    return initialDuration;
  };
  
  const {
    isConnected: isVoiceConnected,
    isConnecting: isVoiceConnecting,
    isMuted,
    remoteUserJoined,
    remoteUserLeft,
    error: voiceError,
    join: joinVoice,
    leave: leaveVoice,
    toggleMute,
  } = useAgoraVoice({ 
    channelName: callId,
    enabled: !isPreview, // Skip Agora in preview mode
  });

  const hasEndedRef = useRef(false);

  useEffect(() => {
    if (remoteUserLeft && !hasEndedRef.current) {
      console.log("[ActiveCall] Detected partner left Agora channel - ending call");
      hasEndedRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (speakingRef.current) {
        clearInterval(speakingRef.current);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      leaveVoice().then(() => {
        navigation.replace("CallEnded", { reason: "partner_left" });
      });
    }
  }, [remoteUserLeft, leaveVoice, navigation]);

  const [timeRemaining, setTimeRemaining] = useState(() => getInitialTimeRemaining());
  const [totalCallTime, setTotalCallTime] = useState(() => {
    // Initialize total call time based on how much time has already elapsed
    if (startedAtParam) {
      const startedAtMs = new Date(startedAtParam).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      return Math.max(0, elapsedSeconds);
    }
    return 0;
  });
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showCreditsStore, setShowCreditsStore] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [hasExtended, setHasExtended] = useState(false);
  const [currentExtension, setCurrentExtension] = useState<string | null>(null);
  const [extensionStartTime, setExtensionStartTime] = useState<number | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [lastReminderTime, setLastReminderTime] = useState(INITIAL_TIME);
  const [youSpeaking, setYouSpeaking] = useState(false);
  const [themSpeaking, setThemSpeaking] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); // Default: loud speaker mode
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [showSafetyFollowUp, setShowSafetyFollowUp] = useState(false);
  const [lastSafetyCheckTime, setLastSafetyCheckTime] = useState(INITIAL_TIME);
  const [lastAuraAwardTime, setLastAuraAwardTime] = useState(INITIAL_TIME);
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);
  const [showAuraInfo, setShowAuraInfo] = useState(false);
  const [showMaxTimeWarning, setShowMaxTimeWarning] = useState(false);
  const [reachedMaxDuration, setReachedMaxDuration] = useState(false);

  const timerPulse = useSharedValue(1);
  const connectionPulse = useSharedValue(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speakingRef = useRef<NodeJS.Timeout | null>(null);

  const { endCall: endCallWs, callEndedByPartner, clearCallEnded, signalReady, callStartedAt, state: matchmakingState } = useMatchmaking({
    sessionId: session?.id || null,
  });
  
  // Track if we've signaled ready to the server
  const hasSignaledReadyRef = useRef(false);
  // Track if we're waiting for partner to be ready
  const [waitingForPartner, setWaitingForPartner] = useState(true);

  useEffect(() => {
    if (callEndedByPartner && !hasEndedRef.current) {
      console.log("[ActiveCall] Partner ended call (via WebSocket), reason:", callEndedByPartner);
      hasEndedRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (speakingRef.current) {
        clearInterval(speakingRef.current);
      }
      setShowExtensionModal(false);
      setShowReminderModal(false);
      clearCallEnded();
      leaveVoice().then(() => {
        navigation.replace("CallEnded", { reason: "partner_ended" });
      });
    }
  }, [callEndedByPartner, clearCallEnded, leaveVoice, navigation]);

  const isWarningTime = timeRemaining <= WARNING_TIME && !hasExtended;
  const isUrgent = timeRemaining <= WARNING_TIME;

  // Handle when max duration is reached - auto-end call with emotional message
  useEffect(() => {
    if (reachedMaxDuration && !hasEndedRef.current) {
      hasEndedRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (speakingRef.current) {
        clearInterval(speakingRef.current);
      }
      setShowExtensionModal(false);
      setShowReminderModal(false);
      
      endCallWs("max_duration", 0);
      leaveVoice().then(() => {
        navigation.replace("CallEnded", { reason: "max_duration" });
      });
    }
  }, [reachedMaxDuration, leaveVoice, navigation, endCallWs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Join Agora immediately, then signal ready to the server
  useEffect(() => {
    console.log("[ActiveCall] Joining voice channel immediately...");
    joinVoice();
  }, []);
  
  // When Agora is connected, signal ready to the server
  useEffect(() => {
    if (isVoiceConnected && !hasSignaledReadyRef.current && callId) {
      console.log("[ActiveCall] Agora connected, signaling ready to server...");
      hasSignaledReadyRef.current = true;
      signalReady(callId);
    }
  }, [isVoiceConnected, callId, signalReady]);
  
  // When call_started is received, stop the connecting state and start the timer
  useEffect(() => {
    if (callStartedAt && waitingForPartner) {
      console.log("[ActiveCall] call_started received! startedAt:", callStartedAt);
      setWaitingForPartner(false);
      
      // Reset timer to exactly 5 minutes (ignore any previous elapsed time since we're synchronized now)
      setTimeRemaining(INITIAL_TIME);
      setTotalCallTime(0);
      setLastReminderTime(INITIAL_TIME);
      setLastSafetyCheckTime(INITIAL_TIME);
      setLastAuraAwardTime(INITIAL_TIME);
      
      // Now we're ready to start
      setIsConnecting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [callStartedAt, waitingForPartner]);
  
  // Also handle matchmaking state changes for waiting_for_partner
  useEffect(() => {
    if (matchmakingState === "waiting_for_partner") {
      console.log("[ActiveCall] Waiting for partner to join...");
    }
  }, [matchmakingState]);

  useEffect(() => {
    if (isConnecting) return;

    speakingRef.current = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.3) {
        setYouSpeaking(true);
        setThemSpeaking(false);
      } else if (rand < 0.6) {
        setYouSpeaking(false);
        setThemSpeaking(true);
      } else if (rand < 0.8) {
        setYouSpeaking(true);
        setThemSpeaking(true);
      } else {
        setYouSpeaking(false);
        setThemSpeaking(false);
      }
    }, 2000);

    return () => {
      if (speakingRef.current) {
        clearInterval(speakingRef.current);
      }
    };
  }, [isConnecting]);

  useEffect(() => {
    if (isConnecting) return;

    timerRef.current = setInterval(() => {
      // Track total elapsed time
      setTotalCallTime((prevTotal) => {
        const newTotal = prevTotal + 1;
        
        // Check if we've reached max duration
        if (newTotal >= MAX_CALL_DURATION) {
          clearInterval(timerRef.current!);
          setReachedMaxDuration(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return MAX_CALL_DURATION;
        }
        
        // Show warning 5 minutes before max
        if (newTotal === MAX_CALL_DURATION - MAX_DURATION_WARNING && !showMaxTimeWarning) {
          setShowMaxTimeWarning(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        
        return newTotal;
      });
      
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          navigation.replace("VibeCheck", {});
          return 0;
        }
        
        if (prev === WARNING_TIME + 1 && !hasExtended) {
          setShowExtensionModal(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        
        // Only show topup reminders when 10 minutes or less remaining, then every minute
        if (!hasExtended && prev <= TOPUP_REMINDER_THRESHOLD && prev > WARNING_TIME && (lastReminderTime - prev) >= MINUTE_REMINDER_INTERVAL) {
          const randomMessage = FATE_MESSAGES[Math.floor(Math.random() * FATE_MESSAGES.length)];
          setReminderMessage(randomMessage);
          setShowReminderModal(true);
          setLastReminderTime(prev);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        // Safety check every 2 minutes
        if ((lastSafetyCheckTime - prev) >= SAFETY_CHECK_INTERVAL && prev > WARNING_TIME) {
          setShowSafetyCheck(true);
          setShowSafetyFollowUp(false);
          setLastSafetyCheckTime(prev);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        // Award 10 aura every minute
        if ((lastAuraAwardTime - prev) >= AURA_AWARD_INTERVAL) {
          awardCallMinute();
          setLastAuraAwardTime(prev);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnecting, hasExtended, navigation, lastReminderTime, lastSafetyCheckTime, lastAuraAwardTime, awardCallMinute, showMaxTimeWarning]);

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
    toggleMute();
  };

  const handleSpeakerToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleSafetyFeelSafe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSafetyCheck(false);
    setShowSafetyFollowUp(false);
  };

  const handleSafetyNotSafe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSafetyFollowUp(true);
  };

  const handleSafetyContinueAnyway = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSafetyCheck(false);
    setShowSafetyFollowUp(false);
  };

  const handleEndCall = useCallback(async () => {
    if (hasEndedRef.current) {
      console.log("[ActiveCall] handleEndCall called but call already ended");
      return;
    }
    console.log("[ActiveCall] handleEndCall triggered, timeRemaining:", timeRemaining);
    hasEndedRef.current = true;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (speakingRef.current) {
      clearInterval(speakingRef.current);
    }
    setShowExtensionModal(false);
    setShowReminderModal(false);

    console.log("[ActiveCall] Calling endCallWs...");
    endCallWs("normal", timeRemaining);
    console.log("[ActiveCall] Leaving voice...");
    await leaveVoice();
    console.log("[ActiveCall] Voice left, navigating to VibeCheck...");

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

    navigation.replace("VibeCheck", {});
  }, [currentExtension, extensionStartTime, refundUnusedMinutes, navigation, leaveVoice, endCallWs, timeRemaining]);

  const handleReport = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (reasons: ReportReasonId[], otherReason: string) => {
    if (!session?.id) return;
    
    setIsReportSubmitting(true);
    try {
      await apiRequest("POST", "/api/reports", {
        reporterSessionId: session.id,
        reasons: Array.from(reasons),
        otherReason: otherReason || undefined,
      });
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setShowReportModal(false);
      navigation.replace("CallEnded", { reason: "reported" });
    } catch (error) {
      console.error("Error submitting report:", error);
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const handleSelectExtension = async (extensionId: string) => {
    const result = purchaseCallExtension(extensionId);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      awardCallExtension();
      setShowExtensionModal(false);
      setShowReminderModal(false);
      setHasExtended(true);
      setCurrentExtension(extensionId);
      setExtensionStartTime(Date.now());
      
      // Cap extension time so total doesn't exceed max duration
      const remainingToMax = MAX_CALL_DURATION - totalCallTime;
      const extensionSeconds = result.minutes * 60;
      const cappedExtension = Math.min(extensionSeconds, remainingToMax - timeRemaining);
      setTimeRemaining((prev) => prev + Math.max(0, cappedExtension));
    }
  };
  
  // Calculate available extension time
  const getAvailableExtensionTime = () => {
    const remainingToMax = MAX_CALL_DURATION - totalCallTime;
    return Math.max(0, remainingToMax - timeRemaining);
  };
  
  const availableExtensionMinutes = Math.floor(getAvailableExtensionTime() / 60);
  const isNearMaxDuration = totalCallTime >= MAX_CALL_DURATION - MAX_DURATION_WARNING;

  const handleReminderExtend = () => {
    setShowReminderModal(false);
    setShowExtensionModal(true);
  };

  const handleOpenCreditsStore = () => {
    setShowCreditsStore(true);
  };

  return (
    <ThemedView
      style={[
        styles.container,
        isUrgent && !hasExtended && { backgroundColor: theme.error },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Pressable
            onPress={handleOpenCreditsStore}
            style={({ pressed }) => [
              styles.creditsHeaderButton,
              { 
                backgroundColor: isUrgent && !hasExtended 
                  ? "rgba(255,255,255,0.2)" 
                  : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather 
              name="zap" 
              size={16} 
              color={isUrgent && !hasExtended ? "#FFFFFF" : theme.primary} 
            />
            <ThemedText 
              type="small" 
              style={{ 
                color: isUrgent && !hasExtended ? "#FFFFFF" : theme.primary,
                fontWeight: "600",
              }}
            >
              {credits}
            </ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(400).delay(100)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAuraInfo(true);
            }}
            style={({ pressed }) => [
              styles.karmaHeaderDisplay,
              { 
                backgroundColor: isUrgent && !hasExtended 
                  ? "rgba(255,255,255,0.2)" 
                  : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather 
              name="star" 
              size={16} 
              color={isUrgent && !hasExtended ? "#FFFFFF" : "#FF6B6B"} 
            />
            <ThemedText 
              type="small" 
              style={{ 
                color: isUrgent && !hasExtended ? "#FFFFFF" : "#FF6B6B",
                fontWeight: "600",
              }}
            >
              {aura}
            </ThemedText>
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
                <Feather name="phone-call" size={32} color="#FFFFFF" />
              </View>
            </Animated.View>
            <ThemedText type="h3" style={styles.connectingText}>
              {isVoiceConnected && waitingForPartner ? t("call.waitingForPartner") : t("call.connecting")}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.connectingSubtext, { color: theme.textSecondary }]}
            >
              {isVoiceConnected && waitingForPartner 
                ? t("call.partnerJoining") 
                : isVoiceConnecting 
                  ? t("call.settingUpVoice") 
                  : t("call.preparingCall")}
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.callContainer}>
            <ThemedText
              type="body"
              style={[
                styles.statusText,
                {
                  color: isUrgent && !hasExtended ? "#FFFFFF" : theme.success,
                },
              ]}
            >
              {isUrgent && !hasExtended ? t("call.timeAlmostUp") : t("call.connected")}
            </ThemedText>
            
            {/* Voice status indicator */}
            <View style={styles.voiceStatusContainer}>
              <View style={[
                styles.voiceStatusDot,
                { backgroundColor: voiceError ? theme.error : (isVoiceConnected ? theme.success : theme.warning) }
              ]} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {voiceError 
                  ? t("call.voiceError", { error: voiceError }) 
                  : isVoiceConnecting 
                    ? t("call.voiceConnecting") 
                    : isVoiceConnected 
                      ? (remoteUserJoined ? t("call.voicePartnerConnected") : t("call.voiceWaitingPartner")) 
                      : t("call.voiceInitializing")}
              </ThemedText>
            </View>

            <View style={styles.usersContainer}>
              <UserAvatar 
                label={t("call.you")} 
                isYou 
                isSpeaking={youSpeaking} 
                isMuted={isMuted}
              />
              
              <View style={styles.connectionLine}>
                <View style={[styles.connectionDot, { backgroundColor: theme.success }]} />
                <View style={[styles.connectionDash, { backgroundColor: `${theme.success}50` }]} />
                <Feather name="heart" size={16} color={theme.primary} />
                <View style={[styles.connectionDash, { backgroundColor: `${theme.success}50` }]} />
                <View style={[styles.connectionDot, { backgroundColor: theme.success }]} />
              </View>

              <UserAvatar 
                label={t("call.them")} 
                isSpeaking={themSpeaking} 
              />
            </View>

            <Animated.View
              style={[
                styles.timerDisplay,
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
                {hasExtended ? t("call.extendedSession") : t("call.timeRemainingLabel")}
              </ThemedText>
            </Animated.View>

            <Pressable
              onPress={() => setShowExtensionModal(true)}
              style={({ pressed }) => [
                styles.extendButton,
                { 
                  backgroundColor: theme.success,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="plus-circle" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {t("call.extendCall")}
              </ThemedText>
            </Pressable>

            {hasExtended ? (
              <View style={[styles.extendedBadge, { backgroundColor: `${theme.success}20` }]}>
                <Feather name="check-circle" size={14} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.success }}>
                  {t("call.callExtendedMessage")}
                </ThemedText>
              </View>
            ) : null}
          </Animated.View>
        )}
      </View>

      <View style={styles.disclaimerContainer}>
        <Feather name="alert-triangle" size={12} color={theme.textSecondary} />
        <ThemedText type="small" style={styles.disclaimerText}>
          {t("call.safetyDisclaimer")}
        </ThemedText>
      </View>

      <Animated.View
        entering={FadeInUp.delay(500).duration(400)}
        style={[
          styles.controls,
          { paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
      >
        <ControlButton
          icon={isSpeakerOn ? "volume-2" : "phone-call"}
          label={isSpeakerOn ? t("call.speaker") : t("call.earpiece")}
          onPress={handleSpeakerToggle}
          isActive={isSpeakerOn}
        />
        <ControlButton
          icon={isMuted ? "mic-off" : "mic"}
          label={isMuted ? t("call.unmute") : t("call.mute")}
          onPress={handleMuteToggle}
          isActive={isMuted}
        />
        <Pressable
          onPress={handleReport}
          style={({ pressed }) => [
            styles.panicButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={styles.panicButtonInner}>
            <Feather name="shield" size={24} color="#FFFFFF" />
          </View>
          <ThemedText 
            type="small" 
            style={styles.panicButtonLabel}
          >
            {t("call.report")}
          </ThemedText>
        </Pressable>
        <ControlButton
          icon="phone-off"
          label={t("call.endCall")}
          onPress={() => setShowEndCallConfirm(true)}
          isDestructive
        />
      </Animated.View>

      <MinuteReminderModal
        visible={showReminderModal && !showExtensionModal}
        message={reminderMessage}
        timeLeft={timeRemaining}
        onExtend={handleReminderExtend}
        onDismiss={() => setShowReminderModal(false)}
      />

      <ExtensionModal
        visible={showExtensionModal}
        onSelectExtension={handleSelectExtension}
        onEndCall={handleEndCall}
        onOpenStore={handleOpenCreditsStore}
        timeLeft={timeRemaining}
        credits={credits}
        isFinalWarning={isWarningTime}
      />

      <CreditsStoreModal
        visible={showCreditsStore}
        onClose={() => setShowCreditsStore(false)}
      />

      <AuraInfoModal
        visible={showAuraInfo}
        onClose={() => setShowAuraInfo(false)}
      />

      <SafetyCheckModal
        visible={showSafetyCheck}
        onFeelSafe={handleSafetyFeelSafe}
        onNotSafe={handleSafetyNotSafe}
        onContinueAnyway={handleSafetyContinueAnyway}
        onEndCall={handleEndCall}
        showFollowUp={showSafetyFollowUp}
      />

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        isSubmitting={isReportSubmitting}
      />

      <EndCallConfirmModal
        visible={showEndCallConfirm}
        onConfirm={() => {
          setShowEndCallConfirm(false);
          handleEndCall();
        }}
        onCancel={() => setShowEndCallConfirm(false)}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  creditsHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  karmaHeaderDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  connectingContainer: {
    alignItems: "center",
    gap: Spacing.md,
  },
  connectingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  connectingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  connectingText: {
    textAlign: "center",
  },
  connectingSubtext: {
    textAlign: "center",
  },
  callContainer: {
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  statusText: {
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  voiceStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  voiceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  usersContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  userAvatarContainer: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  avatarWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  mutedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: {
    fontWeight: "500",
  },
  soundWaveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    gap: 2,
  },
  soundWaveBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 6,
  },
  connectionLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  connectionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  connectionDash: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  timerDisplay: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: "center",
    gap: 2,
  },
  timerText: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 1,
    fontWeight: "700",
  },
  extendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  extendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  disclaimerText: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: "center",
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing["2xl"],
    paddingHorizontal: Spacing.md,
  },
  controlButtonContainer: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    textAlign: "center",
  },
  panicButton: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  panicButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC3545",
  },
  panicButtonLabel: {
    textAlign: "center",
    color: "#DC3545",
    fontWeight: "600",
  },
  reminderOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  reminderContent: {
    width: "100%",
    maxWidth: 300,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  reminderTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  reminderMessage: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  reminderButtons: {
    width: "100%",
    gap: Spacing.md,
  },
  reminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  reminderButtonPrimary: {},
  reminderButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  reminderButtonTextSecondary: {
    fontWeight: "500",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    maxHeight: "85%",
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
    lineHeight: 22,
  },
  creditsBalance: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
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
  buyCreditsButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
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
    fontWeight: "600",
  },
});
