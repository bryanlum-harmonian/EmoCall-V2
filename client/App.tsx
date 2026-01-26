import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { AuraProvider } from "@/contexts/AuraContext";
import { MatchmakingProvider } from "@/contexts/MatchmakingContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/useColorScheme";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <NavigationContainer>
          <RootStackNavigator />
        </NavigationContainer>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        const fontLoadPromise = Font.loadAsync({
          "Nunito-Regular": require("./assets/fonts/Nunito-Regular.ttf"),
          "Nunito-SemiBold": require("./assets/fonts/Nunito-SemiBold.ttf"),
          "Nunito-Bold": require("./assets/fonts/Nunito-Bold.ttf"),
          Nunito_400Regular: require("./assets/fonts/Nunito-Regular.ttf"),
          Nunito_600SemiBold: require("./assets/fonts/Nunito-SemiBold.ttf"),
          Nunito_700Bold: require("./assets/fonts/Nunito-Bold.ttf"),
          Feather: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"),
        });

        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));

        await Promise.race([fontLoadPromise, timeoutPromise]);
      } catch (e) {
        console.warn("Font loading error (ignoring to allow app open):", e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8A80" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <LanguageProvider>
            <ThemeProvider>
              <SessionProvider>
                <CreditsProvider>
                  <AuraProvider>
                    <MatchmakingProvider>
                      <AppContent />
                    </MatchmakingProvider>
                  </AuraProvider>
                </CreditsProvider>
              </SessionProvider>
            </ThemeProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8E7",
  },
});
