import {
  Activity,
  Bell,
  Boxes,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Coffee,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  Settings2,
  Store,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  grid: LayoutDashboard,
  users: UsersRound,
  store: Store,
  shop: Store,
  file: FileText,
  box: Boxes,
  pulse: Activity,
  coffee: Coffee,
  chart: ChartNoAxesColumnIncreasing,
  bell: Bell,
  wrench: Wrench,
  history: History,
  package: Package,
  clipboard: ClipboardList,
  receipt: ReceiptText,
  menu: Menu,
  settings: Settings2,
};

export function AppIcon({ name, size = 17, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  const Icon = icons[name] ?? LayoutDashboard;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
