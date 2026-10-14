import { z } from "zod";

export const DigitalTwinMaterialEffectSchema = z.enum([
  "coffee-grounds",
  "water-flow",
]);

export const DigitalTwinMaterialEffectPhaseSchema = z.enum([
  "idle",
  "running",
  "complete",
  "fault",
]);

export const MaterialEffectAnchorRootSchema = z.enum(["mayxoay", "body"]);

export const MaterialEffectOutletReferenceSchema = z.object({
  anchorRoot: MaterialEffectAnchorRootSchema,
  sourceName: z.string().min(1),
});

export const MaterialEffectDefinitionSchema = z.object({
  effect: DigitalTwinMaterialEffectSchema,
  anchorRoot: MaterialEffectAnchorRootSchema,
  outletSourceName: z.string().min(1),
  targetOffset: z.tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
  ]),
  durationMs: z.number().int().positive(),
  maxParticleCount: z.number().int().min(1).max(512),
  seed: z.number().int(),
});

export const MaterialEffectVector3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

export const MaterialEffectMatrix4Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

export const MaterialEffectCadEvidenceSchema = z.object({
  sourceFile: z.literal("Mayxoay1.SLDPRT"),
  featureName: z.literal("Sketch18"),
  units: z.literal("meters"),
  sketchFrame: z.literal("Sketch18-local"),
  modelFrame: z.literal("Mayxoay1-model"),
  geometry: z.literal("circle"),
  segmentCount: z.literal(1),
  center: MaterialEffectVector3Schema,
  normal: MaterialEffectVector3Schema,
  radius: z.number().finite().positive(),
  modelToSketchTransform: MaterialEffectMatrix4Schema,
  sketchToModelTransform: MaterialEffectMatrix4Schema,
  constraintStatus: z.literal("under-constrained"),
  readMode: z.literal("read-only-solidworks-api"),
});

export const MaterialEffectCalibratedAnchorSchema = z.object({
  anchorRoot: MaterialEffectAnchorRootSchema,
  sourceName: z.string().min(1),
  sourceFrame: z.literal("Mayxoay1-1-local"),
  localPointMeters: MaterialEffectVector3Schema,
  localNormal: MaterialEffectVector3Schema,
  outletDiameterMeters: z.number().finite().positive(),
  calibrationResidualMeters: z.number().finite().nonnegative(),
  verification: z.literal("direct-transform"),
});

export const MaterialEffectSurfaceTargetSchema = z.object({
  sourceName: z.string().min(1),
  sourceFrame: z.literal("box_nen-1-local"),
  localPointMeters: MaterialEffectVector3Schema,
  localNormal: MaterialEffectVector3Schema,
});

export const MaterialEffectSketch18CalibrationSchema = z.object({
  cad: MaterialEffectCadEvidenceSchema,
  sourceModelPointMeters: MaterialEffectVector3Schema,
  sourceModelNormal: MaterialEffectVector3Schema,
  anchor: MaterialEffectCalibratedAnchorSchema,
});

export const MaterialEffectCoffeeConfigSchema =
  MaterialEffectDefinitionSchema.extend({
    effect: z.literal("coffee-grounds"),
    particleTravelDurationMs: z.number().int().positive(),
    spawnSpread: MaterialEffectVector3Schema,
    dischargeDirection: MaterialEffectVector3Schema,
    targetSpread: MaterialEffectVector3Schema,
    gravity: z.number().finite().nonnegative(),
    particleRadius: z.number().finite().positive(),
    particleOpacity: z.number().finite().min(0).max(1),
    highlightOpacity: z.number().finite().min(0).max(1),
  });

export const DigitalTwinMaterialEffectEventSchema = z.object({
  effect: DigitalTwinMaterialEffectSchema,
  phase: DigitalTwinMaterialEffectPhaseSchema,
  progress: z.number().min(0).max(1),
  cycleId: z.number().int().min(1),
  sequence: z.number().int().min(0),
  emittedAt: z.string().datetime(),
  source: z.literal("test"),
});

export type DigitalTwinMaterialEffect = z.infer<
  typeof DigitalTwinMaterialEffectSchema
>;
export type DigitalTwinMaterialEffectPhase = z.infer<
  typeof DigitalTwinMaterialEffectPhaseSchema
>;
export type MaterialEffectAnchorRoot = z.infer<
  typeof MaterialEffectAnchorRootSchema
>;
export type MaterialEffectOutletReference = z.infer<
  typeof MaterialEffectOutletReferenceSchema
>;
export type MaterialEffectDefinition = z.infer<
  typeof MaterialEffectDefinitionSchema
>;
export type MaterialEffectCadEvidence = z.infer<
  typeof MaterialEffectCadEvidenceSchema
>;
export type MaterialEffectCalibratedAnchor = z.infer<
  typeof MaterialEffectCalibratedAnchorSchema
>;
export type MaterialEffectSurfaceTarget = z.infer<
  typeof MaterialEffectSurfaceTargetSchema
>;
export type MaterialEffectSketch18Calibration = z.infer<
  typeof MaterialEffectSketch18CalibrationSchema
>;
export type MaterialEffectCoffeeConfig = z.infer<
  typeof MaterialEffectCoffeeConfigSchema
>;
export type DigitalTwinMaterialEffectEvent = z.infer<
  typeof DigitalTwinMaterialEffectEventSchema
>;
