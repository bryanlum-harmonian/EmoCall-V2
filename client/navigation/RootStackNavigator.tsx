import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useScreenOptions } from "@/hooks/useScreenOptions";

import TermsGateScreen from "@/screens/TermsGateScreen";
import MoodSelectionScreen from "@/screens/MoodSelectionScreen";
import BlindCardPickerScreen from "@/screens/BlindCardPickerScreen";
import ActiveCallScreen from "@/screens/ActiveCallScreen";
import CallEndedScreen from "@/screens/CallEndedScreen";
import SettingsScreen from "@/screens/SettingsScreen";

export type RootStackParamList = {
  TermsGate: undefined;
  MoodSelection: undefined;
  BlindCardPicker: { mood: "vent" | "listen" };
  ActiveCall: { mood: "vent" | "listen"; matchId: string };
  CallEnded: { reason: "timeout" | "ended" | "reported" | "disconnected" };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const TERMS_ACCEPTED_KEY = "@emocall/terms_accepted";

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);

  useEffect(() => {
    checkTermsAccepted();
  }, []);

  const checkTermsAccepted = async () => {
    try {
      const value = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
      setHasAcceptedTerms(value === "true");
    } catch (error) {
      setHasAcceptedTerms(false);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, "true");
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error("Failed to save terms acceptance:", error);
    }
  };

  if (hasAcceptedTerms === null) {
    return null;
  }

  if (!hasAcceptedTerms) {
    return <TermsGateScreen onAccept={handleAcceptTerms} />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MoodSelection"
        component={MoodSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BlindCardPicker"
        component={BlindCardPickerScreen}
        options={{
          headerTitle: "10 Daily Cards",
          headerBackTitle: "Back",
        }}
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
    </Stack.Navigator>
  );
}
