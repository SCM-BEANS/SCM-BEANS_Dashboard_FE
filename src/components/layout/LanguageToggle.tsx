"use client";

import { useI18nStore } from "@/store/useI18nStore";

export const LanguageToggle = () => {
  const { language, setLanguage } = useI18nStore();

  return (
    <div className="flex items-center gap-1 bg-surface-container border-2 border-outline px-1 py-1 rounded-sm">
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 text-xs font-mono font-bold uppercase transition-colors ${
          language === "en"
            ? "bg-primary text-on-primary"
            : "text-on-surface-variant hover:text-primary"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("vi")}
        className={`px-2 py-1 text-xs font-mono font-bold uppercase transition-colors ${
          language === "vi"
            ? "bg-primary text-on-primary"
            : "text-on-surface-variant hover:text-primary"
        }`}
      >
        VI
      </button>
    </div>
  );
};
