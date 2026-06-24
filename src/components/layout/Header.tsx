"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";
import { Bell, CircleUser, Menu, LogOut, Settings, User, Lock } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

export const Header = () => {
  const { startCycle, toggleMobileMenu } = useIoTStore();
  const { t } = useI18nStore();
  const router = useRouter();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Function to check auth state
    const checkAuth = () => {
      // access_token is HttpOnly in the future? No, access_token is set via JS. refresh_token is HttpOnly.
      // We can also just check if localStorage has 'email' as a proxy for logged in state
      const token = document.cookie.split('; ').find(row => row.startsWith('access_token='));
      const storedEmail = localStorage.getItem('email');
      
      if (token || storedEmail) {
        setIsLoggedIn(true);
        if (storedEmail) setEmail(storedEmail);
      } else {
        setIsLoggedIn(false);
      }
    };

    // Check on mount
    checkAuth();
    
    // Listen for storage changes if they happen in other tabs (optional but good practice)
    window.addEventListener('storage', checkAuth);
    window.addEventListener('auth-change', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    authService.logout();
    localStorage.removeItem("email");
    window.dispatchEvent(new CustomEvent('auth-change'));
    setIsLoggedIn(false);
    setIsDropdownOpen(false);
    router.push('/login');
  };

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
        
        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            className="text-on-surface hover:text-primary transition-colors flex items-center"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <CircleUser className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-outline rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-outline">
                <p className="text-sm font-semibold text-on-surface truncate">{isLoggedIn ? (email || "User") : "Guest User"}</p>
                <p className="text-xs text-on-surface-variant truncate">{isLoggedIn ? "Authorized" : "Not Logged In"}</p>
              </div>
              <div className="py-1">
                <Link href="/users" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                  <User className="w-4 h-4" />
                  <span>Users List</span>
                </Link>
                <Link href="/settings" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
                {isLoggedIn && (
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsChangePasswordOpen(true);
                    }} 
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Change Password</span>
                  </button>
                )}
              </div>
              <div className="border-t border-outline py-1">
                {isLoggedIn ? (
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <Link 
                    href="/login"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
                  >
                    <CircleUser className="w-4 h-4" />
                    <span>Login to account</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
    </header>
  );
};
