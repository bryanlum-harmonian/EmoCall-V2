import { useThemeContext } from "@/contexts/ThemeContext";

export function useColorScheme() {
  const { colorScheme } = useThemeContext();
  return colorScheme;
}
