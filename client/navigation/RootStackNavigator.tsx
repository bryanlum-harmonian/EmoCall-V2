import React, { useState } from "react";
import { View, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useSession } from "@/contexts/SessionContext";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";

import TermsGateScreen from "@/screens/TermsGateScreen";
import MoodSelectionScreen from "@/screens/MoodSelectionScreen";
import ActiveCallScreen from "@/screens/ActiveCallScreen";
import CallEndedScreen from "@/screens/CallEndedScreen";
import VibeCheckScreen from "@/screens/VibeCheckScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import LanguageScreen from "@/screens/LanguageScreen";
import { PrivacyPolicyScreen } from "@/screens/PrivacyPolicyScreen";
import { TermsOfServiceScreen } from "@/screens/TermsOfServiceScreen";
import DataCollectionScreen from "@/screens/DataCollectionScreen";

export type RootStackParamList = {
  TermsGate: undefined;
  MoodSelection: undefined;
  ActiveCall: { 
    callId: string; 
    partnerId: string; 
    duration: number;
    startedAt?: string;
    isPreview?: boolean;
  };
  VibeCheck: { callDuration?: number; callId?: string };
  CallEnded: { reason: "timeout" | "ended" | "reported" | "disconnected" | "partner_ended" | "partner_left" | "max_duration"; callId?: string };
  Settings: undefined;
  Language: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  DataCollection: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { session, isLoading, hasAcceptedTerms, acceptTerms, error, refreshSession } = useSession();
  const { theme } = useTheme();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await refreshSession();
    setIsRetrying(false);
  };

  if (isLoading || !session) {
    if (error) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot, padding: 20 }]}>
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            Connection Error
          </ThemedText>
          <ThemedText style={[styles.errorDetail, { color: theme.textSecondary }]}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ThemedText style={styles.retryText}>Retry Connection</ThemedText>
            )}
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!hasAcceptedTerms) {
    return <TermsGateScreen onAccept={acceptTerms} />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MoodSelection"
        component={MoodSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ActiveCall"
        component={ActiveCallScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="VibeCheck"
        component={VibeCheckScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="CallEnded"
        component={CallEndedScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
          headerBackTitle: "Back",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{
          headerTitle: "Language",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="DataCollection"
        component={DataCollectionScreen}
        options={{
          headerTitle: "Data Collection",
          headerBackTitle: "Back",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDetail: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 180,
    alignItems: "center",
  },
  retryText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
  },
});
