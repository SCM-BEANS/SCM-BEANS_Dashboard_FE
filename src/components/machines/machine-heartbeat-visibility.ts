import { useEffect, useState, type RefObject } from "react";

export function usePageVisibility() {
  const [isPageVisible, setPageVisible] = useState(() =>
    typeof document === "undefined" || document.visibilityState === "visible",
  );

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return isPageVisible;
}

export function useVisibleMachineIds(
  containerRef: RefObject<HTMLElement | null>,
  machineIds: readonly string[],
) {
  const machineIdsKey = machineIds.join("\u001f");
  const [visibleMachineIds, setVisibleMachineIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || machineIdsKey.length === 0) {
      setVisibleMachineIds(new Set());
      return;
    }

    const visible = new Set<string>();
    setVisibleMachineIds(visible);
    if (typeof IntersectionObserver === "undefined") {
      const updateVisibleRows = () => {
        for (const row of container.querySelectorAll<HTMLElement>("[data-machine-heartbeat-id]")) {
          const bounds = row.getBoundingClientRect();
          let visibleTop = 0;
          let visibleBottom = window.innerHeight;
          for (let ancestor = row.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
            const overflowY = window.getComputedStyle(ancestor).overflowY;
            if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden" || overflowY === "clip") {
              const clipBounds = ancestor.getBoundingClientRect();
              visibleTop = Math.max(visibleTop, clipBounds.top);
              visibleBottom = Math.min(visibleBottom, clipBounds.bottom);
            }
          }
          if (bounds.bottom > visibleTop && bounds.top < visibleBottom) {
            const machineId = row.dataset.machineHeartbeatId;
            if (machineId) visible.add(machineId);
          } else if (row.dataset.machineHeartbeatId) {
            visible.delete(row.dataset.machineHeartbeatId);
          }
        }
        setVisibleMachineIds(new Set(visible));
      };
      updateVisibleRows();
      window.addEventListener("scroll", updateVisibleRows, { passive: true });
      document.addEventListener("scroll", updateVisibleRows, { capture: true, passive: true });
      window.addEventListener("resize", updateVisibleRows);
      return () => {
        window.removeEventListener("scroll", updateVisibleRows);
        document.removeEventListener("scroll", updateVisibleRows, { capture: true });
        window.removeEventListener("resize", updateVisibleRows);
      };
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const machineId = (entry.target as HTMLElement).dataset.machineHeartbeatId;
        if (!machineId) continue;
        if (entry.isIntersecting) visible.add(machineId);
        else visible.delete(machineId);
      }
      setVisibleMachineIds(new Set(visible));
    }, { rootMargin: "0px" });

    container.querySelectorAll<HTMLElement>("[data-machine-heartbeat-id]").forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  // The IDs are reduced to a stable key so list row renders do not recreate observers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, machineIdsKey]);

  return visibleMachineIds;
}

export async function staggerHeartbeatRequest(index: number, signal: AbortSignal) {
  const delayMs = Math.min(Math.max(index, 0) * 160, 960);
  if (delayMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  }
  if (signal.aborted) {
    const error = new Error("Heartbeat request was cancelled.");
    error.name = "AbortError";
    throw error;
  }
}
