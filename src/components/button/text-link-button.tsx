import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./text-link-button.module.css";

interface TextLinkButtonProps {
  href: string;
  children: ReactNode;
}

export function TextLinkButton({ href, children }: TextLinkButtonProps) {
  return (
    <Link className={styles.link} href={href}>
      {children}
    </Link>
  );
}
