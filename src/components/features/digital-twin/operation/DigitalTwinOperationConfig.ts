import type { DigitalTwinCyclePhase } from "@/schemas/digitalTwinCycle";

export type DigitalTwinOperationPhase = Exclude<
  DigitalTwinCyclePhase,
  "idle" | "complete" | "fault"
>;

export type DigitalTwinOperationStageLabelKey =
  | "digital_twin_operation_stage_grinding"
  | "digital_twin_operation_stage_dosing"
  | "digital_twin_operation_stage_closing"
  | "digital_twin_operation_stage_tamping"
  | "digital_twin_operation_stage_opening"
  | "digital_twin_operation_stage_ejecting"
  | "digital_twin_operation_stage_scraping"
  | "digital_twin_operation_stage_extraction";

export type DigitalTwinOperationNodeRoot = "body" | "cluster-03-display";

export interface DigitalTwinOperationNodeReference {
  root: DigitalTwinOperationNodeRoot;
  sourceName: string;
}

export interface DigitalTwinOperationMotionDefinition {
  runtime: "cluster-03";
  mainProgressRange: readonly [number, number];
  lowerProgressRange: readonly [number, number];
}

// Arc3 is the verified push segment before the main mechanism reaches Line1.
const CLUSTER_03_ARC_END_PROGRESS = 0.6196234683;
// Progress 1 is the verified bottom pose; the local demo uses 0.5 as the tamp/eject boundary.
const CLUSTER_03_TAMPING_END_PROGRESS = 0.5;

export interface DigitalTwinOperationStageDefinition {
  phase: DigitalTwinOperationPhase;
  labelKey: DigitalTwinOperationStageLabelKey;
  durationMs: number;
  activeNodes: readonly DigitalTwinOperationNodeReference[];
  hiddenOccluders: readonly DigitalTwinOperationNodeReference[];
  highlightColor: string;
  visualOnly: boolean;
  motion?: DigitalTwinOperationMotionDefinition;
}

export const DIGITAL_TWIN_OPERATION_STAGES: readonly DigitalTwinOperationStageDefinition[] = [
  {
    phase: "grinding",
    labelKey: "digital_twin_operation_stage_grinding",
    durationMs: 1600,
    activeNodes: [{ root: "body", sourceName: "Mayxoay1-1" }],
    hiddenOccluders: [{ root: "body", sourceName: "CV01_Mattrai-1" }],
    highlightColor: "#f59e0b",
    visualOnly: true,
  },
  {
    phase: "dosing",
    labelKey: "digital_twin_operation_stage_dosing",
    durationMs: 1100,
    activeNodes: [
      // body_may-1 is only the base mesh; Final is the aggregate Cluster 03 assembly.
      { root: "cluster-03-display", sourceName: "Final" },
    ],
    hiddenOccluders: [{ root: "body", sourceName: "CV05_Mattruoc-1" }],
    highlightColor: "#f59e0b",
    visualOnly: true,
  },
  {
    phase: "closing",
    labelKey: "digital_twin_operation_stage_closing",
    durationMs: 1200,
    activeNodes: [
      { root: "cluster-03-display", sourceName: "Final" },
    ],
    hiddenOccluders: [{ root: "body", sourceName: "CV05_Mattruoc-1" }],
    highlightColor: "#ef4444",
    visualOnly: false,
    motion: {
      runtime: "cluster-03",
      mainProgressRange: [0, 1],
      lowerProgressRange: [1, 1],
    },
  },
  {
    phase: "tamping",
    labelKey: "digital_twin_operation_stage_tamping",
    durationMs: 1600,
    activeNodes: [
      { root: "cluster-03-display", sourceName: "Final" },
    ],
    hiddenOccluders: [{ root: "body", sourceName: "CV05_Mattruoc-1" }],
    highlightColor: "#ef4444",
    visualOnly: false,
    motion: {
      runtime: "cluster-03",
      mainProgressRange: [1, 1],
      lowerProgressRange: [1, CLUSTER_03_TAMPING_END_PROGRESS],
    },
  },
  {
    phase: "extraction",
    labelKey: "digital_twin_operation_stage_extraction",
    durationMs: 2200,
    activeNodes: [{ root: "body", sourceName: "Assem_HeRaCafeV2-1" }],
    hiddenOccluders: [{ root: "body", sourceName: "CV05_Mattruoc-1" }],
    highlightColor: "#38bdf8",
    visualOnly: true,
  },
  {
    phase: "opening",
    labelKey: "digital_twin_operation_stage_opening",
    durationMs: 1100,
    activeNodes: [
      { root: "cluster-03-display", sourceName: "Final" },
    ],
    hiddenOccluders: [{ root: "body", sourceName: "CV05_Mattruoc-1" }],
    highlightColor: "#f97316",
    visualOnly: false,
    motion: {
      runtime: "cluster-03",
      mainProgressRange: [1, 0],
      lowerProgressRange: [CLUSTER_03_TAMPING_END_PROGRESS, CLUSTER_03_TAMPING_END_PROGRESS],
    },
  },
  {
    phase: "ejecting",
    labelKey: "digital_twin_operation_stage_ejecting",
    durationMs: 1300,
    activeNodes: [
      { root: "cluster-03-display", sourceName: "Final" },
    ],
    hiddenOccluders: [{ root: "body", sourceName: "CV05_Mattruoc-1" }],
    highlightColor: "#f97316",
    visualOnly: false,
    motion: {
      runtime: "cluster-03",
      mainProgressRange: [0, 0],
      lowerProgressRange: [CLUSTER_03_TAMPING_END_PROGRESS, 0],
    },
  },
  {
    phase: "scraping",
    labelKey: "digital_twin_operation_stage_scraping",
    durationMs: 2200,
    activeNodes: [
      { root: "cluster-03-display", sourceName: "Final" },
    ],
    hiddenOccluders: [{ root: "body", sourceName: "CV05_Mattruoc-1" }],
    highlightColor: "#f97316",
    visualOnly: false,
    motion: {
      runtime: "cluster-03",
      mainProgressRange: [0, CLUSTER_03_ARC_END_PROGRESS],
      lowerProgressRange: [0, 0],
    },
  },
];

export const DIGITAL_TWIN_OPERATION_PHASES = [
  "grinding",
  "dosing",
  "closing",
  "tamping",
  "extraction",
  "opening",
  "ejecting",
  "scraping",
] as const satisfies readonly DigitalTwinOperationPhase[];

export function validateDigitalTwinOperationConfig(
  stages: readonly DigitalTwinOperationStageDefinition[] =
    DIGITAL_TWIN_OPERATION_STAGES,
) {
  const phases = new Set<DigitalTwinOperationPhase>();

  for (const stage of stages) {
    if (phases.has(stage.phase)) {
      throw new Error(`Duplicate digital twin operation phase: ${stage.phase}.`);
    }
    phases.add(stage.phase);

    if (!Number.isFinite(stage.durationMs) || stage.durationMs <= 0) {
      throw new Error(
        `Digital twin operation phase ${stage.phase} must have a positive duration.`,
      );
    }

    if (stage.visualOnly && stage.motion) {
      throw new Error(
        `Digital twin operation phase ${stage.phase} is visual-only and cannot define motion.`,
      );
    }
    if (!stage.visualOnly && !stage.motion) {
      throw new Error(
        `Digital twin operation phase ${stage.phase} must define verified motion or be visual-only.`,
      );
    }

    if (stage.motion) {
      for (const [label, range] of [
        ["main", stage.motion.mainProgressRange],
        ["lower", stage.motion.lowerProgressRange],
      ] as const) {
        if (
          range.length !== 2 ||
          range.some(
            (value) => !Number.isFinite(value) || value < 0 || value > 1,
          )
        ) {
          throw new Error(
            `Digital twin operation phase ${stage.phase} has an invalid ${label} motion range.`,
          );
        }
      }
    }

    const activeTargets = new Set(
      stage.activeNodes.map((node) => `${node.root}:${node.sourceName}`),
    );
    const occluderOverlap = stage.hiddenOccluders.filter((node) =>
      activeTargets.has(`${node.root}:${node.sourceName}`),
    );
    if (occluderOverlap.length > 0) {
      throw new Error(
        `Digital twin operation phase ${stage.phase} cannot hide active node(s): ${occluderOverlap
          .map((node) => `${node.root}:${node.sourceName}`)
          .join(", ")}.`,
      );
    }
  }

  const expectedPhases: readonly DigitalTwinOperationPhase[] =
    DIGITAL_TWIN_OPERATION_PHASES;
  if (
    stages.length !== expectedPhases.length ||
    stages.some((stage, index) => stage.phase !== expectedPhases[index])
  ) {
    throw new Error(
      `Digital twin operation phases must be ordered ${expectedPhases.join(
        ", ",
      )}.`,
    );
  }

  return stages;
}

validateDigitalTwinOperationConfig();
