"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useState, type ReactNode } from "react";
import { DIGITAL_TWIN_MESSAGES } from "@/text/digital-twin/digital-twin-messages";
import styles from "./digital-twin-viewer.module.css";
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
      ? DIGITAL_TWIN_MESSAGES.digital_twin_operation_complete
      : operationStatus === "fault"
        ? DIGITAL_TWIN_MESSAGES.digital_twin_operation_error
        : operationStatus === "running" && activeStage
          ? DIGITAL_TWIN_MESSAGES[activeStage.labelKey]
          : DIGITAL_TWIN_MESSAGES.digital_twin_operation_idle;

  return (
    <div
      className={styles.viewer}
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
          canvasLabel={DIGITAL_TWIN_MESSAGES.digital_twin_body_canvas_label}
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
        <div className={styles.toolbar}>
        <button
          type="button"
          aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_out}
          title={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_out}
          disabled={status !== "ready" || zoomLevel <= -5}
          onClick={() => setZoomLevel((level) => Math.max(-5, level - 1))}
          className={`${styles.toolbarButton} ${styles.iconButton}`}
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_in}
          title={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_in}
          disabled={status !== "ready" || zoomLevel >= 6}
          onClick={() => setZoomLevel((level) => Math.min(6, level + 1))}
          className={`${styles.toolbarButton} ${styles.iconButton}`}
        >
          <span aria-hidden="true">+</span>
        </button>
        <span className={styles.separator} aria-hidden="true" />
        <button
          type="button"
          aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_camera_reset}
          title={DIGITAL_TWIN_MESSAGES.digital_twin_camera_reset}
          disabled={status !== "ready"}
          onClick={handleReset}
          className={`${styles.toolbarButton} ${styles.iconButton}`}
        >
          <span aria-hidden="true">↺</span>
        </button>
        {includeCompressorMotion ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            <button
              type="button"
              aria-label={
                DIGITAL_TWIN_MESSAGES[
                  compressorRunning
                    ? "digital_twin_body_motion_stop_label"
                    : "digital_twin_body_motion_run_label"
                ]
              }
              title={
                DIGITAL_TWIN_MESSAGES[
                  compressorRunning
                    ? "digital_twin_body_motion_stop_label"
                    : "digital_twin_body_motion_run_label"
                ]
              }
              aria-pressed={compressorRunning}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={() => setCompressorRunning((running) => !running)}
              className={`${styles.toolbarButton} ${styles.primaryButton}`}
            >
              {
                DIGITAL_TWIN_MESSAGES[
                  compressorRunning
                    ? "digital_twin_body_motion_stop"
                    : "digital_twin_body_motion_run"
                ]
              }
            </button>
          </>
        ) : null}
        {enableCoffeeEffect ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            <button
              type="button"
              aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_coffee_simulate_label}
              title={DIGITAL_TWIN_MESSAGES.digital_twin_coffee_simulate_label}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={handleCoffeeSimulation}
              className={`${styles.toolbarButton} ${styles.outlineButton}`}
            >
              {DIGITAL_TWIN_MESSAGES.digital_twin_coffee_simulate}
            </button>
          </>
        ) : null}
        {enableWaterEffect ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            <button
              type="button"
              aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_water_run}
              title={DIGITAL_TWIN_MESSAGES.digital_twin_water_run}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={handleWaterSimulation}
              className={`${styles.toolbarButton} ${styles.outlineButton}`}
            >
              {DIGITAL_TWIN_MESSAGES.digital_twin_water_run}
            </button>
            <button
              type="button"
              aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_water_reset}
              title={DIGITAL_TWIN_MESSAGES.digital_twin_water_reset}
              disabled={status !== "ready"}
              onClick={handleWaterReset}
              className={`${styles.toolbarButton} ${styles.textButton}`}
            >
              {DIGITAL_TWIN_MESSAGES.digital_twin_water_reset}
            </button>
          </>
        ) : null}
        {enableOperationTest ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            <button
              type="button"
              aria-label={
                operationStatus === "running"
                  ? DIGITAL_TWIN_MESSAGES.digital_twin_operation_running
                  : DIGITAL_TWIN_MESSAGES.digital_twin_operation_run_label
              }
              title={DIGITAL_TWIN_MESSAGES.digital_twin_operation_run_label}
              disabled={status !== "ready" || operationStatus === "running"}
              onClick={handleOperationStart}
              className={`${styles.toolbarButton} ${styles.primaryButton}`}
            >
              {operationStatus === "running"
                ? DIGITAL_TWIN_MESSAGES.digital_twin_operation_running
                : DIGITAL_TWIN_MESSAGES.digital_twin_operation_run}
            </button>
          </>
        ) : null}
        </div>
      ) : null}

      {status === "loading" ? (
        <div
          className={styles.loadingOverlay}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className={styles.loadingContent}>
            <span aria-hidden="true" className={styles.spinner} />
            <span className={styles.loadingText}>
              {DIGITAL_TWIN_MESSAGES.digital_twin_body_loading}
            </span>
          </div>
        </div>
      ) : null}

      {status === "ready" ? (
        <>
          <div
            role="status"
            aria-live="polite"
            className={styles.readyStatus}
          >
            {DIGITAL_TWIN_MESSAGES.digital_twin_body_ready}
          </div>
          {enableOperationTest ? (
            <div
              role="status"
              aria-live="polite"
              className={styles.operationStatus}
            >
              {operationStatusLabel}
            </div>
          ) : null}
        </>
      ) : null}

      {status === "error" ? (
        <div
          className={styles.errorOverlay}
          role="alert"
        >
          <div className={styles.errorContent}>
            <p className={styles.errorText}>
              {DIGITAL_TWIN_MESSAGES.digital_twin_body_load_error}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className={styles.retryButton}
            >
              {DIGITAL_TWIN_MESSAGES.digital_twin_retry}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
