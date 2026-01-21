import React, { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

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

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  const handleAcceptTerms = () => {
    setHasAcceptedTerms(true);
  };

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
