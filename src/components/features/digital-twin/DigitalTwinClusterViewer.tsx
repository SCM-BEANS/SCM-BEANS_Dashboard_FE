"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useState, type ReactNode } from "react";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useI18nStore } from "@/store/useI18nStore";

const DigitalTwinClusterCanvas = dynamic(
  () => import("./DigitalTwinClusterCanvas"),
  { ssr: false, loading: () => null },
);

type ViewerStatus = "loading" | "ready" | "error";
const OC_LEFT_CAM_STEP = 0.05;

export interface DigitalTwinClusterViewerProps {
  modelUrls: readonly string[];
  rootFrameUrl?: string;
  motionDefinitionUrl?: string;
  motionDefinitionUrls?: readonly string[];
  isolateNodeName?: string;
  motionNodeName?: string;
  canvasLabelKey: TranslationKey;
  loadingKey: TranslationKey;
  readyKey: TranslationKey;
  loadErrorKey: TranslationKey;
  showOcLeftCamControls?: boolean;
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

export function DigitalTwinClusterViewer({
  modelUrls,
  rootFrameUrl,
  motionDefinitionUrl,
  motionDefinitionUrls,
  isolateNodeName,
  motionNodeName,
  canvasLabelKey,
  loadingKey,
  readyKey,
  loadErrorKey,
  showOcLeftCamControls = false,
}: DigitalTwinClusterViewerProps) {
  const t = useI18nStore((state) => state.t);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [cameraResetVersion, setCameraResetVersion] = useState(0);
  const [mainDriveProgress, setMainDriveProgress] = useState(0);
  const [lowerDriveProgress, setLowerDriveProgress] = useState(0);
  const [ocLeftCamVisible, setOcLeftCamVisible] = useState(true);
  const [mainAutoMotion, setMainAutoMotion] = useState(false);
  const [lowerAutoMotion, setLowerAutoMotion] = useState(false);

  const handleLoadStart = useCallback(() => setStatus("loading"), []);
  const handleReady = useCallback(() => setStatus("ready"), []);
  const handleError = useCallback(() => setStatus("error"), []);
  const handleRetry = useCallback(() => {
    setStatus("loading");
    setZoomLevel(0);
    setMainDriveProgress(0);
    setLowerDriveProgress(0);
    setMainAutoMotion(false);
    setLowerAutoMotion(false);
    setAttempt((current) => current + 1);
  }, []);
  const handleReset = useCallback(() => {
    setZoomLevel(0);
    setMainDriveProgress(0);
    setLowerDriveProgress(0);
    setMainAutoMotion(false);
    setLowerAutoMotion(false);
    setCameraResetVersion((version) => version + 1);
  }, []);
  const moveMainDrive = useCallback((delta: number) => {
    setMainDriveProgress((progress) =>
      Math.max(0, Math.min(1, progress + delta)),
    );
  }, []);
  const moveLowerDrive = useCallback((delta: number) => {
    setLowerDriveProgress((progress) =>
      Math.max(0, Math.min(1, progress + delta)),
    );
  }, []);

  return (
    <div className="relative isolate h-[min(62vh,700px)] min-h-[320px] overflow-hidden bento-border bg-surface-container md:min-h-[380px]">
      <CanvasErrorBoundary key={attempt} onError={handleError}>
        <DigitalTwinClusterCanvas
          modelUrls={modelUrls}
          rootFrameUrl={rootFrameUrl}
          motionDefinitionUrl={motionDefinitionUrl}
          motionDefinitionUrls={motionDefinitionUrls}
          isolateNodeName={isolateNodeName}
          motionNodeName={motionNodeName}
          onLoadStart={handleLoadStart}
          onReady={handleReady}
          onError={handleError}
          canvasLabel={t(canvasLabelKey)}
          cameraResetVersion={cameraResetVersion}
          zoomLevel={zoomLevel}
          mainDriveProgress={mainDriveProgress}
          lowerDriveProgress={lowerDriveProgress}
          ocLeftCamVisible={ocLeftCamVisible}
          mainAutoMotion={mainAutoMotion}
          lowerAutoMotion={lowerAutoMotion}
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

      {showOcLeftCamControls ? (
        <div className="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col gap-2 rounded-lg border border-outline-variant bg-surface/90 p-2 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-semibold text-on-surface">
            {t("digital_twin_oc_left_cam")}
          </p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              aria-label={t("digital_twin_oc_left_cam_back")}
              title={t("digital_twin_oc_left_cam_back")}
              disabled={status !== "ready" || mainDriveProgress <= 0}
              onClick={() => moveMainDrive(-OC_LEFT_CAM_STEP)}
              className="min-h-10 min-w-10 rounded-md border border-outline-variant px-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Main -
            </button>
            <button
              type="button"
              aria-label={t("digital_twin_oc_left_cam_forward")}
              title={t("digital_twin_oc_left_cam_forward")}
              disabled={status !== "ready" || mainDriveProgress >= 1}
              onClick={() => moveMainDrive(OC_LEFT_CAM_STEP)}
              className="min-h-10 min-w-10 rounded-md border border-outline-variant px-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Main +
            </button>
            <button
              type="button"
              aria-label={t("digital_twin_oc_left_cam_auto")}
              title={t("digital_twin_oc_left_cam_auto")}
              disabled={status !== "ready"}
              aria-pressed={mainAutoMotion}
              onClick={() => setMainAutoMotion((playing) => !playing)}
              className="min-h-10 min-w-10 rounded-md border border-outline-variant px-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Auto
            </button>
            <button
              type="button"
              aria-label={
                t(
                  ocLeftCamVisible
                    ? "digital_twin_oc_left_cam_hide"
                    : "digital_twin_oc_left_cam_show",
                )
              }
              title={
                t(
                  ocLeftCamVisible
                    ? "digital_twin_oc_left_cam_hide"
                    : "digital_twin_oc_left_cam_show",
                )
              }
              disabled={status !== "ready"}
              aria-pressed={ocLeftCamVisible}
              onClick={() => setOcLeftCamVisible((visible) => !visible)}
              className="min-h-10 min-w-10 rounded-md border border-outline-variant px-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Line
            </button>
            <button
              type="button"
              aria-label={t("digital_twin_oc_left_cam_reset")}
              title={t("digital_twin_oc_left_cam_reset")}
              disabled={status !== "ready"}
              onClick={handleReset}
              className="min-h-10 rounded-md border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] tabular-nums text-on-surface-variant">
            {t("digital_twin_main_drive_progress")}: {Math.round(mainDriveProgress * 100)}%
          </p>
          <p className="text-xs font-semibold text-on-surface">
            {t("digital_twin_lower_drive")}
          </p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              aria-label={t("digital_twin_lower_drive_back")}
              title={t("digital_twin_lower_drive_back")}
              disabled={status !== "ready" || lowerDriveProgress <= 0}
              onClick={() => moveLowerDrive(-OC_LEFT_CAM_STEP)}
              className="min-h-10 min-w-10 rounded-md border border-outline-variant px-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Lower -
            </button>
            <button
              type="button"
              aria-label={t("digital_twin_lower_drive_forward")}
              title={t("digital_twin_lower_drive_forward")}
              disabled={status !== "ready" || lowerDriveProgress >= 1}
              onClick={() => moveLowerDrive(OC_LEFT_CAM_STEP)}
              className="min-h-10 min-w-10 rounded-md border border-outline-variant px-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Lower +
            </button>
            <button
              type="button"
              aria-label={t("digital_twin_lower_drive_auto")}
              title={t("digital_twin_lower_drive_auto")}
              disabled={status !== "ready"}
              aria-pressed={lowerAutoMotion}
              onClick={() => setLowerAutoMotion((playing) => !playing)}
              className="min-h-10 min-w-10 rounded-md border border-outline-variant px-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Auto
            </button>
          </div>
          <p className="text-[11px] tabular-nums text-on-surface-variant">
            {t("digital_twin_lower_drive_progress")}: {Math.round(lowerDriveProgress * 100)}%
          </p>
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
              {t(loadingKey)}
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
          {t(readyKey)}
        </div>
      ) : null}

      {status === "error" ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-6"
          role="alert"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-sm text-on-surface">
              {t(loadErrorKey)}
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
