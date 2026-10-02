"use client";

import { DoloresIconView, type DoloresIcon } from "@/components/dolores/DoloresUI";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

export function DoloresShell({ role, children }: { role: DoloresRole; children: ReactNode }) {
  const pathname = usePathname();
  const nav = ROLE_NAV[role];
  const selectionPath = role === "customer" && pathname === "/dashboard/support/menu"
    ? "/dashboard/menu"
    : role === "admin" && pathname === "/admin/notifications" ? "/admin" : pathname;
  const selectedItem =
    nav.find((item) => item.href === selectionPath) ??
    nav.filter((item) => item.href !== nav[0]?.href && selectionPath.startsWith(item.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const selectedLabel = selectedItem?.label ?? nav[0]?.label ?? "Tổng quan";
  const notificationsHref = nav.find((item) => item.label === "Thông báo")?.href ?? nav[0]?.href ?? "/";

  return (
    <div className="flex h-screen min-h-[640px] min-w-[1024px] overflow-hidden bg-[#F8F6F3] text-[#302927]" style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}>
      <aside className="flex h-screen w-[240px] shrink-0 flex-col gap-1 border-r border-[#E9E2DC] bg-white px-3 pb-5 pt-6">
        <Link className="text-[28px] font-semibold leading-[1.45] text-[#B81724]" href={nav[0]?.href ?? "/"}>
          dolores.
        </Link>
        <p className="text-[13px] leading-[1.45] text-[#706561]">{ROLE_LABEL[role]}</p>
        <div className="h-5 shrink-0" />
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label={"Điều hướng " + ROLE_LABEL[role]}>
          {nav.map((item) => {
            const isCurrent = selectionPath === item.href;
            const isPinned = role === "admin" && item.label === "Cửa hàng";
            const isActive = isCurrent || isPinned;
            return (
              <Link
                className="flex h-12 shrink-0 items-center gap-1 rounded-[10px] px-1"
                href={item.href}
                key={item.href}
                aria-current={isCurrent ? "page" : undefined}
              >
                <DoloresIconView icon={item.icon} />
                <span className={"flex h-12 min-w-0 flex-1 items-center rounded-[10px] px-4 py-3 text-sm " + (isActive ? "bg-[#F9E9EA] text-[#B81724]" : "text-[#706561] hover:bg-[#F7F5F3]")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 text-xs leading-[1.45] text-[#706561]">
          <p>Không gian {ROLE_LABEL[role]}</p>
          <p>Dolores • Dữ liệu minh họa</p>
        </div>
      </aside>
      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center gap-4 bg-white px-8">
          <p className="min-w-0 flex-1 text-sm leading-[1.45] text-[#706561]">
            {ROLE_LABEL[role]} &nbsp;/&nbsp; {selectedLabel}
          </p>
          <Link className="flex h-12 items-center justify-center rounded-[10px] border border-[#E9E2DC] bg-white px-4 py-3 text-sm text-[#302927] hover:bg-[#F7F5F3]" href={notificationsHref}>
            Thông báo
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}

export function DoloresPage({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#F8F6F3]">
        <div className="flex min-h-full flex-col gap-5 px-8 pb-10 pt-7">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold leading-[1.45] text-[#302927]">{title}</h1>
            {description && <p className="text-[15px] leading-[1.45] text-[#706561]">{description}</p>}
          </div>
          {children}
        </div>
      </main>
      <footer className="flex h-20 shrink-0 items-center gap-4 overflow-x-auto bg-white px-8 py-4">
        {actions}
      </footer>
    </>
  );
}
