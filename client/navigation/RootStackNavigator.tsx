import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useSession } from "@/contexts/SessionContext";
import { useTheme } from "@/hooks/useTheme";

import TermsGateScreen from "@/screens/TermsGateScreen";
import MoodSelectionScreen from "@/screens/MoodSelectionScreen";
import ActiveCallScreen from "@/screens/ActiveCallScreen";
import CallEndedScreen from "@/screens/CallEndedScreen";
import VibeCheckScreen from "@/screens/VibeCheckScreen";
import SettingsScreen from "@/screens/SettingsScreen";
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
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  DataCollection: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { session, isLoading, hasAcceptedTerms, acceptTerms } = useSession();
  const { theme } = useTheme();

  if (isLoading || !session) {
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
});
