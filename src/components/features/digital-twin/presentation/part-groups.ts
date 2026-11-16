export const PART_GROUP_NODE_PREFIXES = {
  shell: [
    "CV01_Mattrai-1",
    "CV03_Matsau-1",
    "CV04_Mattren-1",
    "CV05_Mattruoc-1",
  ],
  frame: [
    "body_may-1",
    "HK01_TamDe-1",
    "HK03_TamTren-1",
    "HK04_TamL-1",
    "HK05_TamR-1",
    "HK06_TamSau-1",
    "HK08_ThanhCodinhnap-1",
    "HK09_Ganap-1",
    "HK10_ThanhCodinhTruoc-1",
    "HK11_GaHeDauRa-1",
    "HK02_Chande-",
    "socket head cap screw_iso-",
    "pan head cross recess screw_iso-",
  ],
  hopper: ["Assem_HopCafe-1"],
  grinder: ["Mayxoay1-1", "Mayphacafe-1"],
  brewUnit: ["Final", "arm_right_1-1", "gac_coffee-1", "arm_left_1-1", "truc_nen-1", "arm_left_2-1", "oc_left-1", "truc_chinh-1", "arm_left_3-1", "gear_motor_chinh-1", "head_nen-1", "wiper_gear-1", "oc_right-1", "arm_right_3-1", "arm_right_2-1", "gear_motor_nen-1", "gear_nen-1", "box_nen-1"],
  output: ["Assem_HeRaCafe-1"],
  water: [
    "Assem_HeNhiet02-1",
    "BOILER-1",
    "ULKA EX5-1",
    "GA ULKA EX5-1",
    "GA ULKA EX5-2",
    "FlowMeter-1",
    "Assem01_BinhNuoc-1",
    "PSL601A-1",
    "DONGHO-1",
    "DauVaoNuoc-4",
  ],
  waste: ["Assem_Thungba-1", "Assem_CumThoatNuoc-1"],
  electrical: ["Assem_BangDien-1", "SUNON Fan 70x70x20 mm-2"],
} as const;

export type MappedPartGroupId = keyof typeof PART_GROUP_NODE_PREFIXES;
export type PartGroupId = MappedPartGroupId | "other";

export const PART_GROUP_IDS: readonly PartGroupId[] = [
  "shell",
  "frame",
  "hopper",
  "grinder",
  "brewUnit",
  "output",
  "water",
  "waste",
  "electrical",
  "other",
];

export const DEFAULT_PART_LAYERS: Readonly<Record<PartGroupId, boolean>> = {
  shell: true,
  frame: true,
  hopper: true,
  grinder: true,
  brewUnit: true,
  output: true,
  water: true,
  waste: true,
  electrical: false,
  other: true,
};

export interface DigitalTwinPresentation {
  focus: PartGroupId[];
  layers: Record<PartGroupId, boolean>;
  ghostShells: boolean;
  autoCamera: boolean;
  label?: { text: string; group: PartGroupId } | null;
  effects?: { water?: boolean; coffee?: boolean; grinderSpin?: boolean };
  active?: boolean;
  stepId?: string;
  /** Schematic phase pose, independent of the timed simulation player. */
  mechanismPose?: { main: number; lower: number };
  holdMechanism?: boolean;
  continuousEffects?: boolean;
}

export function getPartGroupForNodeName(name: string): PartGroupId {
  for (const [group, prefixes] of Object.entries(PART_GROUP_NODE_PREFIXES)) {
    if (prefixes.some((prefix) => name === prefix || name.startsWith(prefix))) {
      return group as MappedPartGroupId;
    }
  }
  return "other";
}

export function getPresentationOpacity(original: number, group: PartGroupId, focused: boolean, hasFocus: boolean) {
  if (!hasFocus) return original;
  if (focused) return 1;
  return original * (group === "shell" ? 0.08 : group === "frame" ? 0.4 : 0.72);
}
