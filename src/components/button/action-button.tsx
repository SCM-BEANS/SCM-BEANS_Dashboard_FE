import Link from "next/link";
import type { ReactNode } from "react";

type ActionButtonVariant = "primary" | "light" | "outline" | "text";

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
  const classes = ["action-button", `action-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Link href={href} className={classes}>
        <span>{children}</span>
        {icon && <span className="action-button__icon" aria-hidden="true">{icon}</span>}
      </Link>

      <style jsx>{`
        .action-button {
          min-height: 48px;
          padding: 0 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid transparent;
          border-radius: 4px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.2;
          text-decoration: none;
          transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
        }

        .action-button:hover {
          transform: translateY(-2px);
        }

        .action-button--primary {
          color: #fff;
          background: #721c24;
        }

        .action-button--primary:hover {
          background: #5a141a;
        }

        .action-button--light {
          color: #211719;
          background: #fff;
        }

        .action-button--light:hover {
          background: #f7f0e8;
        }

        .action-button--outline {
          color: #fff;
          border-color: rgba(255, 255, 255, 0.65);
          background: transparent;
        }

        .action-button--outline:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .action-button--text {
          min-height: 0;
          padding: 0;
          color: #721c24;
          background: transparent;
        }

        .action-button--text:hover {
          color: #5a141a;
        }

        .action-button__icon {
          display: inline-flex;
          align-items: center;
          transition: transform 0.2s ease;
        }

        .action-button--text:hover .action-button__icon {
          transform: translateX(4px);
        }
      `}</style>
    </>
  );
}
