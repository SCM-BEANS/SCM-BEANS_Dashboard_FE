import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import styles from "./text-link-button.module.css";

interface TextLinkButtonProps {
  shallow?: boolean;
  title?: string;
  children: ReactNode;
}

type TextLinkTarget = { href: LinkProps["href"]; onClick?: never } | { href?: never; onClick: () => void };

export function TextLinkButton({ href, onClick, shallow, title, children }: TextLinkButtonProps & TextLinkTarget) {
  if (href === undefined) {
    return <button type="button" className={styles.link} title={title} onClick={onClick}>{children}</button>;
  }
  return (
    <Link className={styles.link} href={href} shallow={shallow} title={title}>
      {children}
    </Link>
  );
}
