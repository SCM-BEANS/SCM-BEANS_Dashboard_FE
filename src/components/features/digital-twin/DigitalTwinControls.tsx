"use client";

import {
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useI18nStore } from "@/store/useI18nStore";
import { SUPPORTED_VIEW_MODES } from "./assembly/config.js";

const VIEW_MODE_LABEL_KEYS: Record<string, TranslationKey> = {
  assembly: "digital_twin_view_assembly",
  body: "digital_twin_view_body",
  piston: "digital_twin_view_piston",
  shaft: "digital_twin_view_shaft",
  nut: "digital_twin_view_nut",
  leftNut: "digital_twin_view_left_nut",
  rightArm: "digital_twin_view_right_arm",
  leftArm: "digital_twin_view_left_arm",
  spArmRight: "digital_twin_view_support_right",
  spArmLeft: "digital_twin_view_support_left",
  sp2ArmLeft: "digital_twin_view_support_left_2",
  sp2ArmRight: "digital_twin_view_support_right_2",
};

const buttonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

function pressedClassName(pressed: boolean) {
  return pressed
    ? "border-primary bg-primary text-on-primary"
    : "border-outline bg-surface text-on-surface hover:bg-surface-container";
}

interface ToggleButtonProps {
  label: string;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  icon?: ReactNode;
  describedBy?: string;
}

function ToggleButton({
  label,
  pressed,
  disabled,
  onClick,
  icon,
  describedBy,
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onClick}
      className={`${buttonClassName} ${pressedClassName(pressed)}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface HeldMotionButtonProps {
  direction: -1 | 1;
  label: string;
  pressed: boolean;
  disabled: boolean;
  onStart: (direction: -1 | 1) => void;
  onStop: () => void;
  describedBy: string;
}

function HeldMotionButton({
  direction,
  label,
  pressed,
  disabled,
  onStart,
  onStop,
  describedBy,
}: HeldMotionButtonProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key !== "Enter" && event.key !== " ") || event.repeat) return;
    event.preventDefault();
    onStart(direction);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onStop();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onStart(direction);
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-describedby={describedBy}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={onStop}
      onPointerCancel={onStop}
      onPointerLeave={onStop}
      onLostPointerCapture={onStop}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={onStop}
      className={`${buttonClassName} ${pressedClassName(pressed)} flex-1 touch-none`}
    >
      {direction < 0 ? <ArrowLeft aria-hidden="true" className="h-4 w-4" /> : null}
      <span>{label}</span>
      {direction > 0 ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
    </button>
  );
}

interface DigitalTwinControlsProps {
  ready: boolean;
  prefersReducedMotion: boolean;
  viewMode: string;
  onViewModeChange: (mode: string) => void;
  onCameraReset: () => void;
  markersVisible: boolean;
  onMarkersVisibleChange: (visible: boolean) => void;
  automaticMotion: boolean;
  onAutomaticMotionChange: (playing: boolean) => void;
  manualDirection: number;
  onManualStart: (direction: -1 | 1) => void;
  onManualStop: () => void;
  motionSpeed: number;
  onMotionSpeedChange: (speed: number) => void;
}

export function DigitalTwinControls({
  ready,
  prefersReducedMotion,
  viewMode,
  onViewModeChange,
  onCameraReset,
  markersVisible,
  onMarkersVisibleChange,
  automaticMotion,
  onAutomaticMotionChange,
  manualDirection,
  onManualStart,
  onManualStop,
  motionSpeed,
  onMotionSpeedChange,
}: DigitalTwinControlsProps) {
  const language = useI18nStore((state) => state.language);
  const t = useI18nStore((state) => state.t);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const controlsHelpId = "digital-twin-controls-help";
  const manualHelpId = "digital-twin-manual-help";

  return (
    <aside
      lang={language}
      aria-labelledby="digital-twin-controls-title"
      className="bento-border flex min-w-0 flex-col xl:h-[min(72vh,760px)] xl:overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
        <h2
          id="digital-twin-controls-title"
          className="text-base font-bold text-primary"
        >
          {t("digital_twin_controls")}
        </h2>
        <button
          type="button"
          aria-controls="digital-twin-controls-panel"
          aria-expanded={mobileExpanded}
          onClick={() => setMobileExpanded((expanded) => !expanded)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary xl:hidden"
        >
          <span>
            {mobileExpanded
              ? t("digital_twin_hide_controls")
              : t("digital_twin_show_controls")}
          </span>
          {mobileExpanded ? (
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
          ) : (
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>

      <div
        id="digital-twin-controls-panel"
        className={`${mobileExpanded ? "block" : "hidden"} min-h-0 flex-1 xl:block`}
      >
        <div className="space-y-4 p-4">
          {!ready ? (
            <p
              id={controlsHelpId}
              className="rounded-md bg-surface-container px-3 py-2 text-xs leading-relaxed text-on-surface-variant"
            >
              {t("digital_twin_controls_loading")}
            </p>
          ) : null}

          <fieldset className="space-y-3">
            <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {t("digital_twin_view_group")}
            </legend>
            <label
              htmlFor="digital-twin-view-mode"
              className="block text-sm font-medium text-on-surface"
            >
              {t("digital_twin_view_mode")}
            </label>
            <select
              id="digital-twin-view-mode"
              value={viewMode}
              disabled={!ready}
              aria-describedby={!ready ? controlsHelpId : undefined}
              onChange={(event) => onViewModeChange(event.currentTarget.value)}
              className="min-h-11 w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {SUPPORTED_VIEW_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(VIEW_MODE_LABEL_KEYS[mode] ?? "digital_twin_view_assembly")}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!ready}
              aria-describedby={!ready ? controlsHelpId : undefined}
              onClick={onCameraReset}
              className={`${buttonClassName} w-full border-outline bg-surface text-on-surface hover:bg-surface-container`}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              <span>{t("digital_twin_camera_reset")}</span>
            </button>
          </fieldset>

          <fieldset className="space-y-3 border-t border-outline-variant pt-4">
            <legend className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {t("digital_twin_links_group")}
            </legend>
            <ToggleButton
              label={t("digital_twin_link_markers")}
              pressed={markersVisible}
              disabled={!ready}
              describedBy={!ready ? controlsHelpId : undefined}
              icon={<Eye aria-hidden="true" className="h-4 w-4" />}
              onClick={() => onMarkersVisibleChange(!markersVisible)}
            />
          </fieldset>

          <fieldset className="space-y-3 border-t border-outline-variant pt-4">
            <legend className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {t("digital_twin_motion")}
            </legend>
            <ToggleButton
              label={t("digital_twin_auto_motion")}
              pressed={automaticMotion}
              disabled={!ready || prefersReducedMotion}
              describedBy={
                prefersReducedMotion
                  ? "digital-twin-reduced-motion-help"
                  : !ready
                    ? controlsHelpId
                    : undefined
              }
              icon={automaticMotion ? (
                <Pause aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Play aria-hidden="true" className="h-4 w-4" />
              )}
              onClick={() => onAutomaticMotionChange(!automaticMotion)}
            />
            {prefersReducedMotion ? (
              <p
                id="digital-twin-reduced-motion-help"
                className="text-xs leading-relaxed text-on-surface-variant"
              >
                {t("digital_twin_reduced_motion_help")}
              </p>
            ) : null}

            <label
              htmlFor="digital-twin-motion-speed"
              className="flex items-center justify-between gap-3 text-sm font-medium text-on-surface"
            >
              <span>{t("digital_twin_motion_speed")}</span>
              <output htmlFor="digital-twin-motion-speed" className="tabular-nums text-on-surface-variant">
                {Number.isInteger(motionSpeed)
                  ? motionSpeed.toFixed(1)
                  : motionSpeed.toFixed(2)}×
              </output>
            </label>
            <input
              id="digital-twin-motion-speed"
              type="range"
              min="0.25"
              max="2"
              step="0.25"
              value={motionSpeed}
              disabled={!ready}
              aria-describedby={!ready ? controlsHelpId : undefined}
              onChange={(event) => onMotionSpeedChange(Number(event.currentTarget.value))}
              className="h-11 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-on-surface">
                {t("digital_twin_manual_motion")}
              </p>
              <div className="flex gap-2">
                <HeldMotionButton
                  direction={-1}
                  label={t("digital_twin_manual_reverse")}
                  pressed={manualDirection === -1}
                  disabled={!ready}
                  onStart={onManualStart}
                  onStop={onManualStop}
                  describedBy={manualHelpId}
                />
                <HeldMotionButton
                  direction={1}
                  label={t("digital_twin_manual_forward")}
                  pressed={manualDirection === 1}
                  disabled={!ready}
                  onStart={onManualStart}
                  onStop={onManualStop}
                  describedBy={manualHelpId}
                />
              </div>
              <p id={manualHelpId} className="text-xs leading-relaxed text-on-surface-variant">
                {t("digital_twin_manual_help")}
              </p>
            </div>
          </fieldset>

        </div>
      </div>
    </aside>
  );
}
