import {
  MaterialEffectCoffeeConfigSchema,
  MaterialEffectOutletReferenceSchema,
  MaterialEffectSketch18CalibrationSchema,
  MaterialEffectSurfaceTargetSchema,
  type MaterialEffectOutletReference,
} from "@/schemas/digitalTwinMaterialEffects";

export const MAYXOAY_MODEL_URL =
  "/models/digital-twin/cluster-02/may_xoay.glb";

export const MAYXOAY_PRESENTATION_ROTATION_Y = Math.PI;

export const MAYXOAY_COFFEE_OUTLET_REFERENCE = {
  anchorRoot: "mayxoay",
  // The coffee exits from the underside of the Mayxoay assembly, not the
  // separate water-drainage outlet assembly.
  sourceName: "Mayxoay1-2",
} as const satisfies MaterialEffectOutletReference;

export const MAYXOAY_COFFEE_OUTLET =
  MaterialEffectOutletReferenceSchema.parse(MAYXOAY_COFFEE_OUTLET_REFERENCE);

// Read-only evidence from Mayxoay1.SLDPRT / Sketch18. SolidWorks stores the
// transform as rotation data, translation data, scale, and reserved values;
// the runtime keeps both directions explicitly so the sketch point is never
// mistaken for a Three.js world point.
export const MAYXOAY_COFFEE_SKETCH18_CALIBRATION =
  MaterialEffectSketch18CalibrationSchema.parse({
    cad: {
      sourceFile: "Mayxoay1.SLDPRT",
      featureName: "Sketch18",
      units: "meters",
      sketchFrame: "Sketch18-local",
      modelFrame: "Mayxoay1-model",
      geometry: "circle",
      segmentCount: 1,
      center: [-0.0605, 0, 0],
      normal: [0, 0, 1],
      radius: 0.01125,
      modelToSketchTransform: [
        1, 0, 0, 0,
        0, -1, 0, 1,
        0, 0, 0, -0.012,
        1, 0, 0, 0,
      ],
      sketchToModelTransform: [
        1, 0, 0, 0,
        0, 1, 0, -1,
        0, 0, -0.012, 0,
        1, 0, 0, 0,
      ],
      constraintStatus: "under-constrained",
      readMode: "read-only-solidworks-api",
    },
    sourceModelPointMeters: [-0.0605, -0.012, 0],
    sourceModelNormal: [0, -1, 0],
    anchor: {
      anchorRoot: "body",
      sourceName: "Mayxoay1-1",
      sourceFrame: "Mayxoay1-1-local",
      localPointMeters: [-0.0605, -0.012, 0],
      localNormal: [0, -1, 0],
      outletDiameterMeters: 0.0225,
      calibrationResidualMeters: 0,
      verification: "direct-transform",
    },
  });

// The Concentric28 target reference on box_nen-1 resolves to this local point
// in the cluster GLB. It is the receiving surface on the box_nen opening, so
// the Body effect follows the actual compressor part instead of a free offset.
export const MAYXOAY_COFFEE_BOX_NEN_TARGET =
  MaterialEffectSurfaceTargetSchema.parse({
    sourceName: "box_nen-1",
    sourceFrame: "box_nen-1-local",
    localPointMeters: [-0.0595, 0.2, 0.1636],
    localNormal: [0, 0, -1],
  });

export const MAYXOAY_COFFEE_EFFECT = MaterialEffectCoffeeConfigSchema.parse({
  effect: "coffee-grounds",
  anchorRoot: MAYXOAY_COFFEE_OUTLET.anchorRoot,
  outletSourceName: MAYXOAY_COFFEE_OUTLET.sourceName,
  // The stream emits new grounds for ten seconds; each individual ground
  // keeps the original short travel time instead of being stretched across
  // the whole emission window.
  durationMs: 10000,
  particleTravelDurationMs: 2600,
  maxParticleCount: 512,
  seed: 1803,
  // The Mayxoay outlet's local +Y axis points down in the exported assembly.
  dischargeDirection: [0, 1, 0],
  targetOffset: [0, 0.52, 0],
  spawnSpread: [0.018, 0.012, 0.018],
  targetSpread: [0.14, 0.025, 0.1],
  gravity: 0.08,
  particleRadius: 0.006,
  particleOpacity: 0.94,
  highlightOpacity: 0.42,
});
