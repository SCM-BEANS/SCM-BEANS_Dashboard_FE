export const REVEAL_GROUPS = {
  hopper: { entryKey: "hat" },
  roofShell: { entry: "vo", re: /^CV04_Mattren/ },
  roofFrame: { entry: "khung", re: /^(HK03_TamTren|HK08_ThanhCodinhnap|HK09_Ganap|HK10_ThanhCodinhTruoc)/ },
  rightWall: { entry: "khung", re: /^HK05_TamR/ },
  leftShell: { entry: "vo", re: /^(CV01_Mattrai|Nap-\d)/ },
  rightShell: { entry: "vo", re: /^CV02_Matphai/ },
  hmi: { entryKey: "hmi" },
  grinder: { entryKey: "xoay" },
  boiler: { entryKey: "nhiet" },
  spout: { entryKey: "racafe" }
};

export const REVEAL_MOVES = [
  { group: "hopper", axis: "U", sign: 1, mm: 220, start: 3, end: 4.2 },
  { group: "roofShell", axis: "U", sign: 1, mm: 140, start: 3.5, end: 4.7 },
  { group: "roofFrame", axis: "U", sign: 1, mm: 90, start: 4.2, end: 5.2 },
  { group: "leftShell", axis: "L", sign: 1, mm: 200, start: 5.5, end: 6.6 },
  { group: "rightShell", axis: "L", sign: -1, mm: 200, start: 5.9, end: 7 },
  { group: "hmi", components: [{ axis: "F", sign: 1, mm: 140 }, { axis: "U", sign: 1, mm: 80 }], start: 6.6, end: 7.6 },
  { group: "grinder", axis: "U", sign: 1, mm: 130, start: 8, end: 9 },
  { group: "boiler", components: [{ axis: "L", sign: -1, mm: 160 }, { axis: "F", sign: -1, mm: 120 }], start: 8.5, end: 9.5 },
  { group: "spout", axis: "F", sign: 1, mm: 110, start: 9, end: 10 }
];

export const REVEAL_TIMES = {
  STUDIO: 2.8,
  OPEN: 3,
  SHELL_CLOSE: 19.5,
  COMPRESSOR_START: 11,
  COMPRESSOR_END: 15.5,
  WALL_FADE_START: 10.5,
  WALL_FADE_IN_END: 10.9,
  WALL_FADE_OUT_START: 15.6,
  WALL_FADE_END: 16,
  RETURN_START: 15.5,
  RETURN_END: 19.5,
  SCREEN_START: 19.5,
  SCREEN_DURATION: .6,
  END: 22,
  LOOP: 22
};

// The return moves overlap so each one keeps its 0.7 duration while fitting the four-second close.
const returnMoves = [...REVEAL_MOVES].reverse();
const returnDuration = move => (move.end - move.start) * .7;
const returnGap = (REVEAL_TIMES.RETURN_END - REVEAL_TIMES.RETURN_START - returnDuration(returnMoves.at(-1))) / (returnMoves.length - 1);
const returnWindows = new Map(returnMoves.map((move, index) => {
  const start = REVEAL_TIMES.RETURN_START + index * returnGap;
  return [move.group, [start, start + returnDuration(move)]];
}));
const easeInOutCubic = value => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const clamp = value => Math.max(0, Math.min(1, value));
const moveComponents = move => move.components || [{ axis: move.axis, sign: move.sign, mm: move.mm }];

export const REVEAL_SHOTS = [
  { at: 0, focus: ["hat"], az: 25, el: 30, distance: 1.8 },
  { at: 3, az: 30, el: 14, distance: 4.4 },
  { at: 5.5, az: 32, el: 30, distance: 4.3 },
  { at: 8, az: 0, el: 22, distance: 4.2, fitPadding: 1.08 },
  { at: 10.5, az: -35, el: 22, distance: 4.2, fitPadding: 1.08 },
  { at: 11, focus: ["nen"], az: -65, el: 40, distance: 2.6, fitPadding: 1.35 },
  { at: 15.5, focus: ["nen"], az: -65, el: 40, distance: 2.6, fitPadding: 1.35 },
  { at: 19.5, az: 30, el: 14, distance: 4.4 },
  { at: 22, az: 30, el: 14, distance: 4.4 }
];

export const REVEAL_AZ_LIMITS = [-75, 35];
export const REVEAL_CAMERA_CLEARANCE = .95;
export const clampRevealAzimuth = value => Math.max(REVEAL_AZ_LIMITS[0], Math.min(REVEAL_AZ_LIMITS[1], value));
export const REVEAL_FADES = [
  { group: "rightWall", opacity: .08, start: REVEAL_TIMES.WALL_FADE_START, fadeInEnd: REVEAL_TIMES.WALL_FADE_IN_END,
    fadeOutStart: REVEAL_TIMES.WALL_FADE_OUT_START, end: REVEAL_TIMES.WALL_FADE_END },
  { group: "rightShell", opacity: 0, start: REVEAL_TIMES.WALL_FADE_START, fadeInEnd: REVEAL_TIMES.WALL_FADE_IN_END,
    fadeOutStart: REVEAL_TIMES.WALL_FADE_OUT_START, end: REVEAL_TIMES.WALL_FADE_END }
];

export function opacityAt(group, seconds) {
  const fade = REVEAL_FADES.find(item => item.group === group);
  if (!fade || seconds < fade.start || seconds >= fade.end) return 1;
  if (seconds < fade.fadeInEnd) {
    const progress = easeInOutCubic(clamp((seconds - fade.start) / (fade.fadeInEnd - fade.start)));
    return 1 + (fade.opacity - 1) * progress;
  }
  if (seconds < fade.fadeOutStart) return fade.opacity;
  const progress = easeInOutCubic(clamp((seconds - fade.fadeOutStart) / (fade.end - fade.fadeOutStart)));
  return fade.opacity + (1 - fade.opacity) * progress;
}

export function offsetsAt(seconds) {
  const time = Math.max(0, Math.min(REVEAL_TIMES.END, seconds));
  const offsets = Object.fromEntries(Object.keys(REVEAL_GROUPS).map(group => [group, { F: 0, L: 0, U: 0 }]));
  for (const move of REVEAL_MOVES) {
    const [returnStart, returnEnd] = returnWindows.get(move.group);
    const opening = easeInOutCubic(clamp((time - move.start) / (move.end - move.start)));
    const closing = easeInOutCubic(clamp((time - returnStart) / (returnEnd - returnStart)));
    const progress = time < returnStart ? opening : 1 - closing;
    for (const component of moveComponents(move)) offsets[move.group][component.axis] += component.sign * component.mm * progress;
  }
  return offsets;
}
