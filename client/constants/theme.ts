import { Platform } from "react-native";

// Only Rainbow theme - warm and vibrant for emotional support
export type AppTheme = "rainbow";

export const AppThemes = {
  rainbow: {
    light: {
      text: "#1A1A2E",
      textSecondary: "#4A4A6A",
      textDisabled: "#9999AA",
      buttonText: "#FFFFFF",
      tabIconDefault: "#9999AA",
      tabIconSelected: "#FF3366",
      link: "#3366FF",
      primary: "#FF3366",
      primaryTint: "#FF5588",
      secondary: "#33CC99",
      accent1: "#FFCC00",
      accent2: "#3366FF",
      success: "#33CC99",
      warning: "#FFCC00",
      error: "#FF3366",
      backgroundRoot: "#FFFFFF",
      backgroundDefault: "#FFFFFF",
      backgroundSecondary: "#F5F5FF",
      backgroundTertiary: "#EEEEFF",
      surface: "#FFFFFF",
      border: "#DDDDEE",
      vent: "#FF3366",
      listen: "#33CC99",
      ventGradient: ["#FF3366", "#FF6699"] as [string, string],
      listenGradient: ["#33CC99", "#66DDBB"] as [string, string],
      avatarYou: "#FF6600",
      avatarThem: "#3366FF",
    },
    dark: {
      text: "#FFFFFF",
      textSecondary: "#CCCCDD",
      textDisabled: "#777788",
      buttonText: "#1A1A2E",
      tabIconDefault: "#777788",
      tabIconSelected: "#FF5588",
      link: "#66AAFF",
      primary: "#FF5588",
      primaryTint: "#FF77AA",
      secondary: "#55DDAA",
      accent1: "#FFDD33",
      accent2: "#66AAFF",
      success: "#55DDAA",
      warning: "#FFDD33",
      error: "#FF5588",
      backgroundRoot: "#1A1A2E",
      backgroundDefault: "#252540",
      backgroundSecondary: "#2A2A50",
      backgroundTertiary: "#353560",
      surface: "#252540",
      border: "#404070",
      vent: "#FF5588",
      listen: "#55DDAA",
      ventGradient: ["#FF5588", "#FF77AA"] as [string, string],
      listenGradient: ["#55DDAA", "#77EECC"] as [string, string],
      avatarYou: "#FF8833",
      avatarThem: "#66AAFF",
    },
  },
};

export const Colors = AppThemes.rainbow;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

// Quicksand - soft, rounded, friendly font perfect for emotional support apps
export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    fontFamily: "Quicksand_700Bold",
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
    fontFamily: "Quicksand_700Bold",
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
    fontFamily: "Quicksand_600SemiBold",
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
    fontFamily: "Quicksand_600SemiBold",
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: "Quicksand_400Regular",
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: "Quicksand_400Regular",
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    fontFamily: "Quicksand_400Regular",
  },
  button: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600" as const,
    fontFamily: "Quicksand_600SemiBold",
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: "Quicksand_400Regular",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Quicksand_400Regular",
    serif: "ui-serif",
    rounded: "Quicksand_400Regular",
    mono: "ui-monospace",
  },
  default: {
    sans: "Quicksand_400Regular",
    serif: "serif",
    rounded: "Quicksand_400Regular",
    mono: "monospace",
  },
  web: {
    sans: "Quicksand, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "Quicksand, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
