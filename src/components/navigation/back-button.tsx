import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";
import { navigateBackOrFallback } from "./history-entry";
import styles from "./back-button.module.css";

export type BackButtonDestination = {
  label: string;
  fallbackHref: string;
};

export type BackButtonProps = BackButtonDestination & {
  className?: string;
  disabled?: boolean;
  onNavigate?: () => void;
};

export function BackButton({ label, fallbackHref, className, disabled, onNavigate }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (onNavigate) {
      onNavigate();
      return;
    }
    if (typeof window === "undefined") return;
    navigateBackOrFallback({
      historyState: window.history.state,
      fallbackHref,
      router,
    });
  }

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(" ")}
      onClick={handleBack}
      disabled={disabled}
      aria-label={label}
    >
      <ArrowLeft className={styles.icon} aria-hidden="true" focusable="false" />
      <span>{label}</span>
    </button>
  );
}
