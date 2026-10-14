export const WATER_FLOW_TEST_CONFIG = {
  effect: "water-flow" as const,
  // The independent prototype emits water continuously for ten seconds.
  durationMs: 10000,
  // Coffee-like flow: each droplet moves slowly through the full outlet path
  // while new droplets continue to emit during the ten-second run.
  particleTravelDurationMs: 2600,
  // More droplets keep both branches visually continuous without spawning
  // separate scene objects for every droplet.
  particleCount: 1024,
  seed: 271013,
  // Visual radii are ratios of the smallest measured DR08_CT8-1 dimension.
  // Keeping them relative prevents the water from overwhelming the nozzle.
  streamRadiusRatio: 0.075,
  particleRadiusRatio: 0.1,
  targetRadiusRatio: 0.14,
} as const;

export type WaterFlowTestConfig = typeof WATER_FLOW_TEST_CONFIG;
