import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-5-truc-nen-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const motionPath = path.join(outputDir, "truc-nen.json");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const glbPath = path.join(clusterRoot, "final.glb");

const CLUSTER_ID = "cluster-03";
const TARGET_ID = "truc_nen-1";
const PARENT_ID = "body_may-1";
const AXIS_MATE = "Concentric23";
const SCREW_MATE = "Screw2";
const LOCK_MATE = "Lock2";
const CONTRACT_VERSION = "cluster-03-truc-nen-motion.v1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = `${CONNECTIONS_URL}/truc-nen.json`;
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;
const MATRIX_TOLERANCE = 1e-5;
const DIAGNOSTIC_ANGLE_RANGE = [0, Math.PI * 2];

function fail(message) {
  throw new Error(`[cluster-03 truc_nen] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing input ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteArray(value, expectedLength, label) {
  assert(Array.isArray(value) && value.length === expectedLength, `${label} must contain ${expectedLength} values`);
  assert(value.every((item) => typeof item === "number" && Number.isFinite(item)), `${label} contains a non-finite value`);
  return value.map(Number);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function length(value) {
  return Math.sqrt(dot(value, value));
}

function normalize(value, label) {
  const magnitude = length(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), `${label} cannot be normalized`);
  return value.map((item) => item / magnitude);
}

function distance(left, right) {
  return length(left.map((value, index) => value - right[index]));
}

function swTransform(matrix, point, includeTranslation = true) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  const p = finiteArray(point, 3, "point");
  return [
    m[0] * p[0] + m[3] * p[1] + m[6] * p[2] + (includeTranslation ? m[9] : 0),
    m[1] * p[0] + m[4] * p[1] + m[7] * p[2] + (includeTranslation ? m[10] : 0),
    m[2] * p[0] + m[5] * p[1] + m[8] * p[2] + (includeTranslation ? m[11] : 0),
  ];
}

function inverseRigidTransform(matrix, point) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  const translated = [point[0] - m[9], point[1] - m[10], point[2] - m[11]];
  return [
    m[0] * translated[0] + m[1] * translated[1] + m[2] * translated[2],
    m[3] * translated[0] + m[4] * translated[1] + m[5] * translated[2],
    m[6] * translated[0] + m[7] * translated[1] + m[8] * translated[2],
  ];
}

function inverseRigidVector(matrix, vector) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  return normalize([
    m[0] * vector[0] + m[1] * vector[1] + m[2] * vector[2],
    m[3] * vector[0] + m[4] * vector[1] + m[5] * vector[2],
    m[6] * vector[0] + m[7] * vector[1] + m[8] * vector[2],
  ], "local axis");
}

function toGltfMatrix(solidWorksTransform) {
  const m = finiteArray(solidWorksTransform, 16, "SolidWorks transform");
  return [
    m[0], m[1], m[2], 0,
    m[3], m[4], m[5], 0,
    m[6], m[7], m[8], 0,
    m[9], m[10], m[11], 1,
  ];
}

function maxAbsoluteDifference(left, right) {
  assert(left.length === right.length, "matrix lengths differ");
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

function readGlbJson(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.toString("ascii", 0, 4) === "glTF", "final.glb is not a binary GLB");
  let offset = 12;
  let json = null;
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    if (chunkType === 0x4e4f534a) json = JSON.parse(buffer.subarray(offset + 8, offset + 8 + chunkLength).toString("utf8"));
    offset += chunkLength + 8;
  }
  assert(json, "final.glb has no JSON chunk");
  return json;
}

function findComponent(evidence, id) {
  const component = evidence.components?.find((item) => item.id === id);
  assert(component, `CAD evidence has no component ${id}`);
  return component;
}

function findMate(evidence, name) {
  const mate = evidence.mates?.find((item) => item.name === name);
  assert(mate, `CAD evidence has no ${name}`);
  assert(mate.readError == null, `${name} has read error: ${mate.readError}`);
  return mate;
}

function findEntity(mate, componentId) {
  const entity = mate.entities?.find((item) => item.referenceComponentId === componentId);
  assert(entity, `${mate.name} has no entity for ${componentId}`);
  return entity;
}

function summarizeMate(mate) {
  return {
    name: mate.name,
    type: mate.type,
    mateType: mate.mateType,
    entityCount: mate.entityCount,
    definitionType: mate.definitionType ?? null,
    definitionValues: clone(mate.definitionValues ?? null),
    participants: (mate.entities ?? []).map((entity) => entity.referenceComponentId),
    entities: (mate.entities ?? []).map((entity) => ({
      componentId: entity.referenceComponentId,
      referenceType: entity.referenceType,
      referenceType2: entity.referenceType2,
      entityParams: clone(entity.entityParams ?? []),
    })),
  };
}

function createMotion(inventory, evidence) {
  assert(evidence.schemaVersion === "cluster-03-truc-nen-cad-connection.v1", "unexpected CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");
  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const axisMate = findMate(evidence, AXIS_MATE);
  const screwMate = findMate(evidence, SCREW_MATE);
  const lockMate = findMate(evidence, LOCK_MATE);
  assert(axisMate.mateType === 1, `${AXIS_MATE} is not a SolidWorks concentric mate`);
  assert(screwMate.mateType === 17, `${SCREW_MATE} is not a SolidWorks screw mate`);
  assert(screwMate.definitionType === "IScrewMateFeatureData", `${SCREW_MATE} definition data is missing`);
  const axisTarget = findEntity(axisMate, TARGET_ID);
  const axisParent = findEntity(axisMate, PARENT_ID);
  const axisTargetParams = finiteArray(axisTarget.entityParams, 8, `${AXIS_MATE} target params`);
  const axisParentParams = finiteArray(axisParent.entityParams, 8, `${AXIS_MATE} parent params`);
  const axis = normalize(axisTargetParams.slice(3, 6), `${AXIS_MATE} target axis`);
  const parentAxis = normalize(axisParentParams.slice(3, 6), `${AXIS_MATE} parent axis`);
  const axisAlignment = Math.abs(dot(axis, parentAxis));
  assert(axisAlignment >= 1 - 1e-8, `${AXIS_MATE} entities do not share an axis`);
  const screwTarget = findEntity(screwMate, TARGET_ID);
  const screwParent = findEntity(screwMate, "box_nen-1");
  const screwTargetParams = finiteArray(screwTarget.entityParams, 8, `${SCREW_MATE} target params`);
  const screwParentParams = finiteArray(screwParent.entityParams, 8, `${SCREW_MATE} parent params`);
  const screwTargetAxis = normalize(screwTargetParams.slice(3, 6), `${SCREW_MATE} target axis`);
  const screwParentAxis = normalize(screwParentParams.slice(3, 6), `${SCREW_MATE} parent axis`);
  assert(Math.abs(dot(axis, screwTargetAxis)) >= 1 - 1e-8, `${SCREW_MATE} target axis differs from ${AXIS_MATE}`);
  const pitchMeters = Number(screwMate.definitionValues?.revolutionValue);
  const reverse = screwMate.definitionValues?.reverse === true;
  assert(Number.isFinite(pitchMeters) && pitchMeters > 0, `${SCREW_MATE} pitch is missing or invalid`);
  const pivotPoint = axisTargetParams.slice(0, 3);
  const localPivotPoint = inverseRigidTransform(target.transformArrayData, pivotPoint);
  const pivotResidual = distance(pivotPoint, swTransform(target.transformArrayData, localPivotPoint));
  const localAxis = inverseRigidVector(target.transformArrayData, axis);
  const translationPerRevolution = reverse ? -pitchMeters : pitchMeters;
  const glb = readGlbJson(glbPath);
  const node = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(node?.matrix?.length === 16, `${TARGET_ID} GLB node matrix is missing`);
  const matrixResidual = maxAbsoluteDifference(node.matrix, toGltfMatrix(target.transformArrayData));
  assert(matrixResidual <= MATRIX_TOLERANCE, `${TARGET_ID} GLB matrix does not match CAD transform`);
  const samples = [0, 0.5, 1].map((progress) => ({
    progress,
    angleRadians: DIAGNOSTIC_ANGLE_RANGE[0]
      + (DIAGNOSTIC_ANGLE_RANGE[1] - DIAGNOSTIC_ANGLE_RANGE[0]) * progress,
    translationMeters: translationPerRevolution * progress,
  }));
  const relatedMates = [axisMate, lockMate, screwMate].map(summarizeMate);

  return {
    schemaVersion: CONTRACT_VERSION,
    clusterId: CLUSTER_ID,
    status: "verified",
    runtimeReady: true,
    units: "meters",
    coordinateFrame: "solidworks-assembly",
    partId: TARGET_ID,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    motion: {
      kind: "screw-axis",
      property: "rotation+translation",
      progressRange: [0, 1],
      initialProgress: 0,
      angleRangeRadians: DIAGNOSTIC_ANGLE_RANGE,
      angleRangeKind: "diagnostic-test-envelope",
      cadAngularLimit: null,
      cadTranslationLimitMeters: null,
      translationRangeMeters: [0, translationPerRevolution],
      driver: "normalized-progress",
      preserveInitialMeshScale: true,
    },
    pivot: {
      kind: "axis",
      space: "solidworks-assembly",
      point: pivotPoint,
      localPoint: localPivotPoint,
      axis,
      localAxis,
      sourceMate: AXIS_MATE,
      targetReferenceType2: axisTarget.referenceType2,
      parentReferenceType2: axisParent.referenceType2,
    },
    screw: {
      sourceMate: SCREW_MATE,
      targetComponent: TARGET_ID,
      fixedReferenceComponent: "box_nen-1",
      targetAxis: screwTargetAxis,
      fixedReferenceAxis: screwParentAxis,
      pitchMeters,
      reverse,
      revolutionType: screwMate.definitionValues?.revolutionType ?? null,
      mateAlignment: screwMate.definitionValues?.mateAlignment ?? null,
      translationPerRevolutionMeters: translationPerRevolution,
      rangeIsDiagnosticOnly: true,
    },
    constraints: relatedMates,
    samples,
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      cadEvidenceSchema: evidence.schemaVersion,
      solidWorksRevision: evidence.source.solidWorksRevision,
      sessionMode: evidence.source.sessionMode,
      targetComponent: TARGET_ID,
      parentComponent: PARENT_ID,
      axisMate: AXIS_MATE,
      screwMate: SCREW_MATE,
      lockMate: LOCK_MATE,
      readOnlyIntent: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      glbMatrixTolerance: MATRIX_TOLERANCE,
      glbMatrixResidual: matrixResidual,
      pivotTransformResidualMeters: pivotResidual,
      axisAlignmentDot: axisAlignment,
      screwAxisAlignmentDot: Math.abs(dot(axis, screwTargetAxis)),
      targetAxisDirection: axis,
      parentAxisDirection: parentAxis,
      screwTargetAxis,
      screwParentAxis,
      pitchMeters,
      translationPerRevolutionMeters: translationPerRevolution,
      cadAngularLimit: null,
      cadTranslationLimitMeters: null,
      rangeIsDiagnosticOnly: true,
      sampleProgress: samples.map((sample) => sample.progress),
      sampleAnglesRadians: samples.map((sample) => sample.angleRadians),
      sampleTranslationsMeters: samples.map((sample) => sample.translationMeters),
    },
  };
}

function upsertByKey(items, key, value) {
  const index = items.findIndex((item) => item[key] === value[key]);
  if (index < 0) items.push(value);
  else items[index] = value;
}

function updateManifest(manifest, motion) {
  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part, `manifest has no ${TARGET_ID}`);
  assert(part.gltfNode === TARGET_ID, `${TARGET_ID} GLB mapping changed unexpectedly`);
  part.parent = {
    id: PARENT_ID,
    status: "cad-mate-resolved",
    sourceFeature: AXIS_MATE,
    reason: `${AXIS_MATE} resolves the moving shaft axis against fixed ${PARENT_ID}; ${SCREW_MATE} supplies the measured one-revolution translation relation.`,
  };
  part.pivot = {
    status: "cad-axis-resolved",
    point: clone(motion.pivot.point),
    axis: clone(motion.pivot.axis),
    localPoint: clone(motion.pivot.localPoint),
    localAxis: clone(motion.pivot.localAxis),
    sourceFeature: AXIS_MATE,
    reason: `${AXIS_MATE} supplies the shaft axis; ${SCREW_MATE} is recorded separately so the runtime test can preserve its pitch and reverse direction.`,
  };
  part.connectionStatus = "runtime-truc-nen-ready";
  manifest.status = "phase-5-truc-nen-ready";
  manifest.runtimeReady = false;
  manifest.phase = "phase-5";
  manifest.motions = manifest.motions ?? [];
  upsertByKey(manifest.motions, "nodeName", {
    status: "verified",
    runtimeReady: true,
    file: MOTION_URL,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    sourceFeature: `${AXIS_MATE}+${SCREW_MATE}`,
    kind: "screw-axis",
  });
  manifest.motionFiles = manifest.motions.map((item) => item.file);
  manifest.motionFile = manifest.motionFiles[0] ?? null;
  manifest.motion = manifest.motions.find((item) => item.nodeName === "oc_left-1") ?? manifest.motions[0];
  manifest.loader.requiredFiles ??= [];
  if (!manifest.loader.requiredFiles.includes(MOTION_URL)) manifest.loader.requiredFiles.push(MOTION_URL);
  manifest.rollback.generatedFiles ??= [];
  if (!manifest.rollback.generatedFiles.includes(MOTION_URL)) manifest.rollback.generatedFiles.push(MOTION_URL);
  upsertByKey(manifest.artifactMatrix ?? (manifest.artifactMatrix = []), "kind", {
    kind: "motion-definition-truc-nen",
    file: MOTION_URL,
    runtimeServed: true,
    owner: "cluster-03",
    status: "phase-5-truc-nen-verified",
  });
  return manifest;
}

function updateValidation(validation, motion, manifest) {
  validation.phase = "phase-5";
  validation.status = "partial-runtime-ready";
  validation.runtimeReady = false;
  validation.motionReady = true;
  const checks = validation.checks ?? [];
  const phase5Checks = [
    {
      id: "truc-nen-cad-axis",
      passed: motion.status === "verified"
        && motion.parentId === PARENT_ID
        && motion.sourceEvidence.axisMate === AXIS_MATE
        && motion.validation.axisAlignmentDot >= 1 - 1e-8,
      detail: "truc_nen-1 is connected to fixed body_may-1 through the verified Concentric23 axis evidence.",
    },
    {
      id: "truc-nen-screw-evidence",
      passed: motion.sourceEvidence.screwMate === SCREW_MATE
        && motion.screw.pitchMeters > 0
        && motion.screw.translationPerRevolutionMeters === motion.validation.translationPerRevolutionMeters,
      detail: "Screw2 contributes an extracted 0.004 m/revolution pitch and reverse direction; no pitch was invented in runtime.",
    },
    {
      id: "truc-nen-initial-transform",
      passed: motion.validation.glbMatrixResidual <= motion.validation.glbMatrixTolerance
        && motion.validation.pivotTransformResidualMeters <= motion.validation.toleranceMeters,
      detail: "The final.glb node transform and CAD axis pivot round-trip within the recorded tolerances.",
    },
    {
      id: "truc-nen-screw-test-range",
      passed: motion.motion.kind === "screw-axis"
        && motion.motion.cadAngularLimit === null
        && motion.motion.cadTranslationLimitMeters === null
        && motion.motion.angleRangeKind === "diagnostic-test-envelope"
        && motion.samples.length === 3,
      detail: "The runtime test covers one CAD-measured screw revolution with its derived translation, while physical limits remain explicit as unavailable.",
    },
    {
      id: "truc-nen-preserves-previous-parts",
      passed: manifest.parts.find((part) => part.id === "oc_left-1")?.connectionStatus === "runtime-oc-left-ready"
        && manifest.parts.find((part) => part.id === "oc_right-1")?.connectionStatus === "runtime-oc-right-ready"
        && manifest.parts.find((part) => part.id === "truc_chinh-1")?.connectionStatus === "runtime-truc-chinh-ready",
      detail: "The previously verified oc paths and truc_chinh axis remain ready while truc_nen-1 is added.",
    },
    {
      id: "truc-nen-single-render-owner",
      passed: manifest.parts.find((part) => part.id === TARGET_ID)?.render?.asset === FINAL_GLB_URL,
      detail: "truc_nen-1 remains owned by final.glb; no duplicate shaft overlay is loaded.",
    },
  ];
  for (const check of phase5Checks) upsertByKey(checks, "id", check);
  const pendingCheck = checks.find((check) => check.id === "pending-state-explicit");
  if (pendingCheck) {
    pendingCheck.detail = "Unresolved CAD relationships remain explicit; oc_left-1, oc_right-1, truc_chinh-1 and truc_nen-1 are the only resolved motion parts.";
  }
  validation.checks = checks;
  validation.trucNen = {
    file: MOTION_URL,
    status: motion.status,
    axis: clone(motion.pivot.axis),
    screwMate: SCREW_MATE,
    pitchMeters: motion.screw.pitchMeters,
    translationPerRevolutionMeters: motion.screw.translationPerRevolutionMeters,
    samples: clone(motion.samples),
    toleranceMeters: motion.validation.toleranceMeters,
    rangeIsDiagnosticOnly: true,
  };
  validation.runtimeBlockers = [
    "Only oc_left-1, oc_right-1, truc_chinh-1 and truc_nen-1 are connected in Phase 5; the remaining gear parts remain intentionally pending.",
    "truc_nen-1 uses the extracted Screw2 pitch for a one-revolution diagnostic test; physical travel limits and the final gear coupling remain deferred.",
  ];
  return validation;
}

function validateMotion(motion, evidence, inventory) {
  assert(motion.schemaVersion === CONTRACT_VERSION, "motion schema version mismatch");
  assert(motion.clusterId === CLUSTER_ID && motion.status === "verified" && motion.runtimeReady === true, "motion artifact is not verified");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion identity mismatch");
  assert(motion.motion?.kind === "screw-axis" && motion.motion?.property === "rotation+translation", "motion is not a screw-axis relation");
  assert(motion.motion?.cadAngularLimit === null && motion.motion?.cadTranslationLimitMeters === null, "motion limits must remain explicit");
  assert(motion.pivot?.sourceMate === AXIS_MATE && motion.pivot?.axis?.length === 3, "CAD axis evidence is missing");
  assert(motion.screw?.sourceMate === SCREW_MATE && motion.screw.pitchMeters > 0, "CAD screw evidence is missing");
  assert(motion.samples?.length === 3, "motion artifact must contain progress 0, 0.5 and 1 samples");
  assert(motion.validation?.pivotTransformResidualMeters <= TOLERANCE_METERS, "pivot does not round-trip through the CAD target transform");
  assert(motion.validation?.glbMatrixResidual <= MATRIX_TOLERANCE, "GLB initial transform is stale");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "motion evidence revision mismatch");
}

function main() {
  const evidence = readJson(evidencePath);
  const inventory = readJson(inventoryPath);
  const motion = createMotion(inventory, evidence);
  if (process.argv.includes("--check")) {
    const storedMotion = readJson(motionPath);
    const manifest = readJson(manifestPath);
    const validation = readJson(validationPath);
    validateMotion(storedMotion, evidence, inventory);
    assert(JSON.stringify(storedMotion) === JSON.stringify(motion), "stored truc_nen artifact is stale; regenerate it");
    assert(["phase-5-truc-nen-ready", "phase-5-gear-motor-chinh-ready", "phase-5-gear-motor-nen-ready", "phase-5-gear-nen-ready", "phase-6-arm-left-3-ready"].includes(manifest.status), "manifest is not at or beyond the truc_nen checkpoint");
    assert(manifest.motionFiles?.includes(MOTION_URL), "manifest motion files are stale");
    assert(["phase-5", "phase-6"].includes(validation.phase) && validation.motionReady === true, "validation is not at the truc_nen checkpoint");
    assert(validation.checks.every((check) => check.passed === true), "validation contains a failed check");
    console.log(JSON.stringify({ status: "verified", phase: "phase-5", part: TARGET_ID, mode: "check" }, null, 2));
    return;
  }
  const manifest = updateManifest(readJson(manifestPath), motion);
  const validation = updateValidation(readJson(validationPath), motion, manifest);
  validateMotion(motion, evidence, inventory);
  assert(validation.checks.every((check) => check.passed === true), "Phase 5 validation contains a failed check");
  writeJson(motionPath, motion);
  writeJson(manifestPath, manifest);
  writeJson(validationPath, validation);
  console.log(JSON.stringify({ status: "verified", phase: "phase-5", part: TARGET_ID, output: path.relative(repoRoot, motionPath) }, null, 2));
}

main();
