import type { DigitalTwinCyclePhase } from "@/schema/digital-twin-cycle.schema";
import { DIGITAL_TWIN_LIVE_MESSAGES as T } from "@/text/digital-twin/digital-twin-messages";

export type LiveBrewStep =
  | "heating"
  | "grinding"
  | "closing"
  | "tamping"
  | "extraction"
  | "opening"
  | "ejecting"
  | "returning"
  | "done"
  | "milk";

export interface MappedBrewState {
  key: string;
  label: string;
  phase: DigitalTwinCyclePhase | null;
  step: LiveBrewStep | null;
  fault: boolean;
}

export const LIVE_BREW_STEPS: readonly {
  key: Exclude<LiveBrewStep, "milk">;
  label: string;
}[] = [
  { key: "heating", label: T.digital_twin_live_steps_heating },
  { key: "grinding", label: T.digital_twin_live_steps_grinding },
  { key: "closing", label: T.digital_twin_live_steps_closing },
  { key: "tamping", label: T.digital_twin_live_steps_tamping },
  { key: "extraction", label: T.digital_twin_live_steps_extraction },
  { key: "opening", label: T.digital_twin_live_steps_opening },
  { key: "ejecting", label: T.digital_twin_live_steps_ejecting },
  { key: "returning", label: T.digital_twin_live_steps_returning },
  { key: "done", label: T.digital_twin_live_steps_done },
];

const unknownState: Omit<MappedBrewState, "key"> = {
  label: T.digital_twin_live_state_unknown,
  phase: "idle",
  step: null,
  fault: false,
};

const mappedStates: Record<string, Omit<MappedBrewState, "key">> = {
  IDLE: {
    label: T.digital_twin_live_state_idle,
    phase: "idle",
    step: null,
    fault: false,
  },
  UNKNOWN: unknownState,
  UNSPECIFIED: unknownState,
  CHECKING_TEMPERATURE: {
    label: T.digital_twin_live_state_checking_temperature,
    phase: "idle",
    step: "heating",
    fault: false,
  },
  HEATING: {
    label: T.digital_twin_live_state_heating,
    phase: "idle",
    step: "heating",
    fault: false,
  },
  CHECKING_ERRORS: {
    label: T.digital_twin_live_state_checking_errors,
    phase: "idle",
    step: "heating",
    fault: false,
  },
  GRINDING: {
    label: T.digital_twin_live_state_grinding,
    phase: "grinding",
    step: "grinding",
    fault: false,
  },
  CLOSE_CHAMBER_LID: {
    label: T.digital_twin_live_state_close_chamber_lid,
    phase: "closing",
    step: "closing",
    fault: false,
  },
  TAMPING_ACCORDING_TO_RECIPE: {
    label: T.digital_twin_live_state_tamping,
    phase: "tamping",
    step: "tamping",
    fault: false,
  },
  DRY_TAMP: {
    label: T.digital_twin_live_state_dry_tamp,
    phase: "tamping",
    step: "tamping",
    fault: false,
  },
  PRE_INFUSION: {
    label: T.digital_twin_live_state_pre_infusion,
    phase: "extraction",
    step: "extraction",
    fault: false,
  },
  MAIN_EXTRACTION: {
    label: T.digital_twin_live_state_main_extraction,
    phase: "extraction",
    step: "extraction",
    fault: false,
  },
  OPEN_CHAMBER_LID: {
    label: T.digital_twin_live_state_open_chamber_lid,
    phase: "opening",
    step: "opening",
    fault: false,
  },
  EJECT_GROUNDS_1: {
    label: T.digital_twin_live_state_eject_grounds,
    phase: "ejecting",
    step: "ejecting",
    fault: false,
  },
  EJECT_GROUNDS_2: {
    label: T.digital_twin_live_state_eject_grounds,
    phase: "ejecting",
    step: "ejecting",
    fault: false,
  },
  RETURN_TO_NEUTRAL_1: {
    label: T.digital_twin_live_state_return_to_neutral,
    phase: "scraping",
    step: "returning",
    fault: false,
  },
  RETURN_TO_NEUTRAL_2: {
    label: T.digital_twin_live_state_return_to_neutral,
    phase: "scraping",
    step: "returning",
    fault: false,
  },
  RETURN_TO_NEUTRAL_3: {
    label: T.digital_twin_live_state_return_to_neutral,
    phase: "scraping",
    step: "returning",
    fault: false,
  },
  STARTING_MILK: {
    label: T.digital_twin_live_state_starting_milk,
    phase: "idle",
    step: "milk",
    fault: false,
  },
  WAITING_FOR_MILK: {
    label: T.digital_twin_live_state_waiting_for_milk,
    phase: "idle",
    step: "milk",
    fault: false,
  },
  COMPLETE: {
    label: T.digital_twin_live_state_complete,
    phase: "complete",
    step: "done",
    fault: false,
  },
  ERROR: {
    label: T.digital_twin_live_state_error,
    phase: "fault",
    step: null,
    fault: true,
  },
};

export function mapBrewState(raw: string | null | undefined): MappedBrewState {
  const normalized = raw?.trim().toUpperCase().replace(/^BREW_STATE_/, "");
  const state = normalized ? mappedStates[normalized] : undefined;
  return {
    key: state ? normalized! : normalized || "UNKNOWN",
    ...(state ?? unknownState),
  };
}
