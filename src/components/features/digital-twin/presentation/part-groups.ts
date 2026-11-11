export const PART_GROUP_NODE_PREFIXES = {
  shell: [
    "CV01_Mattrai-1",
    "CV03_Matsau-1",
    "CV04_Mattren-1",
    "CV05_Mattruoc-1",
  ],
  frame: [
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
  brewUnit: ["Final"],
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
}

export function getPartGroupForNodeName(name: string): PartGroupId {
  for (const [group, prefixes] of Object.entries(PART_GROUP_NODE_PREFIXES)) {
    if (prefixes.some((prefix) => name === prefix || name.startsWith(prefix))) {
      return group as MappedPartGroupId;
    }
  }
  return "other";
}
