import { Bell, FileText, MapPin, Receipt, Wrench } from "lucide-react";
import styles from "./notification-management.module.css";

export function NotificationTypeIcon({ label }: { label: string }) {
  const Icon = label === "Hợp đồng" ? FileText : label === "Sửa chữa" || label === "Bảo trì" ? Wrench : label === "Vị trí GPS" ? MapPin : label === "Hoàn tiền" ? Receipt : Bell;
  return <span className={styles.categoryIcon} data-category={label}><Icon size={22} aria-hidden="true" /></span>;
}
