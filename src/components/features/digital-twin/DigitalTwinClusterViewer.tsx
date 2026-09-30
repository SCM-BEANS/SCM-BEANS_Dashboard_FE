"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useState, type ReactNode } from "react";
import { useI18nStore } from "@/store/useI18nStore";

const DigitalTwinClusterCanvas = dynamic(
  () => import("./DigitalTwinClusterCanvas"),
  { ssr: false, loading: () => null },
);

type ViewerStatus = "loading" | "ready" | "error";

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export function DigitalTwinClusterViewer() {
  const t = useI18nStore((state) => state.t);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [cameraResetVersion, setCameraResetVersion] = useState(0);

  const handleLoadStart = useCallback(() => setStatus("loading"), []);
  const handleReady = useCallback(() => setStatus("ready"), []);
  const handleError = useCallback(() => setStatus("error"), []);
  const handleRetry = useCallback(() => {
    setStatus("loading");
    setZoomLevel(0);
    setAttempt((current) => current + 1);
  }, []);
  const handleReset = useCallback(() => {
    setZoomLevel(0);
    setCameraResetVersion((version) => version + 1);
  }, []);

  return (
    <div className="relative isolate h-[min(62vh,700px)] min-h-[320px] overflow-hidden bento-border bg-surface-container md:min-h-[380px]">
      <CanvasErrorBoundary key={attempt} onError={handleError}>
        <DigitalTwinClusterCanvas
          onLoadStart={handleLoadStart}
          onReady={handleReady}
          onError={handleError}
          canvasLabel={t("digital_twin_mayxoay_canvas_label")}
          cameraResetVersion={cameraResetVersion}
          zoomLevel={zoomLevel}
        />
      </CanvasErrorBoundary>

      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface/90 p-1.5 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          aria-label={t("digital_twin_zoom_out")}
          title={t("digital_twin_zoom_out")}
          disabled={status !== "ready" || zoomLevel <= -5}
          onClick={() => setZoomLevel((level) => Math.max(-5, level - 1))}
          className="min-h-11 min-w-11 rounded-md text-xl font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          aria-label={t("digital_twin_zoom_in")}
          title={t("digital_twin_zoom_in")}
          disabled={status !== "ready" || zoomLevel >= 6}
          onClick={() => setZoomLevel((level) => Math.min(6, level + 1))}
          className="min-h-11 min-w-11 rounded-md text-xl font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">+</span>
        </button>
        <span className="h-7 w-px bg-outline-variant" aria-hidden="true" />
        <button
          type="button"
          aria-label={t("digital_twin_camera_reset")}
          title={t("digital_twin_camera_reset")}
          disabled={status !== "ready"}
          onClick={handleReset}
          className="min-h-11 min-w-11 rounded-md text-lg text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">↻</span>
        </button>
      </div>

      {status === "loading" ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-surface/85 p-6 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
            />
            <span className="text-sm font-medium text-on-surface">
              {t("digital_twin_mayxoay_loading")}
            </span>
          </div>
        </div>
      ) : null}

      {status === "ready" ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-3 top-3 z-10 rounded-md border border-outline-variant bg-surface/90 px-3 py-1.5 text-xs font-semibold text-on-surface shadow-sm"
        >
          {t("digital_twin_mayxoay_ready")}
        </div>
      ) : null}

      {status === "error" ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-6"
          role="alert"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-sm text-on-surface">
              {t("digital_twin_mayxoay_load_error")}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("digital_twin_retry")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
