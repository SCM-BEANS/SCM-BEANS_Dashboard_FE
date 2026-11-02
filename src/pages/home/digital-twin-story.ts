export const DIGITAL_TWIN_PART_START = 0.22;
export const DIGITAL_TWIN_PART_SPAN = 0.18;
export const DIGITAL_TWIN_PART_NODES = [
  "Assem_HopCafe-1",
  "Assem_HeRaCafe-1",
  "Assem_HeNhiet02-1",
  "Assem_BangDien-1",
] as const;

export const DIGITAL_TWIN_SHELL_NODES = [
  "CV01_Mattrai-1",
  "CV02_Matphai-1",
  "CV03_Matsau-1",
  "CV04_Mattren-1",
  "CV05_Mattruoc-1",
  "HK03_TamTren-1",
  "HK04_TamL-1",
  "HK05_TamR-1",
  "HK06_TamSau-1",
] as const;

export const clamp = (value: number) => Math.min(1, Math.max(0, value));
export function ease(value: number) {
  const amount = clamp(value);
  return amount * amount * (3 - 2 * amount);
}

export function getCutaway(progress: number) {
  return ease((progress - 0.08) / 0.08);
}

export function getFocusedPartIndex(progress: number) {
  if (progress < DIGITAL_TWIN_PART_START) return -1;
  return Math.min(DIGITAL_TWIN_PART_NODES.length - 1, Math.floor((progress - DIGITAL_TWIN_PART_START) / DIGITAL_TWIN_PART_SPAN));
}

export function getPartVisibility(progress: number, index: number) {
  return getFocusedPartIndex(progress) === index ? 1 : 0;
}

export function getWholeVisibility(progress: number) {
  return progress < DIGITAL_TWIN_PART_START ? 1 : 0;
}
