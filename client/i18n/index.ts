import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en";
import zh from "./locales/zh";
import zhTW from "./locales/zh-TW";
import hi from "./locales/hi";
import es from "./locales/es";
import fr from "./locales/fr";
import ar from "./locales/ar";
import bn from "./locales/bn";
import pt from "./locales/pt";
import ru from "./locales/ru";
import id from "./locales/id";
import de from "./locales/de";
import ja from "./locales/ja";
import ms from "./locales/ms";
import vi from "./locales/vi";
import it from "./locales/it";
import ko from "./locales/ko";
import tr from "./locales/tr";
import ta from "./locales/ta";
import th from "./locales/th";
import fa from "./locales/fa";
import pl from "./locales/pl";
import uk from "./locales/uk";
import nl from "./locales/nl";
import el from "./locales/el";
import cs from "./locales/cs";
import sv from "./locales/sv";
import hu from "./locales/hu";
import ro from "./locales/ro";
import he from "./locales/he";
import tl from "./locales/tl";
import sw from "./locales/sw";
import da from "./locales/da";
import fi from "./locales/fi";
import no from "./locales/no";
import sk from "./locales/sk";
import hr from "./locales/hr";
import bg from "./locales/bg";
import sr from "./locales/sr";
import sl from "./locales/sl";
import lt from "./locales/lt";
import lv from "./locales/lv";
import et from "./locales/et";
import ca from "./locales/ca";
import ur from "./locales/ur";
import mr from "./locales/mr";
import te from "./locales/te";
import kn from "./locales/kn";
import gu from "./locales/gu";
import pa from "./locales/pa";

export const STORAGE_KEY = "@emocall_language";
export const LANGUAGE_SELECTED_KEY = "@emocall_language_selected";

export const i18n = new I18n({
  en,
  zh,
  "zh-TW": zhTW,
  hi,
  es,
  fr,
  ar,
  bn,
  pt,
  ru,
  id,
  de,
  ja,
  ms,
  vi,
  it,
  ko,
  tr,
  ta,
  th,
  fa,
  pl,
  uk,
  nl,
  el,
  cs,
  sv,
  hu,
  ro,
  he,
  tl,
  sw,
  da,
  fi,
  no,
  sk,
  hr,
  bg,
  sr,
  sl,
  lt,
  lv,
  et,
  ca,
  ur,
  mr,
  te,
  kn,
  gu,
  pa,
});

i18n.enableFallback = true;
i18n.defaultLocale = "en";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "fa", name: "Persian", nativeName: "فارسی", rtl: true },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "he", name: "Hebrew", nativeName: "עברית", rtl: true },
  { code: "tl", name: "Filipino", nativeName: "Filipino" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "et", name: "Estonian", nativeName: "Eesti" },
  { code: "ca", name: "Catalan", nativeName: "Català" },
  { code: "ur", name: "Urdu", nativeName: "اردو", rtl: true },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
];

export async function getStoredLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setStoredLanguage(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    console.error("Failed to store language preference");
  }
}

export function getDeviceLanguage(): string {
  const locale = Localization.getLocales()[0];
  if (!locale) return "en";
  
  const languageCode = locale.languageCode || "en";
  const fullCode = locale.languageTag || languageCode;
  
  if (SUPPORTED_LANGUAGES.some(l => l.code === fullCode)) {
    return fullCode;
  }
  
  if (SUPPORTED_LANGUAGES.some(l => l.code === languageCode)) {
    return languageCode;
  }
  
  return "en";
}

export function t(key: string, options?: object): string {
  return i18n.t(key, options);
}

// Check if user has completed first-time language selection
export async function hasCompletedLanguageSelection(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

// Mark language selection as complete
export async function markLanguageSelectionComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, "true");
  } catch {
    console.error("Failed to mark language selection complete");
  }
}
