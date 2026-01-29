import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
  FlatList,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image: any;
  icon?: string;
  color: string;
  textColor: string;
  isFinal?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "anonymous",
    title: "Skip the\nAwkwardness",
    description: "Walking up to strangers is weird. EmoCall is different: No faces, no names, just real talk.",
    image: require("@/assets/images/splash_1_weird.png"),
    color: "#E0C3FC",
    textColor: "#4A148C",
  },
  {
    id: "match",
    title: "Find Your\nMood Match",
    description: "Feeling down? Find a listener.\nFeeling kind? Be a listener.\nConnect based on vibes, not looks.",
    image: require("@/assets/images/splash_2_hug.png"),
    color: "#FFDEE9",
    textColor: "#880E4F",
  },
  {
    id: "timebank",
    title: "Minutes & Aura",
    description: "Spend Minutes when you need to vent.\nEarn Aura when you listen.\nBuild your reputation as a Top Listener.",
    image: require("@/assets/images/splash_3_coin.png"),
    color: "#FFF4C1",
    textColor: "#F57F17",
  },
  {
    id: "safespace",
    title: "Your Cozy\nSafe Space",
    description: "No judgment allowed in this fort. Just kindness, respect, and real conversations.",
    image: require("@/assets/images/splash_4_bubble.png"),
    color: "#D1FAE5",
    textColor: "#064E3B",
  },
  {
    id: "terms",
    title: "One Last Thing...",
    description: "By entering, you agree to our Terms of Service. Be kind, keep it anonymous, and stay safe.",
    image: null,
    icon: "shield",
    color: "#FFFFFF",
    textColor: "#000000",
    isFinal: true,
  },
];

interface TermsGateScreenProps {
  onAccept: () => void;
}

export default function TermsGateScreen({ onAccept }: TermsGateScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const currentStep = ONBOARDING_STEPS[currentIndex];

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleAccept = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept();
  };

  const handleTermsPress = async () => {
    await Haptics.selectionAsync();
    setShowTerms(true);
  };

  const handlePrivacyPress = async () => {
    await Haptics.selectionAsync();
    setShowPrivacy(true);
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => {
    const isActive = index === currentIndex;

    return (
      <View style={[styles.stepContainer, { backgroundColor: item.color }]}>
        <View style={styles.imageSection}>
          {item.image ? (
            <Image
              source={item.image}
              style={styles.stepImage}
              resizeMode="cover"
            />
          ) : item.icon ? (
            <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
              <Feather name={item.icon as any} size={60} color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        <View style={[styles.textSection, { backgroundColor: item.color }]}>
          <View style={styles.paginationContainer}>
            {ONBOARDING_STEPS.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotIndex === currentIndex
                      ? item.textColor
                      : `${item.textColor}40`,
                  },
                ]}
              />
            ))}
          </View>

          {isActive ? (
            <Animated.View entering={FadeInDown.duration(400)} key={`title-${index}-${currentIndex}`}>
              <ThemedText
                type="h1"
                style={[styles.stepTitle, { color: item.textColor }]}
              >
                {item.title}
              </ThemedText>
            </Animated.View>
          ) : (
            <ThemedText
              type="h1"
              style={[styles.stepTitle, { color: item.textColor }]}
            >
              {item.title}
            </ThemedText>
          )}

          {isActive ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)} key={`desc-${index}-${currentIndex}`}>
              <ThemedText
                type="body"
                style={[styles.stepDescription, { color: item.textColor }]}
              >
                {item.description}
              </ThemedText>
            </Animated.View>
          ) : (
            <ThemedText
              type="body"
              style={[styles.stepDescription, { color: item.textColor }]}
            >
              {item.description}
            </ThemedText>
          )}

          {item.isFinal ? (
            <View style={[styles.linksContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
              <Pressable
                onPress={handleTermsPress}
                style={({ pressed }) => [
                  styles.linkButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="file-text" size={16} color={item.textColor} />
                <ThemedText
                  type="small"
                  style={[styles.linkText, { color: item.textColor }]}
                >
                  Terms of Service
                </ThemedText>
              </Pressable>

              <View style={[styles.linkDivider, { backgroundColor: `${item.textColor}40` }]} />

              <Pressable
                onPress={handlePrivacyPress}
                style={({ pressed }) => [
                  styles.linkButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="lock" size={16} color={item.textColor} />
                <ThemedText
                  type="small"
                  style={[styles.linkText, { color: item.textColor }]}
                >
                  Privacy Policy
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        bounces={false}
      />

      <Animated.View
        entering={FadeIn.delay(300).duration(500)}
        style={[
          styles.buttonContainer,
          {
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Button
          onPress={currentStep.isFinal ? handleAccept : handleNext}
          style={[
            styles.button,
            {
              backgroundColor: currentStep.textColor,
            },
          ]}
        >
          {currentStep.isFinal ? "Let's Talk!" : "Next"}
        </Button>
      </Animated.View>

      <Modal
        visible={showTerms}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTerms(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <Pressable
              onPress={() => setShowTerms(false)}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="h3">Terms of Service</ThemedText>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
            showsVerticalScrollIndicator={false}
          >
            <TermsContent theme={theme} />
          </ScrollView>
        </ThemedView>
      </Modal>

      <Modal
        visible={showPrivacy}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacy(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <Pressable
              onPress={() => setShowPrivacy(false)}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="h3">Privacy Policy</ThemedText>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
            showsVerticalScrollIndicator={false}
          >
            <PrivacyContent theme={theme} />
          </ScrollView>
        </ThemedView>
      </Modal>
    </View>
  );
}

function TermsContent({ theme }: { theme: any }) {
  return (
    <>
      <ThemedText type="caption" style={[styles.legalLastUpdated, { color: theme.textSecondary }]}>
        Last Updated: January 21, 2026
      </ThemedText>

      <View style={[styles.legalHighlightBox, { backgroundColor: `${theme.primary}20` }]}>
        <ThemedText type="body" style={{ color: theme.text }}>
          <ThemedText style={{ fontWeight: "700" }}>Welcome to EmoCall!</ThemedText> By using our app, you agree to these terms. EmoCall provides anonymous voice connections for emotional support - no profiles, no judgment, just talk.
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.legalSectionTitle}>1. Acceptance of Terms</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        By accessing or using EmoCall, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the app.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>2. Age Requirement</ThemedText>
      <View style={[styles.legalWarningBox, { backgroundColor: `${theme.error}20` }]}>
        <ThemedText type="body" style={{ color: theme.text }}>
          <ThemedText style={{ fontWeight: "700" }}>You must be at least 18 years old to use EmoCall.</ThemedText> By using this app, you confirm that you are 18 or older.
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.legalSectionTitle}>3. User Conduct</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        You agree NOT to: harass or abuse other users, share explicit content without consent, discriminate against others, record conversations, or use the service for commercial purposes.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>4. Time Bank and Payments</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        All purchases are final. Minutes purchased for your Time Bank are non-refundable except as required by law.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>5. Disclaimer</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text, fontWeight: "600" }]}>
        EmoCall is not a substitute for professional mental health support. If you are experiencing a crisis, please contact a professional helpline.
      </ThemedText>

      <View style={[styles.legalFooter, { borderTopColor: theme.border }]}>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
          EmoCall - Anonymous Voice Calling for Emotional Relief
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
          A product of Harmonian Software (M) Sdn Bhd
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
          Registered in Malaysia
        </ThemedText>
      </View>
    </>
  );
}

function PrivacyContent({ theme }: { theme: any }) {
  return (
    <>
      <ThemedText type="caption" style={[styles.legalLastUpdated, { color: theme.textSecondary }]}>
        Last Updated: January 21, 2026
      </ThemedText>

      <View style={[styles.legalHighlightBox, { backgroundColor: `${theme.primary}20` }]}>
        <ThemedText type="body" style={{ color: theme.text }}>
          <ThemedText style={{ fontWeight: "700" }}>Our Promise:</ThemedText> EmoCall is built on privacy. We don't know your name, we don't ask for your email, and we don't record your calls.
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.legalSectionTitle}>1. Information We Collect</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        We collect only: a random device identifier, session data (time bank minutes, aura points), and basic usage statistics. We do NOT store payment details.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>2. Information We Do NOT Collect</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        We do not collect your name, email, phone number, location, voice recordings, conversation contents, contacts, or social media profiles.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>3. Voice Calls</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text, fontWeight: "600" }]}>
        We do not record, store, or monitor your voice calls. Calls are peer-to-peer connections.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>4. Your Rights</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.text }]}>
        You have the right to request access to your data, request deletion, opt out of analytics, and withdraw consent at any time.
      </ThemedText>

      <ThemedText type="h4" style={styles.legalSectionTitle}>5. Contact Us</ThemedText>
      <ThemedText type="body" style={[styles.legalParagraph, { color: theme.primary, fontWeight: "600" }]}>
        privacy@emocall.app
      </ThemedText>

      <View style={[styles.legalFooter, { borderTopColor: theme.border }]}>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
          EmoCall - Anonymous Voice Calling for Emotional Relief
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
          A product of Harmonian Software (M) Sdn Bhd
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
          Registered in Malaysia
        </ThemedText>
      </View>
    </>
  );
}

const IMAGE_SECTION_HEIGHT = SCREEN_HEIGHT * 0.65;
const TEXT_SECTION_HEIGHT = SCREEN_HEIGHT * 0.35;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageSection: {
    height: IMAGE_SECTION_HEIGHT,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  stepImage: {
    width: "100%",
    height: "100%",
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  textSection: {
    height: TEXT_SECTION_HEIGHT,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 38,
  },
  stepDescription: {
    textAlign: "center",
    lineHeight: 24,
  },
  linksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  linkText: {
    fontWeight: "500",
  },
  linkDivider: {
    width: 1,
    height: 16,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  button: {
    width: "100%",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPlaceholder: {
    width: 40,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  legalLastUpdated: {
    marginBottom: Spacing.lg,
  },
  legalHighlightBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  legalWarningBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  legalSectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  legalParagraph: {
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  legalFooter: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
});
