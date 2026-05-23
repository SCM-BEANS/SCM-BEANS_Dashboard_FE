"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";
import { Bell, UserCircle, Menu } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";

export const Header = () => {
  const { startCycle, toggleMobileMenu } = useIoTStore();
  const { t } = useI18nStore();

  return (
    <header className="w-full bg-transparent flex justify-between items-center h-16 px-4 md:px-6 z-30">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-on-surface hover:text-primary transition-colors"
          onClick={toggleMobileMenu}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <LanguageToggle />
        <button
          onClick={startCycle}
          className="bg-primary text-on-primary font-mono text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 uppercase font-semibold hover:bg-primary-container transition-colors"
        >
          {t("start_cycle")}
        </button>
        <button className="text-on-surface hover:text-primary transition-colors">
          <Bell className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <button className="text-on-surface hover:text-primary transition-colors">
          <UserCircle className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>
    </header>
  );
};
