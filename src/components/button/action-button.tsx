import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./action-button.module.css";

type ActionButtonVariant = "primary" | "secondary" | "light" | "outline" | "text";

interface ActionButtonProps {
  href: string;
  children: ReactNode;
  variant?: ActionButtonVariant;
  icon?: ReactNode;
  className?: string;
}

export function ActionButton({
  href,
  children,
  variant = "primary",
  icon,
  className = "",
}: ActionButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={classes}>
      <span>{children}</span>
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
    </Link>
  );
}
