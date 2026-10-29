export const DIGITAL_TWIN_PART_START = 0.18;
export const DIGITAL_TWIN_PART_SPAN = 0.19;
const CROSSFADE_HALF_WIDTH = 0.04;
const PART_TURN_RADIANS = (8 * Math.PI) / 180;

export const DIGITAL_TWIN_PART_NODES = [
  "Assem_HopCafe-1",
  "Assem_HeRaCafe-1",
  "Assem_HeNhiet02-1",
  "Assem_BangDien-1",
] as const;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function getWholeVisibility(progress: number) {
  return 1 - getPartEntrance(progress, 0);
}

export function getPartEntrance(progress: number, index: number) {
  const start = DIGITAL_TWIN_PART_START + index * DIGITAL_TWIN_PART_SPAN;
  const amount = clamp((progress - start + CROSSFADE_HALF_WIDTH) / (CROSSFADE_HALF_WIDTH * 2));
  return amount * amount * (3 - 2 * amount);
}

export function getPartVisibility(progress: number, index: number) {
  const fadeIn = getPartEntrance(progress, index);
  const fadeOut = index === DIGITAL_TWIN_PART_NODES.length - 1
    ? 1
    : 1 - getPartEntrance(progress, index + 1);
  return fadeIn * fadeOut;
}

export function getPartYaw(progress: number, index: number) {
  const start = DIGITAL_TWIN_PART_START + index * DIGITAL_TWIN_PART_SPAN;
  const localProgress = clamp((progress - start) / DIGITAL_TWIN_PART_SPAN);
  const eased = localProgress * localProgress * (3 - 2 * localProgress);
  return (eased * 2 - 1) * PART_TURN_RADIANS;
}
