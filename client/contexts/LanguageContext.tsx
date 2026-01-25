import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { I18nManager } from "react-native";
import { 
  i18n, 
  SUPPORTED_LANGUAGES, 
  getStoredLanguage, 
  setStoredLanguage, 
  getDeviceLanguage,
  LanguageOption,
} from "@/i18n";

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, options?: object) => string;
  isRTL: boolean;
  languages: LanguageOption[];
  getCurrentLanguageInfo: () => LanguageOption | undefined;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    const initializeLanguage = async () => {
      const storedLanguage = await getStoredLanguage();
      const language = storedLanguage || getDeviceLanguage();
      
      i18n.locale = language;
      setCurrentLanguage(language);
      
      const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language);
      const rtl = languageInfo?.rtl || false;
      setIsRTL(rtl);
      
      setIsInitialized(true);
    };
    
    initializeLanguage();
  }, []);

  const setLanguage = async (code: string) => {
    const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (!languageInfo) return;
    
    i18n.locale = code;
    setCurrentLanguage(code);
    await setStoredLanguage(code);
    
    const rtl = languageInfo.rtl || false;
    setIsRTL(rtl);
    
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  };

  const t = (key: string, options?: object): string => {
    return i18n.t(key, options);
  };

  const getCurrentLanguageInfo = () => {
    return SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage);
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t,
        isRTL,
        languages: SUPPORTED_LANGUAGES,
        getCurrentLanguageInfo,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, currentLanguage, isRTL } = useLanguage();
  return { t, locale: currentLanguage, isRTL };
}
