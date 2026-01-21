import { AppThemes, AppTheme } from "@/constants/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { colorScheme, appTheme } = useThemeContext();
  const isDark = colorScheme === "dark";
  const theme = AppThemes[appTheme][colorScheme];

  return {
    theme,
    isDark,
    appTheme,
  };
}

export type Theme = typeof AppThemes.sunny.light;
