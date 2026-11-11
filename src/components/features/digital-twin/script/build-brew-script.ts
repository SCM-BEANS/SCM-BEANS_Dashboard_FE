import type { DigitalTwinCyclePhase } from "@/schema/digital-twin-cycle.schema";
import { DIGITAL_TWIN_RECIPE_TWIN_MESSAGES as T } from "@/text/digital-twin/digital-twin-messages";
import type { PartGroupId } from "../presentation/part-groups";
import {
  estimateExtractionDuration,
  estimateGrindingDuration,
  estimatePreinfusionDuration,
  estimateStageDuration,
  estimateWaterDuration,
  BREW_TIMING_ESTIMATES,
} from "./brew-timing-config";
import type { ParsedProcedureStep } from "./parse-procedure";

export type BrewScriptStepKind =
  | "water"
  | "milk"
  | "grind"
  | "dose"
  | "close"
  | "tamp"
  | "hold-tamp"
  | "preinfuse"
  | "bloom"
  | "extract"
  | "dry-tamp"
  | "open"
  | "eject"
  | "return";

export interface BrewScriptEffects {
  water?: boolean;
  coffee?: boolean;
  grinderSpin?: boolean;
}

export interface BrewScriptStep {
  id: string;
  kind: BrewScriptStepKind;
  label: string;
  valueText?: string;
  durationMs: number;
  phase?: DigitalTwinCyclePhase;
  motionHold?: boolean;
  focus: PartGroupId[];
  effects: BrewScriptEffects;
  /** Hold motion phases at their final pose for the whole step. */
  motionProgress?: number;
}

export interface BrewScript {
  id: string;
  name: string;
  steps: BrewScriptStep[];
}

const DEFAULT_DOSE_GRAMS = 18;
const DEFAULT_EXTRACTION_ML = 40;
const DEFAULT_TAMP_PERCENT = 100;
const LABELS = {
  grind: T.step_grind,
  dose: T.step_dose,
  close: T.step_close,
  tamp: T.step_tamp,
  holdTamp: T.step_hold_tamp,
  preinfuse: T.step_preinfuse,
  bloom: T.step_bloom,
  extract: T.step_extract,
  dryTamp: T.step_dry_tamp,
  open: T.step_open,
  eject: T.step_eject,
  return: T.step_return,
  water: T.step_water,
  milk: T.step_milk,
} as const;

function numericValue(step: ParsedProcedureStep, fallback: number) {
  return step.value !== null && Number.isFinite(step.value) ? step.value : fallback;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function makeStep(
  id: string,
  kind: BrewScriptStepKind,
  label: string,
  durationMs: number,
  options: Partial<Pick<BrewScriptStep, "valueText" | "phase" | "motionHold" | "focus" | "effects" | "motionProgress">> = {},
): BrewScriptStep {
  return {
    id,
    kind,
    label,
    durationMs: Math.max(1, Math.round(durationMs)),
    focus: options.focus ?? [],
    effects: options.effects ?? {},
    ...options,
  };
}

export function buildBrewScript(
  procedure: readonly ParsedProcedureStep[],
  name: string,
): BrewScript {
  const steps: BrewScriptStep[] = [];
  let hasDose = false;
  let closingAdded = false;

  const addClosing = () => {
    if (closingAdded) return;
    closingAdded = true;
    steps.push(makeStep("closing", "close", LABELS.close, estimateStageDuration("closing"), {
      phase: "closing",
      focus: ["brewUnit"],
    }));
  };

  procedure.forEach((item, index) => {
    const id = item.directive.toLowerCase() + "-" + index;
    switch (item.directive) {
      case "PREWATER":
      case "POSTWATER": {
        const ml = numericValue(item, 30);
        steps.push(makeStep(id, "water", LABELS.water, estimateWaterDuration(ml), {
          valueText: formatNumber(ml) + " ml",
          focus: ["water", "output"],
          effects: { water: true },
          motionHold: true,
        }));
        break;
      }
      case "PREMILK":
      case "POSTMILK":
        steps.push(makeStep(id, "milk", LABELS.milk, BREW_TIMING_ESTIMATES.milkMs));
        break;
      case "DOSE": {
        const grams = numericValue(item, DEFAULT_DOSE_GRAMS);
        hasDose = true;
        steps.push(makeStep(id + "-grind", "grind", LABELS.grind, estimateGrindingDuration(grams), {
          valueText: formatNumber(grams) + " g",
          phase: "grinding",
          focus: ["hopper", "grinder"],
          effects: { grinderSpin: true },
        }));
        steps.push(makeStep(id + "-dose", "dose", LABELS.dose, 1_100, {
          valueText: formatNumber(grams) + " g",
          phase: "dosing",
          focus: ["brewUnit"],
          effects: { coffee: true },
        }));
        addClosing();
        break;
      }
      case "TAMP": {
        const percent = numericValue(item, DEFAULT_TAMP_PERCENT);
        steps.push(makeStep(id, "tamp", LABELS.tamp, estimateStageDuration("tamping"), {
          valueText: formatNumber(percent) + "%",
          phase: "tamping",
          focus: ["brewUnit"],
        }));
        break;
      }
      case "HOLDTAMP": {
        const percent = numericValue(item, 50);
        steps.push(makeStep(id, "hold-tamp", LABELS.holdTamp, estimateStageDuration("tamping"), {
          valueText: formatNumber(percent) + "%",
          phase: "tamping",
          motionHold: true,
          motionProgress: 1,
          focus: ["brewUnit"],
        }));
        break;
      }
      case "PREINFUSE":
      case "BLOOM": {
        const seconds = numericValue(item, 0);
        const kind = item.directive === "PREINFUSE" ? "preinfuse" : "bloom";
        steps.push(makeStep(id, kind, item.directive === "PREINFUSE" ? LABELS.preinfuse : LABELS.bloom, estimatePreinfusionDuration(seconds), {
          valueText: formatNumber(seconds) + " s",
          focus: ["water", "brewUnit"],
          effects: { water: true },
          motionHold: true,
        }));
        break;
      }
      case "EXTRACT": {
        const ml = numericValue(item, DEFAULT_EXTRACTION_ML);
        steps.push(makeStep(id, "extract", LABELS.extract, estimateExtractionDuration(ml), {
          valueText: formatNumber(ml) + " ml",
          phase: "extraction",
          focus: ["water", "brewUnit", "output"],
          effects: { water: true, coffee: true },
          motionHold: true,
        }));
        break;
      }
      case "DRYTAMP":
        steps.push(makeStep(id, "dry-tamp", LABELS.dryTamp, estimateStageDuration("tamping"), {
          phase: "tamping",
          focus: ["brewUnit"],
          motionHold: true,
          motionProgress: 1,
        }));
        break;
      default:
        break;
    }
  });

  // A minimal or older script still gets the standard dose/tamp/extract body.
  if (!hasDose && procedure.length === 0) {
    steps.push(makeStep("default-grind", "grind", LABELS.grind, estimateGrindingDuration(DEFAULT_DOSE_GRAMS), {
      valueText: DEFAULT_DOSE_GRAMS + " g",
      phase: "grinding",
      focus: ["hopper", "grinder"],
      effects: { grinderSpin: true },
    }));
    steps.push(makeStep("default-dose", "dose", LABELS.dose, 1_100, {
      valueText: DEFAULT_DOSE_GRAMS + " g",
      phase: "dosing",
      focus: ["brewUnit"],
      effects: { coffee: true },
    }));
    hasDose = true;
    addClosing();
    steps.push(makeStep("default-tamp", "tamp", LABELS.tamp, estimateStageDuration("tamping"), {
      valueText: DEFAULT_TAMP_PERCENT + "%",
      phase: "tamping",
      focus: ["brewUnit"],
    }));
    steps.push(makeStep("default-extract", "extract", LABELS.extract, estimateExtractionDuration(DEFAULT_EXTRACTION_ML), {
      valueText: DEFAULT_EXTRACTION_ML + " ml",
      phase: "extraction",
      focus: ["water", "brewUnit", "output"],
      effects: { water: true, coffee: true },
      motionHold: true,
    }));
  }

  if (!closingAdded && hasDose) addClosing();
  steps.push(makeStep("tail-open", "open", LABELS.open, estimateStageDuration("opening"), {
    phase: "opening",
    focus: ["brewUnit"],
  }));
  steps.push(makeStep("tail-eject", "eject", LABELS.eject, estimateStageDuration("ejecting"), {
    phase: "ejecting",
    focus: ["brewUnit", "waste"],
  }));
  steps.push(makeStep("tail-return", "return", LABELS.return, estimateStageDuration("scraping"), {
    phase: "scraping",
    focus: ["brewUnit", "waste"],
  }));

  return {
    id: name.trim().toLocaleLowerCase("vi-VN") + ":" + steps.map((step) => step.id).join(","),
    name,
    steps,
  };
}

export function buildDefaultBrewScript() {
  return buildBrewScript([
    { directive: "DOSE", value: 18 },
    { directive: "TAMP", value: 100 },
    { directive: "EXTRACT", value: 40 },
  ], T.recipe_default_missing);
}
