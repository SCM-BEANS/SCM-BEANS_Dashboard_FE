import Link, { type LinkProps } from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
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

interface TextActionButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  "aria-label"?: string;
  children: ReactNode;
}

export function TextActionButton({
  onClick,
  disabled,
  "aria-label": ariaLabel,
  children,
}: TextActionButtonProps) {
  return (
    <button
      className={styles.action}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
