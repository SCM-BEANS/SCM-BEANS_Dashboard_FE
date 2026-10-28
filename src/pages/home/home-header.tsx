import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HOME_NAVIGATION_LINKS } from "@/routes/routes";
import { PATH_AUTH } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";

const MOBILE_NAVIGATION_ID = "home-mobile-navigation";

export function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const desktopBreakpoint = window.matchMedia("(min-width: 1024px)");
    const closeWhenDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    const closeAndReturnFocus = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (menuRef.current?.contains(event.target) || menuButtonRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };

    desktopBreakpoint.addEventListener("change", closeWhenDesktop);
    window.addEventListener("keydown", closeAndReturnFocus);
    document.addEventListener("pointerdown", closeOnOutsidePointer);

    return () => {
      desktopBreakpoint.removeEventListener("change", closeWhenDesktop);
      window.removeEventListener("keydown", closeAndReturnFocus);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <BrandLogo
          priority
          ariaLabel={HOME_MESSAGES.BRAND.ARIA_LABEL}
        />

        <nav className="nav-links" aria-label={HOME_MESSAGES.NAVIGATION.DESKTOP_ARIA_LABEL}>
          {HOME_NAVIGATION_LINKS.map((item) => (
            <Link key={item.HREF} href={item.HREF}>
              {item.LABEL}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <Link href={PATH_AUTH.LOGIN} className="nav-login">
            {HOME_MESSAGES.NAVIGATION.LOGIN}
          </Link>
          <button
            id="home-mobile-menu-toggle"
            ref={menuButtonRef}
            type="button"
            className="mobile-toggle"
            aria-label={menuOpen ? HOME_MESSAGES.NAVIGATION.CLOSE_MENU : HOME_MESSAGES.NAVIGATION.OPEN_MENU}
            aria-controls={MOBILE_NAVIGATION_ID}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>

        <nav
          id={MOBILE_NAVIGATION_ID}
          ref={menuRef}
          className="mobile-menu"
          aria-label={HOME_MESSAGES.NAVIGATION.MOBILE_ARIA_LABEL}
          aria-hidden={!menuOpen}
          data-open={menuOpen}
        >
          {HOME_NAVIGATION_LINKS.map((item) => (
            <Link key={item.HREF} href={item.HREF} onClick={() => setMenuOpen(false)}>
              {item.LABEL}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
