import { create } from "zustand";
import { Language, translations, TranslationKey } from "@/lib/i18n/translations";

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useI18nStore = create<I18nState>()((set, get) => ({
  language: "en",
  setLanguage: (lang) => set({ language: lang }),
  t: (key) => {
    const lang = get().language;
    return translations[lang][key] || key;
  },
}));
