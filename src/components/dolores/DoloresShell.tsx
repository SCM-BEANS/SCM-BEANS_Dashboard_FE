"use client";

import { DoloresIconView, type DoloresIcon } from "@/components/dolores/DoloresUI";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import styles from "./DoloresShell.module.css";
import { desktopSurfaceTitles } from "./desktopSurfaces";
import { DoloresDialog } from "./DoloresDialog";

export type DoloresRole = "admin" | "moderator" | "technician" | "customer";
type NavItem = { label: string; href: string; icon: DoloresIcon };

const ROLE_NAV: Record<DoloresRole, NavItem[]> = {
  admin: [
    { label: "Tổng quan", href: "/admin", icon: "layout-dashboard" },
    { label: "Tài khoản", href: "/admin/users", icon: "users" },
    { label: "Khách hàng", href: "/admin/businesses", icon: "store" },
    { label: "Cửa hàng", href: "/admin/stores", icon: "layout-dashboard" },
    { label: "Hợp đồng", href: "/admin/contracts", icon: "file-text" },
    { label: "Máy & tồn kho", href: "/admin/machines", icon: "package" },
    { label: "Giám sát Smart IoT", href: "/admin/iot", icon: "activity" },
    { label: "Menu & công thức", href: "/admin/menu", icon: "utensils" },
    { label: "Báo cáo vận hành", href: "/admin/reports", icon: "chart-column" },
    { label: "Thông báo", href: "/admin/notifications", icon: "bell" },
  ],
  moderator: [
    { label: "Tổng quan", href: "/moderator", icon: "layout-dashboard" },
    { label: "Hợp đồng", href: "/moderator/contracts", icon: "file-text" },
    { label: "Tài khoản khách", href: "/moderator/customers", icon: "users" },
    { label: "Hóa đơn", href: "/moderator/invoices", icon: "file-text" },
    { label: "Máy & tồn kho", href: "/moderator/machines", icon: "coffee" },
    { label: "Giám sát Smart IoT", href: "/moderator/iot", icon: "activity" },
    { label: "Menu & công thức", href: "/moderator/menu", icon: "utensils" },
    { label: "Yêu cầu kỹ thuật", href: "/moderator/technical-requests", icon: "wrench" },
    { label: "Lịch sử máy", href: "/moderator/machine-history", icon: "clipboard-check" },
    { label: "Thu mua máy cũ", href: "/moderator/buyback", icon: "package" },
    { label: "Thông báo", href: "/moderator/notifications", icon: "bell" },
  ],
  technician: [
    { label: "Việc được giao", href: "/technician/tasks", icon: "clipboard-check" },
    { label: "Lịch sử máy", href: "/technician/history", icon: "coffee" },
    { label: "Thông báo", href: "/technician/notifications", icon: "bell" },
  ],
  customer: [
    { label: "Tổng quan", href: "/dashboard", icon: "layout-dashboard" },
    { label: "Hợp đồng", href: "/dashboard/contracts", icon: "file-text" },
    { label: "Máy của tôi", href: "/dashboard/machines", icon: "coffee" },
    { label: "Menu của tôi", href: "/dashboard/menu", icon: "utensils" },
    { label: "Hóa đơn", href: "/dashboard/invoices", icon: "file-text" },
    { label: "Yêu cầu hỗ trợ", href: "/dashboard/support", icon: "wrench" },
    { label: "Thu mua máy cũ", href: "/dashboard/buyback", icon: "package" },
    { label: "Thông báo", href: "/dashboard/notifications", icon: "bell" },
  ],
};

const ROLE_LABEL: Record<DoloresRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  technician: "Technician",
  customer: "Khách hàng",
};

const MOBILE_NAV: Record<DoloresRole, { label: string; href: string; exact?: boolean }[]> = {
  admin: [
    { label: "Tổng quan", href: "/admin", exact: true },
    { label: "Khách hàng", href: "/admin/businesses" },
    { label: "Máy", href: "/admin/machines" },
  ],
  moderator: [
    { label: "Tổng quan", href: "/moderator", exact: true },
    { label: "Hợp đồng", href: "/moderator/contracts" },
    { label: "Giám sát", href: "/moderator/iot" },
  ],
  technician: [
    { label: "Công việc", href: "/technician/tasks" },
    { label: "Lịch sử", href: "/technician/history" },
    { label: "Thông báo", href: "/technician/notifications", exact: true },
  ],
  customer: [
    { label: "Tổng quan", href: "/dashboard", exact: true },
    { label: "Máy", href: "/dashboard/machines" },
    { label: "Hóa đơn", href: "/dashboard/invoices" },
  ],
};

export function DoloresShell({ role, children }: { role: DoloresRole; children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = ROLE_NAV[role];
  const selectionPath = role === "customer" && pathname === "/dashboard/support/menu"
    ? "/dashboard/menu"
    : pathname;
  const mobileSelectionPath = role === "customer" && pathname === "/dashboard/support/menu"
    ? "/dashboard/menu"
    : pathname;
  const selectedItem =
    nav.find((item) => item.href === selectionPath) ??
    nav.filter((item) => item.href !== nav[0]?.href && selectionPath.startsWith(item.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const selectedLabel = selectedItem?.label ?? nav[0]?.label ?? "Tổng quan";
  const breadcrumb = role === "moderator" && pathname === "/moderator/iot/machines" ? "Nguyễn Minh Anh  /  S-018" : selectedLabel;
  const notificationsHref = nav.find((item) => item.label === "Thông báo")?.href ?? nav[0]?.href ?? "/";
  const mobileItems = MOBILE_NAV[role];

  return (
    <div className={`${styles.shell} flex h-screen min-h-[640px] min-w-[1024px] overflow-hidden bg-white text-[#302927]`} data-role={role}>
      <aside className={`${styles.sidebar} flex h-screen w-[240px] shrink-0 flex-col gap-1 border border-[#E9E2DC] bg-white px-3 pb-5 pt-6`}>
        <Link className="text-[28px] font-semibold leading-[41px] text-[#B81724]" href={nav[0]?.href ?? "/"}>
          dolores.
        </Link>
        <p className="text-[13px] leading-[19px] text-[#706561]">{ROLE_LABEL[role]}</p>
        <div className="h-5 shrink-0" />
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label={"Điều hướng " + ROLE_LABEL[role]}>
          {nav.map((item) => {
            const isCurrent = selectedItem?.href === item.href;
            return (
              <Link
                className="flex h-12 shrink-0 items-center gap-1 rounded-[10px]"
                href={item.href}
                key={item.href}
                aria-current={isCurrent ? "page" : undefined}
              >
                <DoloresIconView icon={item.icon} />
                <span className={"flex h-12 w-[188px] shrink-0 items-center rounded-[10px] px-4 py-3 text-sm font-medium leading-[17px] " + (isCurrent ? "bg-[#F9E9EA] text-[#B81724]" : "text-[#706561] hover:bg-[#F7F5F3]")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 pt-4 text-xs leading-[17px] text-[#706561]">
          <p className="text-xs leading-[17px] text-[#706561]">Không gian {ROLE_LABEL[role]}</p>

        </div>
      </aside>
      <div className={`${styles.workspace} flex h-screen min-w-0 flex-1 flex-col`}>
        <header className={styles.mobileHeader}>
          <Link className={styles.mobileBrand} href={nav[0]?.href ?? "/"}>dolores.</Link>
          <Link className={styles.mobileNotification} href={notificationsHref}>Thông báo</Link>
        </header>
        <header className={`${styles.desktopHeader} flex h-[72px] shrink-0 items-center gap-4 bg-white px-8`}>
          <p className="min-w-0 flex-1 text-sm leading-[1.45] text-[#706561]">
            {ROLE_LABEL[role]} &nbsp;/&nbsp; {breadcrumb}
          </p>
          <Link className="flex h-12 w-[124px] items-center justify-center rounded-[10px] border border-[#E9E2DC] bg-white px-4 py-3 text-sm font-medium text-[#302927] hover:bg-[#F7F5F3]" href={notificationsHref}>
            Thông báo
          </Link>
        </header>
        {children}
        <nav className={styles.mobileNav} aria-label={`Điều hướng chính ${ROLE_LABEL[role]}`}>
          {mobileItems.map((item) => {
            const selected = mobileSelectionPath === item.href;
            return <Link className={selected ? styles.mobileNavItemActive : styles.mobileNavItem} href={item.href} aria-current={selected ? "page" : undefined} key={item.href}>{item.label}</Link>;
          })}
          <button aria-expanded={mobileMenuOpen} aria-controls="dolores-mobile-menu" className={styles.mobileNavItem} onClick={() => setMobileMenuOpen(true)} type="button">Khác</button>
        </nav>
      </div>
      {mobileMenuOpen && <DoloresDialog className={styles.menuOverlay} id="dolores-mobile-menu" labelledBy="dolores-mobile-menu-title" onClose={() => setMobileMenuOpen(false)}>
        <div className={styles.menuHeading} id="dolores-mobile-menu-title">Điều hướng · {ROLE_LABEL[role]}</div>
        <nav aria-label={`Tất cả trang ${ROLE_LABEL[role]}`} className={styles.menuLinks}>
          {nav.map((item) => <Link aria-current={selectedItem?.href === item.href ? "page" : undefined} className={styles.menuLink} href={item.href} key={item.href} onClick={() => setMobileMenuOpen(false)}>{item.label}</Link>)}
        </nav>
        <div className={styles.menuCloseWrap}><button className={styles.menuClose} onClick={() => setMobileMenuOpen(false)} type="button">Đóng</button></div>
      </DoloresDialog>}
    </div>
  );
}

export function DoloresPage({
  title,
  mobileTitle,
  description,
  children,
  actions,
  mobileActions,
  showMobileActionsMenu = true,
  canvas,
}: {
  title: string;
  mobileTitle?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
  showMobileActionsMenu?: boolean;
  canvas?: boolean;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const pathname = usePathname();
  const role = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/moderator") ? "moderator" : pathname.startsWith("/technician") ? "technician" : "customer";
  const useCanvas = canvas ?? !desktopSurfaceTitles[role].includes(title);
  const resolvedMobileActions = mobileActions ?? actions;
  return (
    <>
      <main className={`${styles.pageMain} min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${useCanvas ? "bg-[#F8F6F3]" : "bg-white"}`}>
        <div className={`${styles.pageContent} flex min-h-full flex-col gap-5 px-8 pb-10 pt-7`}>
          <div className={styles.pageHeading}>
            <h1 className="text-[28px] font-semibold leading-[1.45] text-[#302927]">{mobileTitle ? <><span className={styles.desktopOnlyContent}>{title}</span><span className={styles.mobileOnlyContent}>{mobileTitle}</span></> : title}</h1>
            {description && <p className="text-[15px] leading-[1.45] text-[#706561]">{description}</p>}
          </div>
          {children}
        </div>
      </main>
      <footer className="flex h-20 shrink-0 items-start gap-3 overflow-x-auto bg-white px-8 py-4">
        {actions}
      </footer>
      {resolvedMobileActions && <div className={styles.mobileActionDock} data-has-menu={showMobileActionsMenu}>
        <div className={styles.mobilePrimaryAction}>{resolvedMobileActions}</div>
        {showMobileActionsMenu && <button aria-expanded={actionsOpen} aria-controls="dolores-mobile-actions" className={styles.mobileActionsButton} onClick={() => setActionsOpen(true)} type="button">Tác vụ</button>}
      </div>}
      {actionsOpen && showMobileActionsMenu && resolvedMobileActions && <DoloresDialog labelledBy="dolores-mobile-actions-title" className={styles.actionsOverlay} id="dolores-mobile-actions" onClose={() => setActionsOpen(false)}>
        <h2 className={styles.actionsSheetTitle} id="dolores-mobile-actions-title">Thao tác</h2>
        <div className={styles.actionsSheetItems} onClick={() => setActionsOpen(false)}>{resolvedMobileActions}</div>
        <div className={styles.menuCloseWrap}><button className={styles.actionsSheetClose} onClick={() => setActionsOpen(false)} type="button">Đóng</button></div>
      </DoloresDialog>}
    </>
  );
}
