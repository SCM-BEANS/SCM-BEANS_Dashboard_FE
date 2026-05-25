"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";
import { Coffee, LayoutDashboard, Box, ThermometerSun, Settings, Wrench, HelpCircle, ChevronDown, X, Layers } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const { status, emergencyStop, isMobileMenuOpen, toggleMobileMenu } = useIoTStore();
  const { t } = useI18nStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: t("nav_overview"), href: "/", icon: LayoutDashboard },
    { name: t("nav_inventory"), href: "/inventory", icon: Box },
    { name: t("nav_thermodynamics"), href: "/thermodynamics", icon: ThermometerSun },
    { name: t("nav_diagnostic"), href: "#", icon: Wrench },
    { name: t("nav_calibration"), href: "#", icon: Settings },
    { name: t("nav_logs"), href: "#", icon: HelpCircle },
    { name: t("nav_model"), href: "/model", icon: Layers },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full flex flex-col w-64 border-r-2 border-outline bg-surface z-50 transition-transform duration-300 ease-in-out md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b-2 border-outline relative">
          <div
            className="group cursor-pointer relative"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold uppercase tracking-tighter text-primary">{status.id}</h2>
                  <ChevronDown className={`w-5 h-5 text-primary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status.status === 'Online' ? 'bg-tertiary' : 'bg-error'}`}></div>
                  <p className="font-mono text-xs text-on-surface-variant uppercase">{t("system_status")} {status.status === 'Online' ? t('online') : t('offline')}</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-primary text-on-primary flex items-center justify-center rounded-sm">
                <Coffee className="w-6 h-6" />
              </div>
            </div>

            {dropdownOpen && (
              <div className="absolute left-0 top-full w-full mt-4 bg-surface border-2 border-primary z-[60] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="flex flex-col">
                  <div className="p-3 border-b border-primary bg-surface-container flex justify-between items-center">
                    <div>
                      <div className="font-bold font-mono text-sm uppercase">DEER_01</div>
                      <div className="text-[10px] uppercase text-on-surface-variant">{t("brewing")}</div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="p-3 border-b border-outline hover:bg-surface-container transition-colors flex justify-between items-center">
                    <div>
                      <div className="font-bold font-mono text-sm uppercase">BEAVER_05</div>
                      <div className="text-[10px] uppercase text-on-surface-variant">{t("ready")}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            className="absolute top-2 right-2 md:hidden p-1 text-on-surface-variant hover:text-primary"
            onClick={toggleMobileMenu}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => { if (isMobileMenuOpen) toggleMobileMenu() }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  isActive ? "bg-primary text-on-primary font-bold" : "text-on-surface hover:bg-surface-container"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "" : "text-primary")} />
                <span className="font-mono text-sm uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t-2 border-outline">
          <button
            onClick={emergencyStop}
            className="w-full border-2 border-error text-error font-mono text-sm py-2 uppercase font-bold hover:bg-error hover:text-on-error transition-colors"
          >
            {t("emergency_stop")}
          </button>
        </div>
        <div className="flex border-t-2 border-outline">
          <a className="flex-1 flex flex-col items-center justify-center py-3 border-r-2 border-outline hover:bg-surface-container transition-colors" href="#">
            <Wrench className="w-5 h-5 text-on-surface-variant" />
            <span className="font-mono text-xs mt-1 uppercase text-on-surface-variant">{t("maintenance")}</span>
          </a>
          <a className="flex-1 flex flex-col items-center justify-center py-3 hover:bg-surface-container transition-colors" href="#">
            <HelpCircle className="w-5 h-5 text-on-surface-variant" />
            <span className="font-mono text-xs mt-1 uppercase text-on-surface-variant">{t("help")}</span>
          </a>
        </div>
      </aside>
    </>
  );
};
