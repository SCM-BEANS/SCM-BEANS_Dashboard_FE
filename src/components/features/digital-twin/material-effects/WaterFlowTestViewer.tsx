"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useState, type ReactNode } from "react";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useI18nStore } from "@/store/useI18nStore";
import {
  type MaterialEffectsTestState,
} from "./useMaterialEffectsTest";

const WaterFlowTestCanvas = dynamic(() => import("./WaterFlowTestCanvas"), {
  ssr: false,
  loading: () => null,
});

type ViewerStatus = "loading" | "ready" | "error";

const INITIAL_WATER_STATE: MaterialEffectsTestState = {
  phase: "idle",
  progress: 0,
  cycleId: 0,
  sequence: 0,
};

const WATER_PHASE_LABEL_KEYS: Record<
  MaterialEffectsTestState["phase"],
  TranslationKey
> = {
  idle: "digital_twin_water_phase_idle",
  running: "digital_twin_water_phase_running",
  complete: "digital_twin_water_phase_complete",
  fault: "digital_twin_water_phase_fault",
};

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

export function WaterFlowTestViewer() {
  const t = useI18nStore((state) => state.t);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [cameraResetVersion, setCameraResetVersion] = useState(0);
  const [runRequest, setRunRequest] = useState(0);
  const [resetRequest, setResetRequest] = useState(0);
  const [effectState, setEffectState] = useState(INITIAL_WATER_STATE);

  const handleLoadStart = useCallback(() => setStatus("loading"), []);
  const handleReady = useCallback(() => setStatus("ready"), []);
  const handleError = useCallback(() => setStatus("error"), []);
  const handleRetry = useCallback(() => {
    setStatus("loading");
    setZoomLevel(0);
    setRunRequest(0);
    setResetRequest(0);
    setEffectState(INITIAL_WATER_STATE);
    setAttempt((current) => current + 1);
  }, []);
  const handleResetCamera = useCallback(() => {
    setZoomLevel(0);
    setCameraResetVersion((version) => version + 1);
  }, []);
  const handleRun = useCallback(() => {
    if (status !== "ready" || effectState.phase === "running") return;
    setRunRequest((request) => request + 1);
  }, [effectState.phase, status]);
  const handleEffectReset = useCallback(() => {
    if (status !== "ready") return;
    setResetRequest((request) => request + 1);
  }, [status]);

  return (
    <div className="relative isolate h-[min(62vh,700px)] min-h-[320px] overflow-hidden bento-border bg-surface-container md:min-h-[380px]">
      <CanvasErrorBoundary key={attempt} onError={handleError}>
        <WaterFlowTestCanvas
          onLoadStart={handleLoadStart}
          onReady={handleReady}
          onError={handleError}
          canvasLabel={t("digital_twin_water_canvas_label")}
          cameraResetVersion={cameraResetVersion}
          zoomLevel={zoomLevel}
          runRequest={runRequest}
          resetRequest={resetRequest}
          onEffectStateChange={setEffectState}
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
          onClick={handleResetCamera}
          className="min-h-11 min-w-11 rounded-md text-lg text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">↺</span>
        </button>
      </div>

      <div className="absolute bottom-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col gap-2 rounded-lg border border-outline-variant bg-surface/90 p-2 shadow-sm backdrop-blur-sm">
        <p className="text-xs font-semibold text-on-surface">
          {t("digital_twin_water_effect_title")}
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            aria-label={t("digital_twin_water_run")}
            title={t("digital_twin_water_run")}
            disabled={status !== "ready" || effectState.phase === "running"}
            onClick={handleRun}
            className="min-h-10 rounded-md bg-primary px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t("digital_twin_water_run")}
          </button>
          <button
            type="button"
            aria-label={t("digital_twin_water_reset")}
            title={t("digital_twin_water_reset")}
            disabled={status !== "ready"}
            onClick={handleEffectReset}
            className="min-h-10 rounded-md border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t("digital_twin_water_reset")}
          </button>
        </div>
        <p
          className="text-[11px] tabular-nums text-on-surface-variant"
          role="status"
          aria-live="polite"
        >
          {t(WATER_PHASE_LABEL_KEYS[effectState.phase])} · {Math.round(effectState.progress * 100)}%
        </p>
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
              {t("digital_twin_water_loading")}
            </span>
          </div>
        </div>
      ) : null}

      {status === "ready" ? (
        <>
          <div
            role="status"
            aria-live="polite"
            className="absolute left-3 top-3 z-10 rounded-md border border-outline-variant bg-surface/90 px-3 py-1.5 text-xs font-semibold text-on-surface shadow-sm"
          >
            {t("digital_twin_water_ready")}
          </div>
          <div className="absolute bottom-3 left-3 z-10 rounded-md border border-outline-variant bg-surface/90 px-3 py-1.5 text-xs text-on-surface-variant shadow-sm">
            {t("digital_twin_water_marker")}
          </div>
        </>
      ) : null}

      {status === "error" ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-6"
          role="alert"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-sm text-on-surface">
              {t("digital_twin_water_load_error")}
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
