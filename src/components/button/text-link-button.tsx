import { ArrowLeft } from "lucide-react";
import Link, { type LinkProps } from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import styles from "./text-link-button.module.css";

interface TextLinkButtonProps {
  shallow?: boolean;
  title?: string;
  back?: boolean;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
}

type TextLinkTarget = { href: LinkProps["href"]; onClick?: never } | { href?: never; onClick: () => void };

export function TextLinkButton({ href, onClick, shallow, title, back, className, "aria-label": ariaLabel, children }: TextLinkButtonProps & TextLinkTarget) {
  const linkClassName = [styles.link, back ? styles.back : undefined, className].filter(Boolean).join(" ");
  if (href === undefined) {
    return (
      <button type="button" className={linkClassName} title={title} aria-label={ariaLabel} onClick={onClick} data-ui-back-link={back ? "true" : undefined}>
        {back ? <ArrowLeft className={styles.backIcon} aria-hidden="true" focusable="false" /> : null}
        {children}
      </button>
    );
  }
  return (
    <Link className={linkClassName} href={href} shallow={shallow} title={title} aria-label={ariaLabel} data-ui-back-link={back ? "true" : undefined}>
      {back ? <ArrowLeft className={styles.backIcon} aria-hidden="true" focusable="false" /> : null}
      {children}
    </Link>
  );
}

interface TextActionButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  children: ReactNode;
}

export function TextActionButton({
  onClick,
  disabled,
  "aria-label": ariaLabel,
  "aria-pressed": pressed,
  children,
}: TextActionButtonProps) {
  return (
    <button
      className={styles.action}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}
