import { useEffect, type ReactNode } from "react";
import { installInAppHistoryTracking } from "./history-entry";

export function InAppHistoryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    return installInAppHistoryTracking(window.history, window.location);
  }, []);

  return <>{children}</>;
}
