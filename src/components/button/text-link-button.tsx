import { ArrowLeft } from "lucide-react";
import Link, { type LinkProps } from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import styles from "./text-link-button.module.css";

interface TextLinkButtonProps {
  href: LinkProps["href"];
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  shallow?: boolean;
  title?: string;
  back?: boolean;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
}

export function TextLinkButton({ href, onClick, shallow, title, back, className, "aria-label": ariaLabel, children }: TextLinkButtonProps) {
  const linkClassName = [styles.link, back ? styles.back : undefined, className].filter(Boolean).join(" ");
  return (
    <Link className={linkClassName} href={href} shallow={shallow} title={title} aria-label={ariaLabel} onClick={onClick} data-ui-text-link data-ui-back-link={back ? "true" : undefined}>
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
    <ButtonBar
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={pressed}
    >
      {children}
    </ButtonBar>
  );
}
