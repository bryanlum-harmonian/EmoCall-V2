import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppTheme, AppThemes } from "@/constants/theme";

type ColorScheme = "light" | "dark";

interface ThemeContextType {
  colorScheme: ColorScheme;
  appTheme: AppTheme;
  setColorScheme: (scheme: ColorScheme) => void;
  setAppTheme: (theme: AppTheme) => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const COLOR_SCHEME_KEY = "@emocall/color_scheme";
const APP_THEME_KEY = "@emocall/app_theme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");
  const [appTheme, setAppThemeState] = useState<AppTheme>("rainbow");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadStoredPreferences();
  }, []);

  const loadStoredPreferences = async () => {
    try {
      const storedColorScheme = await AsyncStorage.getItem(COLOR_SCHEME_KEY);

      if (storedColorScheme === "dark" || storedColorScheme === "light") {
        setColorSchemeState(storedColorScheme);
      }
      // Only Rainbow theme is available now - always use rainbow
      setAppThemeState("rainbow");
    } catch (error) {
      console.error("Failed to load theme preferences:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
      setColorSchemeState(scheme);
    } catch (error) {
      console.error("Failed to save color scheme:", error);
    }
  };

  // Only Rainbow theme is supported now
  const setAppTheme = async (_theme: AppTheme) => {
    // Always use rainbow theme
    setAppThemeState("rainbow");
  };

  const toggleColorScheme = () => {
    const newScheme = colorScheme === "light" ? "dark" : "light";
    setColorScheme(newScheme);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        appTheme,
        setColorScheme,
        setAppTheme,
        toggleColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

export function getThemeColors(appTheme: AppTheme, colorScheme: ColorScheme) {
  return AppThemes[appTheme][colorScheme];
}
