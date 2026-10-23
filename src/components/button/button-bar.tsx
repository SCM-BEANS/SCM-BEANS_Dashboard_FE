import Link from "next/link";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import styles from "./button-bar.module.css";

type SharedProps = {
  children: ReactNode;
  className?: string;
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
  const className = [styles.button, props.className].filter(Boolean).join(" ");

  if (props.href) {
    const { href, children, ...linkProps } = props;
    return (
      <Link
        {...linkProps}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={className}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      ref={ref as Ref<HTMLButtonElement>}
      className={className}
      type={(props as NativeButtonProps).type ?? "button"}
    >
      {props.children}
    </button>
  );
});
