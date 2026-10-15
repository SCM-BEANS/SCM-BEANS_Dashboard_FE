"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useState, type ReactNode } from "react";
import { useI18nStore } from "@/store/useI18nStore";
import type { ClusterAttachmentDefinition } from "./DigitalTwinClusterCanvas";
import { DIGITAL_TWIN_OPERATION_STAGES } from "./operation/DigitalTwinOperationConfig";
import { useDigitalTwinTestCycle } from "./operation/useDigitalTwinTestCycle";

const BodyModelCanvas = dynamic(() => import("./BodyModelCanvas"), {
  ssr: false,
  loading: () => null,
});

type ViewerStatus = "loading" | "ready" | "error";

const NO_EXCLUDED_NODE_NAMES: readonly string[] = [];

export interface BodyModelViewerProps {
  interactive?: boolean;
  modelRotationY?: number;
  excludedNodeNames?: readonly string[];
  includeMayxoayNode?: boolean;
  enableCoffeeEffect?: boolean;
  enableWaterEffect?: boolean;
  includeCompressorMotion?: boolean;
  compressorModelUrls?: readonly string[];
  compressorAttachedModelDefinitions?: readonly ClusterAttachmentDefinition[];
  compressorRootFrameUrl?: string;
  compressorMotionDefinitionUrls?: readonly string[];
  enableOperationTest?: boolean;
}

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

export function BodyModelViewer({
  interactive = true,
  modelRotationY = 0,
  excludedNodeNames = NO_EXCLUDED_NODE_NAMES,
  includeMayxoayNode = false,
  enableCoffeeEffect = false,
  enableWaterEffect = false,
  includeCompressorMotion = false,
  compressorModelUrls,
  compressorAttachedModelDefinitions,
  compressorRootFrameUrl,
  compressorMotionDefinitionUrls,
  enableOperationTest = false,
}: BodyModelViewerProps = {}) {
  const t = useI18nStore((state) => state.t);
  const {
    status: operationStatus,
    currentEvent: operationEvent,
    start: startOperation,
    reset: resetOperation,
    fail: failOperation,
  } = useDigitalTwinTestCycle();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [cameraResetVersion, setCameraResetVersion] = useState(0);
  const [compressorRunning, setCompressorRunning] = useState(false);
  const [coffeeRunRequest, setCoffeeRunRequest] = useState(0);
  const [waterRunRequest, setWaterRunRequest] = useState(0);
  const [waterResetRequest, setWaterResetRequest] = useState(0);

  const handleLoadStart = useCallback(() => setStatus("loading"), []);
  const handleReady = useCallback(() => setStatus("ready"), []);
  const handleError = useCallback(() => {
    resetOperation();
    setStatus("error");
  }, [resetOperation]);
  const handleOperationError = useCallback(
    (error: unknown) => failOperation(error),
    [failOperation],
  );
  const handleOperationStart = useCallback(() => {
    setCompressorRunning(false);
    startOperation();
  }, [startOperation]);
  const handleCoffeeSimulation = useCallback(() => {
    if (status !== "ready" || !enableCoffeeEffect) return;
    setCoffeeRunRequest((request) => request + 1);
  }, [enableCoffeeEffect, status]);
  const handleWaterSimulation = useCallback(() => {
    if (status !== "ready" || !enableWaterEffect) return;
    setWaterRunRequest((request) => request + 1);
  }, [enableWaterEffect, status]);
  const handleWaterReset = useCallback(() => {
    if (!enableWaterEffect) return;
    setWaterResetRequest((request) => request + 1);
  }, [enableWaterEffect]);
  const handleRetry = useCallback(() => {
    resetOperation();
    setStatus("loading");
    setZoomLevel(0);
    setCompressorRunning(false);
    setAttempt((current) => current + 1);
  }, [resetOperation]);
  const handleReset = useCallback(() => {
    setZoomLevel(0);
    setCameraResetVersion((version) => version + 1);
  }, []);

  const activeStage = DIGITAL_TWIN_OPERATION_STAGES.find(
    (stage) => stage.phase === operationEvent?.phase,
  );
  const operationStatusLabel =
    operationStatus === "complete"
      ? t("digital_twin_operation_complete")
      : operationStatus === "fault"
        ? t("digital_twin_operation_error")
        : operationStatus === "running" && activeStage
          ? t(activeStage.labelKey)
          : t("digital_twin_operation_idle");

  return (
    <div
      className="relative isolate min-h-[320px] overflow-hidden bento-border bg-transparent md:min-h-[380px]"
      style={{
        height: "var(--admin-machine-viewer-height, min(62vh, 700px))",
      }}
    >
      <CanvasErrorBoundary key={attempt} onError={handleError}>
        <BodyModelCanvas
          interactive={interactive}
          onLoadStart={handleLoadStart}
          onReady={handleReady}
          onError={handleError}
          canvasLabel={t("digital_twin_body_canvas_label")}
          modelRotationY={modelRotationY}
          cameraResetVersion={cameraResetVersion}
          zoomLevel={zoomLevel}
          excludedNodeNames={excludedNodeNames}
          includeMayxoayNode={includeMayxoayNode}
          enableCoffeeEffect={enableCoffeeEffect}
          coffeeRunRequest={coffeeRunRequest}
          enableWaterEffect={enableWaterEffect}
          waterRunRequest={waterRunRequest}
          waterResetRequest={waterResetRequest}
          includeCompressorMotion={includeCompressorMotion}
          compressorModelUrls={compressorModelUrls}
          compressorAttachedModelDefinitions={compressorAttachedModelDefinitions}
          compressorRootFrameUrl={compressorRootFrameUrl}
          compressorMotionDefinitionUrls={compressorMotionDefinitionUrls}
          compressorRunning={compressorRunning}
          operationEvent={operationEvent}
          onOperationError={handleOperationError}
        />
      </CanvasErrorBoundary>

      {interactive ? (
        <div className="absolute right-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-2 rounded-lg border border-outline-variant bg-surface/90 p-1.5 shadow-sm backdrop-blur-sm">
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
          <span aria-hidden="true">↺</span>
        </button>
        {includeCompressorMotion ? (
          <>
            <span className="h-7 w-px bg-outline-variant" aria-hidden="true" />
            <button
              type="button"
              aria-label={t(
                compressorRunning
                  ? "digital_twin_body_motion_stop_label"
                  : "digital_twin_body_motion_run_label",
              )}
              title={t(
                compressorRunning
                  ? "digital_twin_body_motion_stop_label"
                  : "digital_twin_body_motion_run_label",
              )}
              aria-pressed={compressorRunning}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={() => setCompressorRunning((running) => !running)}
              className="min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {t(
                compressorRunning
                  ? "digital_twin_body_motion_stop"
                  : "digital_twin_body_motion_run",
              )}
            </button>
          </>
        ) : null}
        {enableCoffeeEffect ? (
          <>
            <span className="h-7 w-px bg-outline-variant" aria-hidden="true" />
            <button
              type="button"
              aria-label={t("digital_twin_coffee_simulate_label")}
              title={t("digital_twin_coffee_simulate_label")}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={handleCoffeeSimulation}
              className="min-h-11 rounded-md border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {t("digital_twin_coffee_simulate")}
            </button>
          </>
        ) : null}
        {enableWaterEffect ? (
          <>
            <span className="h-7 w-px bg-outline-variant" aria-hidden="true" />
            <button
              type="button"
              aria-label={t("digital_twin_water_run")}
              title={t("digital_twin_water_run")}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={handleWaterSimulation}
              className="min-h-11 rounded-md border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {t("digital_twin_water_run")}
            </button>
            <button
              type="button"
              aria-label={t("digital_twin_water_reset")}
              title={t("digital_twin_water_reset")}
              disabled={status !== "ready"}
              onClick={handleWaterReset}
              className="min-h-11 rounded-md px-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {t("digital_twin_water_reset")}
            </button>
          </>
        ) : null}
        {enableOperationTest ? (
          <>
            <span className="h-7 w-px bg-outline-variant" aria-hidden="true" />
            <button
              type="button"
              aria-label={
                operationStatus === "running"
                  ? t("digital_twin_operation_running")
                  : t("digital_twin_operation_run_label")
              }
              title={t("digital_twin_operation_run_label")}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={handleOperationStart}
              className="min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {operationStatus === "running"
                ? t("digital_twin_operation_running")
                : t("digital_twin_operation_run")}
            </button>
          </>
        ) : null}
        </div>
      ) : null}

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
              {t("digital_twin_body_loading")}
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
            {t("digital_twin_body_ready")}
          </div>
          {enableOperationTest ? (
            <div
              role="status"
              aria-live="polite"
              className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md border border-outline-variant bg-surface/90 px-3 py-1.5 text-xs font-semibold text-on-surface shadow-sm"
            >
              {operationStatusLabel}
            </div>
          ) : null}
        </>
      ) : null}

      {status === "error" ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-6"
          role="alert"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-sm text-on-surface">
              {t("digital_twin_body_load_error")}
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
