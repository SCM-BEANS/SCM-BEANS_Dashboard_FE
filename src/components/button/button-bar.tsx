import Link from "next/link";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
  type CSSProperties,
} from "react";
import styles from "./button-bar.module.css";

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  rollingLabel?: boolean;
};

type LinkButtonProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
    href: string;
  };

type NativeButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: never;
  };

export type ButtonBarProps = LinkButtonProps | NativeButtonProps;

export const ButtonBar = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  ButtonBarProps
>(function ButtonBar(props, ref) {
  const { variant = "secondary", rollingLabel = false, ...rest } = props;
  const rolls = rollingLabel && typeof props.children === "string";
  const className = [styles.button, styles[variant], rolls && styles.rollingButton, props.className].filter(Boolean).join(" ");
  // Lucian UX/UI Prompt #009 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#009
  const content = rolls ? <span className={styles.rollingWord} aria-hidden="true">{Array.from(props.children as string).map((letter, index) => <span key={index} className={styles.rollingLetter} data-letter={letter === " " ? "\u00a0" : letter} style={{ "--letter-index": index } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>)}</span> : props.children;
  const accessibleLabel = props["aria-label"] ?? (rolls ? props.children as string : undefined);

  if (props.href) {
    const { href, children, ...linkProps } = rest as LinkButtonProps;
    return (
      <Link
        {...linkProps}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={className}
        aria-label={accessibleLabel}
      >
        {rolls ? content : children}
      </Link>
    );
  }

  return (
    <button
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      ref={ref as Ref<HTMLButtonElement>}
      className={className}
      type={(props as NativeButtonProps).type ?? "button"}
      aria-label={accessibleLabel}
    >
      {content}
    </button>
  );
});
