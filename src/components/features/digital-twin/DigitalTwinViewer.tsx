"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18nStore } from "@/store/useI18nStore";
import { DigitalTwinControls } from "./DigitalTwinControls";
import type { DigitalTwinAssemblyController } from "./DigitalTwinCanvas";

const DigitalTwinCanvas = dynamic(() => import("./DigitalTwinCanvas"), {
  ssr: false,
  loading: () => null,
});

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

export function DigitalTwinViewer() {
  const language = useI18nStore((state) => state.language);
  const t = useI18nStore((state) => state.t);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [viewMode, setViewMode] = useState("assembly");
  const [cameraResetVersion, setCameraResetVersion] = useState(0);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [automaticMotion, setAutomaticMotion] = useState(false);
  const [manualDirection, setManualDirection] = useState(0);
  const [motionSpeed, setMotionSpeed] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const assemblyRef = useRef<DigitalTwinAssemblyController | null>(null);
  const reducedMotionRef = useRef(false);

  const syncAssemblyState = useCallback((assembly: DigitalTwinAssemblyController) => {
    const state = assembly.getState();
    setViewMode(state.viewMode ?? "assembly");
    setMarkersVisible(Boolean(state.debugVisible));
    setAutomaticMotion(Boolean(state.animationPlaying));
    setMotionSpeed(state.animationSpeed ?? 1);
    setManualDirection(state.manualDirection ?? 0);
  }, []);

  const handleAssemblyCreated = useCallback((assembly: DigitalTwinAssemblyController | null) => {
    assemblyRef.current = assembly;
    if (!assembly) return;

    // Keep mechanical motion stopped until a user explicitly starts it.
    assembly.setAnimationPlaying(false);
    assembly.setManualDirection(0);
    syncAssemblyState(assembly);
  }, [syncAssemblyState]);

  const handleLoadStart = useCallback(() => setStatus("loading"), []);
  const handleReady = useCallback(() => {
    const assembly = assemblyRef.current;
    if (assembly) {
      if (reducedMotionRef.current) {
        assembly.setAnimationPlaying(false);
      }
      syncAssemblyState(assembly);
    }
    setStatus("ready");
  }, [syncAssemblyState]);
  const handleError = useCallback(() => setStatus("error"), []);
  const handleRetry = useCallback(() => {
    setStatus("loading");
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = mediaQuery.matches;
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    const assembly = assemblyRef.current;
    assembly?.setAnimationPlaying(false);
    assembly?.setManualDirection(0);
    setAutomaticMotion(false);
    setManualDirection(0);
  }, [prefersReducedMotion]);

  const handleWindowBlur = useCallback(() => {
    assemblyRef.current?.setManualDirection(0);
    setManualDirection(0);
  }, []);

  useEffect(() => {
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [handleWindowBlur]);

  const handleViewModeChange = useCallback((mode: string) => {
    const assembly = assemblyRef.current;
    if (!assembly) return;
    assembly.setViewMode(mode);
    setViewMode(mode);
  }, []);

  const handleCameraReset = useCallback(() => {
    setCameraResetVersion((version) => version + 1);
  }, []);

  const handleMarkersVisibleChange = useCallback((visible: boolean) => {
    assemblyRef.current?.setDebugVisible(visible);
    setMarkersVisible(visible);
  }, []);

  const handleAutomaticMotionChange = useCallback((playing: boolean) => {
    if (playing && reducedMotionRef.current) return;
    const assembly = assemblyRef.current;
    if (!assembly) return;
    assembly.setManualDirection(0);
    assembly.setAnimationPlaying(playing);
    setManualDirection(0);
    setAutomaticMotion(playing);
  }, []);

  const handleManualStart = useCallback((direction: -1 | 1) => {
    const assembly = assemblyRef.current;
    if (!assembly) return;
    assembly.setAnimationPlaying(false);
    assembly.setManualDirection(direction);
    setAutomaticMotion(false);
    setManualDirection(direction);
  }, []);

  const handleManualStop = useCallback(() => {
    assemblyRef.current?.setManualDirection(0);
    setManualDirection(0);
  }, []);

  const handleMotionSpeedChange = useCallback((speed: number) => {
    assemblyRef.current?.setAnimationSpeed(speed);
    setMotionSpeed(speed);
  }, []);

  return (
    <div lang={language} className="min-w-0" aria-labelledby="digital-twin-tab-mechanism">
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="relative isolate h-[min(58vh,520px)] min-h-[320px] overflow-hidden bento-border bg-surface-container xl:h-[min(72vh,760px)] xl:min-h-[420px]">
          <CanvasErrorBoundary key={attempt} onError={handleError}>
            <DigitalTwinCanvas
              onLoadStart={handleLoadStart}
              onReady={handleReady}
              onError={handleError}
              onAssemblyCreated={handleAssemblyCreated}
              cameraResetVersion={cameraResetVersion}
              canvasLabel={t("digital_twin_canvas_label")}
            />
          </CanvasErrorBoundary>

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
                  {t("digital_twin_loading")}
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
              {t("digital_twin_ready")}
            </div>
          ) : null}

          {status === "error" ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-6"
              role="alert"
            >
              <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                <p className="text-sm text-on-surface">{t("digital_twin_load_error")}</p>
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

        <DigitalTwinControls
          ready={status === "ready"}
          prefersReducedMotion={prefersReducedMotion}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onCameraReset={handleCameraReset}
          markersVisible={markersVisible}
          onMarkersVisibleChange={handleMarkersVisibleChange}
          automaticMotion={automaticMotion}
          onAutomaticMotionChange={handleAutomaticMotionChange}
          manualDirection={manualDirection}
          onManualStart={handleManualStart}
          onManualStop={handleManualStop}
          motionSpeed={motionSpeed}
          onMotionSpeedChange={handleMotionSpeedChange}
        />
      </div>
    </div>
  );
}
