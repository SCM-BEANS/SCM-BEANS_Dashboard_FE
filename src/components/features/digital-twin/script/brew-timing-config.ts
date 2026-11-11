import { DIGITAL_TWIN_OPERATION_STAGES } from "../operation/DigitalTwinOperationConfig";

// Recipe records do not contain real machine durations. These are playback estimates.
export const BREW_TIMING_ESTIMATES = {
  grindMsPerGram: 90,
  grindMinMs: 1_200,
  grindMaxMs: 4_000,
  extractionMsPerMl: 55,
  extractionMinMs: 2_000,
  extractionMaxMs: 7_000,
  waterMsPerMl: 40,
  waterMinMs: 600,
  waterMaxMs: 3_500,
  preinfusionMinMs: 100,
  preinfusionMaxMs: 30_000,
  milkMs: 950,
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function estimateGrindingDuration(grams: number) {
  return clamp(
    grams * BREW_TIMING_ESTIMATES.grindMsPerGram,
    BREW_TIMING_ESTIMATES.grindMinMs,
    BREW_TIMING_ESTIMATES.grindMaxMs,
  );
}

export function estimateExtractionDuration(millilitres: number) {
  return clamp(
    millilitres * BREW_TIMING_ESTIMATES.extractionMsPerMl,
    BREW_TIMING_ESTIMATES.extractionMinMs,
    BREW_TIMING_ESTIMATES.extractionMaxMs,
  );
}

export function estimateWaterDuration(millilitres: number) {
  return clamp(
    millilitres * BREW_TIMING_ESTIMATES.waterMsPerMl,
    BREW_TIMING_ESTIMATES.waterMinMs,
    BREW_TIMING_ESTIMATES.waterMaxMs,
  );
}

export function estimatePreinfusionDuration(seconds: number) {
  return clamp(
    seconds * 1_000,
    BREW_TIMING_ESTIMATES.preinfusionMinMs,
    BREW_TIMING_ESTIMATES.preinfusionMaxMs,
  );
}

export function estimateStageDuration(phase: "closing" | "tamping" | "opening" | "ejecting" | "scraping") {
  return DIGITAL_TWIN_OPERATION_STAGES.find((stage) => stage.phase === phase)?.durationMs ?? 1_000;
}
