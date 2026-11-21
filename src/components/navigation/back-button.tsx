import { useRouter } from "next/router";
import { navigateBackOrFallback } from "./history-entry";
import { TextLinkButton } from "@/components/button/text-link-button";

export type BackButtonDestination = {
  label: string;
  fallbackHref: string;
};

export type BackButtonProps = BackButtonDestination & {
  className?: string;
};

export function BackButton({ label, fallbackHref, className }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window === "undefined") return;
    navigateBackOrFallback({
      historyState: window.history.state,
      fallbackHref,
      router,
    });
  }

  return <TextLinkButton back href={fallbackHref} className={className} onClick={(event) => { event.preventDefault(); handleBack(); }} aria-label={label}>{label}</TextLinkButton>;
}
