import {
  Activity,
  BarChart3,
  Bell,
  Coffee,
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Users,
  Utensils,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/router";
import { Sidebar, type SidebarItem } from "@/components/sidebar/sidebar";
import { getActiveNavigationItem } from "@/components/sidebar/navigation-route";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_ENABLED_PATHS, ADMIN_NAVIGATION_LINKS } from "@/routes/routes";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";

const NAV_ICONS = {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Package,
  Receipt,
  Settings,
  Wrench,
  Activity,
  Utensils,
  BarChart3,
  Bell,
  Coffee,
} as const;

type NavigationItem = (typeof ADMIN_NAVIGATION_LINKS)[number];
const ADMIN_ROUTE_ITEMS = ADMIN_NAVIGATION_LINKS.map((item) => ({
  href: item.HREF,
  enabled: ADMIN_ENABLED_PATHS.has(item.HREF),
}));

export const ADMIN_SIDEBAR_ITEMS: SidebarItem[] = ADMIN_NAVIGATION_LINKS
  .map((item) => ({
    label: item.LABEL,
    href: item.HREF,
    icon: NAV_ICONS[item.ICON],
    enabled: ADMIN_ENABLED_PATHS.has(item.HREF),
  }));

export function getCurrentAdminSection(pathname: string): NavigationItem {
  const activeItem = getActiveNavigationItem(ADMIN_ROUTE_ITEMS, pathname, PATH_ADMIN.ROOT);
  return ADMIN_NAVIGATION_LINKS.find((item) => item.HREF === activeItem?.href) ?? ADMIN_NAVIGATION_LINKS[0];
}

export function AdminSidebarMenu({ loggingOut, onLogout }: { loggingOut: boolean; onLogout: () => void | Promise<void> }) {
  const router = useRouter();

  return (
    <Sidebar
      brand={ADMIN_MESSAGES.BRAND}
      brandHref={PATH_ADMIN.ROOT}
      roleLabel={ADMIN_MESSAGES.ROLE}
      pathname={router.asPath || router.pathname}
      rootHref={PATH_ADMIN.ROOT}
      navigationLabel={"\u0110i\u1ec1u h\u01b0\u1edbng Admin"}
      items={ADMIN_SIDEBAR_ITEMS}
      logout={{
        label: ADMIN_MESSAGES.AUTH.LOGOUT,
        pendingLabel: ADMIN_MESSAGES.AUTH.LOGGING_OUT,
        pending: loggingOut,
        onLogout,
      }}
    />
  );
}
