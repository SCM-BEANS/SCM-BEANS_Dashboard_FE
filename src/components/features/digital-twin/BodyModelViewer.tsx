"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Component, useCallback, useMemo, useState, type ReactNode } from "react";
import { DIGITAL_TWIN_MESSAGES, DIGITAL_TWIN_RECIPE_TWIN_MESSAGES as T } from "@/text/digital-twin/digital-twin-messages";
import styles from "./digital-twin-viewer.module.css";
import type { ClusterAttachmentDefinition } from "./DigitalTwinClusterCanvas";
import type { DigitalTwinCycleEvent } from "@/schema/digital-twin-cycle.schema";
import { DIGITAL_TWIN_OPERATION_STAGES } from "./operation/DigitalTwinOperationConfig";
import { useDigitalTwinTestCycle } from "./operation/useDigitalTwinTestCycle";
import {
  DEFAULT_PART_LAYERS,
  type DigitalTwinPresentation,
  type PartGroupId,
} from "./presentation/part-groups";

const BodyModelCanvas = dynamic(() => import("./BodyModelCanvas"), {
  ssr: false,
  loading: () => null,
});

type ViewerStatus = "loading" | "ready" | "error";

const NO_EXCLUDED_NODE_NAMES: readonly string[] = [];

export interface BodyModelViewerProps {
  ownerLayout?: boolean;
  partsTarget?: HTMLElement | null;
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
  operationEvent?: DigitalTwinCycleEvent | null;
  operationSource?: "test" | "external";
  presentation?: DigitalTwinPresentation;
  showElectricalLayer?: boolean;
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
  ownerLayout = false,
  partsTarget,
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
  operationEvent: externalOperationEvent,
  operationSource = "test",
  presentation,
  showElectricalLayer = false,
}: BodyModelViewerProps = {}) {
  const {
    status: operationStatus,
    currentEvent: testOperationEvent,
    start: startOperation,
    reset: resetOperation,
    fail: failOperation,
  } = useDigitalTwinTestCycle();
  const operationEvent =
    operationSource === "external" ? externalOperationEvent ?? null : testOperationEvent;
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [cameraResetVersion, setCameraResetVersion] = useState(0);
  const [compressorRunning, setCompressorRunning] = useState(false);
  const [coffeeRunRequest, setCoffeeRunRequest] = useState(0);
  const [waterRunRequest, setWaterRunRequest] = useState(0);
  const [waterResetRequest, setWaterResetRequest] = useState(0);
  const [ghostShells, setGhostShells] = useState(true);
  const [autoCamera, setAutoCamera] = useState(true);
  const [layers, setLayers] = useState<Record<PartGroupId, boolean>>({ ...DEFAULT_PART_LAYERS });

  const canvasPresentation = useMemo<DigitalTwinPresentation | undefined>(() => {
    if (!presentation && !ownerLayout) return undefined;
    return {
      focus: [],
      ...presentation,
      layers: { ...layers },
      autoCamera,
      ghostShells: ownerLayout ? ghostShells : Boolean(presentation?.active),
    };
  }, [autoCamera, ghostShells, layers, ownerLayout, presentation]);

  const markManualCameraInput = useCallback((target: EventTarget | null) => {
    if ((!presentation && !ownerLayout) || !(target instanceof Element)) return;
    if (target.closest(`.${styles.toolbar}`) || !target.closest("canvas")) return;
    setAutoCamera(false);
  }, [ownerLayout, presentation]);

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
    setAutoCamera(true);
    setZoomLevel(0);
    setCameraResetVersion((version) => version + 1);
  }, []);

  const toggleLayer = useCallback((group: PartGroupId) => {
    setLayers((current) => ({ ...current, [group]: !current[group] }));
  }, []);
  const toggleBrewAssembly = useCallback(() => {
    const groups: PartGroupId[] = ["hopper", "grinder", "brewUnit", "output"];
    setLayers((current) => {
      const turnOn = !groups.every((group) => current[group]);
      return { ...current, hopper: turnOn, grinder: turnOn, brewUnit: turnOn, output: turnOn };
    });
  }, []);
  const brewAssemblyOn = layers.hopper && layers.grinder && layers.brewUnit && layers.output;

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
      className={`${styles.viewer} ${ownerLayout ? styles.ownerViewer : ""}`}
      data-operation-phase={operationEvent?.phase ?? "idle"}
      data-operation-sequence={operationEvent?.sequence}
      style={ownerLayout ? undefined : {
        height: "var(--admin-machine-viewer-height, min(62vh, 700px))",
      }}
      onPointerDownCapture={(event) => markManualCameraInput(event.target)}
      onWheelCapture={(event) => markManualCameraInput(event.target)}
    >
      <div className={ownerLayout ? styles.ownerScene : undefined} style={ownerLayout ? undefined : { height: "100%" }}>
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
            presentation={canvasPresentation}
          />
        </CanvasErrorBoundary>
      </div>

      {interactive ? (
        <div className={styles.toolbar}>
        <button
          type="button"
          aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_out}
          title={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_out}
          disabled={status !== "ready" || zoomLevel <= -5}
          onClick={() => { setAutoCamera(false); setZoomLevel((level) => Math.max(-5, level - 1)); }}
          className={`${styles.toolbarButton} ${styles.iconButton}`}
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          aria-label={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_in}
          title={DIGITAL_TWIN_MESSAGES.digital_twin_zoom_in}
          disabled={status !== "ready" || zoomLevel >= 6}
          onClick={() => { setAutoCamera(false); setZoomLevel((level) => Math.min(6, level + 1)); }}
          className={`${styles.toolbarButton} ${styles.iconButton}`}
        >
          <span aria-hidden="true">+</span>
        </button>
        <span className={styles.separator} aria-hidden="true" />
        <button
          type="button"
          aria-label={ownerLayout ? T.camera_reset : DIGITAL_TWIN_MESSAGES.digital_twin_camera_reset}
          title={ownerLayout ? T.camera_reset : DIGITAL_TWIN_MESSAGES.digital_twin_camera_reset}
          disabled={status !== "ready"}
          onClick={handleReset}
          className={`${styles.toolbarButton} ${styles.iconButton}`}
        >
          {ownerLayout ? T.camera_reset : <span aria-hidden="true">↺</span>}
        </button>
        {ownerLayout ? (
          <button type="button" aria-pressed={ghostShells} onClick={() => setGhostShells(value => !value)} className={`${styles.toolbarButton} ${styles.ghostButton}`}>{T.ghost_shells} {"\u00b7"} {ghostShells ? T.on : T.off}</button>
        ) : presentation ? (
          <>
            <span className={styles.separator} aria-hidden="true" />
            <button
              type="button"
              aria-pressed={autoCamera}
              onClick={() => setAutoCamera((value) => !value)}
              className={`${styles.toolbarButton} ${styles.toggleButton}`}
            >
              {T.auto_follow}
            </button>
            <button type="button" aria-pressed={layers.shell} onClick={() => toggleLayer("shell")} className={`${styles.toolbarButton} ${styles.layerButton}`}>{T.layer_shell}</button>
            <button type="button" aria-pressed={layers.frame} onClick={() => toggleLayer("frame")} className={`${styles.toolbarButton} ${styles.layerButton}`}>{T.layer_frame}</button>
            <button type="button" aria-pressed={layers.water} onClick={() => toggleLayer("water")} className={`${styles.toolbarButton} ${styles.layerButton}`}>{T.layer_water}</button>
            <button type="button" aria-pressed={brewAssemblyOn} onClick={toggleBrewAssembly} className={`${styles.toolbarButton} ${styles.layerButton}`}>{T.layer_brew_unit}</button>
            <button type="button" aria-pressed={layers.waste} onClick={() => toggleLayer("waste")} className={`${styles.toolbarButton} ${styles.layerButton}`}>{T.layer_waste}</button>
            {showElectricalLayer ? (
              <button type="button" aria-pressed={layers.electrical} onClick={() => toggleLayer("electrical")} className={`${styles.toolbarButton} ${styles.layerButton}`}>{T.layer_electrical}</button>
            ) : null}
          </>
        ) : includeCompressorMotion ? (
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
        {!ownerLayout && !presentation && enableCoffeeEffect ? (
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
        {!ownerLayout && !presentation && enableWaterEffect ? (
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
        {!ownerLayout && !presentation && enableOperationTest && operationSource !== "external" ? (
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

      {ownerLayout && partsTarget ? createPortal(
        <div className={styles.partControls}>
          <label><input type="checkbox" checked={layers.shell} onChange={() => toggleLayer("shell")} />{T.layer_shell}</label>
          <label><input type="checkbox" checked={layers.frame} onChange={() => toggleLayer("frame")} />{T.layer_frame}</label>
          <label><input type="checkbox" checked={layers.water} onChange={() => toggleLayer("water")} />{T.layer_water}</label>
          <label><input type="checkbox" checked={brewAssemblyOn} onChange={toggleBrewAssembly} />{T.layer_brew_unit}</label>
          <label><input type="checkbox" checked={layers.waste} onChange={() => toggleLayer("waste")} />{T.layer_waste}</label>
          <label><input type="checkbox" checked={autoCamera} onChange={() => setAutoCamera(value => !value)} />{T.auto_follow}</label>
        </div>, partsTarget,
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
              {ownerLayout ? T.model_loading : DIGITAL_TWIN_MESSAGES.digital_twin_body_loading}
            </span>
          </div>
        </div>
      ) : null}

      {status === "ready" && !ownerLayout ? (
        <>
          <div
            role="status"
            aria-live="polite"
            className={styles.readyStatus}
          >
            {DIGITAL_TWIN_MESSAGES.digital_twin_body_ready}
          </div>
          {enableOperationTest && operationSource !== "external" ? (
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
              {ownerLayout ? T.model_error : DIGITAL_TWIN_MESSAGES.digital_twin_body_load_error}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className={styles.retryButton}
            >
              {ownerLayout ? T.model_retry : DIGITAL_TWIN_MESSAGES.digital_twin_retry}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
