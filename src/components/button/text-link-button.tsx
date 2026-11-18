import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import styles from "./text-link-button.module.css";

interface TextLinkButtonProps {
  href: LinkProps["href"];
  title?: string;
  children: ReactNode;
}

export function TextLinkButton({ href, title, children }: TextLinkButtonProps) {
  return (
    <Link className={styles.link} href={href} title={title}>
      {children}
    </Link>
  );
}
