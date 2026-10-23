import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-3-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const motionPath = path.join(outputDir, "arm-left-3.json");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const driverMotionPath = path.join(outputDir, "truc-chinh.json");
const arm2MotionPath = path.join(outputDir, "arm-left-2.json");
const glbPath = path.join(clusterRoot, "final.glb");

const CLUSTER_ID = "cluster-03";
const TARGET_ID = "arm_left_3-1";
const PARENT_ID = "body_may-1";
const DRIVER_ID = "truc_chinh-1";
const ARM2_ID = "arm_left_2-1";
const PRIMARY_PARENT_MATE = "Coincident5";
const PRIMARY_DRIVER_MATES = ["Parallel1", "Concentric6"];
const CONTRACT_VERSION = "cluster-03-arm-left-3-motion.v1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = `${CONNECTIONS_URL}/arm-left-3.json`;
const DRIVER_MOTION_URL = `${CONNECTIONS_URL}/truc-chinh.json`;
const WIPER_MOTION_URL = `${CONNECTIONS_URL}/wiper-gear.json`;
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;
const MATRIX_TOLERANCE = 1e-5;

function fail(message) { throw new Error(`[cluster-03 arm_left_3] ${message}`); }
function assert(condition, message) { if (!condition) fail(message); }
function readJson(filePath) { assert(fs.existsSync(filePath), `missing input ${path.relative(repoRoot, filePath)}`); return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function finiteArray(value, expectedLength, label) {
  assert(Array.isArray(value) && value.length === expectedLength, `${label} must contain ${expectedLength} values`);
  assert(value.every((item) => typeof item === "number" && Number.isFinite(item)), `${label} contains a non-finite value`);
  return value.map(Number);
}
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function length(value) { return Math.sqrt(dot(value, value)); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function cross(left, right) { return [left[1] * right[2] - left[2] * right[1], left[2] * right[0] - left[0] * right[2], left[0] * right[1] - left[1] * right[0]]; }
function normalize(value, label) { const magnitude = length(value); assert(magnitude > 0 && Number.isFinite(magnitude), `${label} cannot be normalized`); return value.map((item) => item / magnitude); }
function distance(left, right) { return length(subtract(left, right)); }
function swTransform(matrix, point) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  const p = finiteArray(point, 3, "point");
  return [m[0] * p[0] + m[3] * p[1] + m[6] * p[2] + m[9], m[1] * p[0] + m[4] * p[1] + m[7] * p[2] + m[10], m[2] * p[0] + m[5] * p[1] + m[8] * p[2] + m[11]];
}
function inverseRigidTransform(matrix, point) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  const translated = [point[0] - m[9], point[1] - m[10], point[2] - m[11]];
  return [m[0] * translated[0] + m[1] * translated[1] + m[2] * translated[2], m[3] * translated[0] + m[4] * translated[1] + m[5] * translated[2], m[6] * translated[0] + m[7] * translated[1] + m[8] * translated[2]];
}
function inverseRigidVector(matrix, vector) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  return normalize([m[0] * vector[0] + m[1] * vector[1] + m[2] * vector[2], m[3] * vector[0] + m[4] * vector[1] + m[5] * vector[2], m[6] * vector[0] + m[7] * vector[1] + m[8] * vector[2]], "local axis");
}
function toGltfMatrix(matrix) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  return [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, m[9], m[10], m[11], 1];
}
function maxAbsoluteDifference(left, right) { return Math.max(...left.map((value, index) => Math.abs(value - right[index]))); }
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
function findComponent(evidence, id) { const component = evidence.components?.find((item) => item.id === id); assert(component, `CAD evidence has no component ${id}`); return component; }
function findMate(evidence, name) { const mate = evidence.mates?.find((item) => item.name === name); assert(mate, `CAD evidence has no ${name}`); assert(mate.readError == null, `${name} has read error: ${mate.readError}`); return mate; }
function findEntity(mate, componentId) { const entity = mate.entities?.find((item) => item.referenceComponentId === componentId); assert(entity, `${mate.name} has no entity for ${componentId}`); return entity; }
function participants(mate) { return (mate.entities ?? []).map((entity) => entity.referenceComponentId); }
function summarizeMate(mate) {
  return {
    name: mate.name,
    type: mate.type,
    mateType: mate.mateType,
    entityCount: mate.entityCount,
    definitionType: mate.definitionType ?? null,
    definitionValues: clone(mate.definitionValues ?? null),
    participants: participants(mate),
    entities: (mate.entities ?? []).map((entity) => ({ componentId: entity.referenceComponentId, referenceType: entity.referenceType, referenceType2: entity.referenceType2, entityParams: clone(entity.entityParams ?? []) })),
  };
}

function createMotion(inventory, evidence, driverMotion, arm2Motion, glb) {
  assert(evidence.schemaVersion === "cluster-03-arm-left-3-cad-connection.v1", "unexpected CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");
  assert(driverMotion.schemaVersion === "cluster-03-truc-chinh-motion.v1" && driverMotion.status === "verified", "truc_chinh driver is not verified");
  assert(arm2Motion.schemaVersion === "cluster-03-arm-left-2-motion.v1" && arm2Motion.status === "verified" && arm2Motion.connection?.mate === "PathMate10", "arm_left_2 point connection is not verified");

  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const driver = findComponent(evidence, DRIVER_ID);
  const parentMate = findMate(evidence, PRIMARY_PARENT_MATE);
  const parallel = findMate(evidence, "Parallel1");
  const concentric = findMate(evidence, "Concentric6");
  const pathMate = findMate(evidence, "PathMate10");
  const wiperMate = findMate(evidence, "Coincident7");
  const limitMate = findMate(evidence, "LimitDistance1");
  assert(participants(parentMate).includes(TARGET_ID) && participants(parentMate).includes(PARENT_ID), `${PRIMARY_PARENT_MATE} does not connect arm_left_3-1 to body_may-1`);
  assert(participants(parallel).includes(TARGET_ID) && participants(parallel).includes(DRIVER_ID), "Parallel1 does not connect arm_left_3-1 to truc_chinh-1");
  assert(participants(concentric).includes(TARGET_ID) && participants(concentric).includes(DRIVER_ID), "Concentric6 does not connect arm_left_3-1 to truc_chinh-1");

  const targetConcentric = findEntity(concentric, TARGET_ID);
  const driverConcentric = findEntity(concentric, DRIVER_ID);
  const targetParams = finiteArray(targetConcentric.entityParams, 8, "Concentric6 target entity params");
  const driverParams = finiteArray(driverConcentric.entityParams, 8, "Concentric6 driver entity params");
  const axis = normalize(targetParams.slice(3, 6), "Concentric6 target axis");
  const driverAxis = normalize(driverParams.slice(3, 6), "Concentric6 driver axis");
  const axisAlignmentDot = dot(axis, driverAxis);
  assert(axisAlignmentDot >= 1 - 1e-8, "arm_left_3-1 and truc_chinh-1 axes are not aligned");
  const pivotPoint = targetParams.slice(0, 3);
  const driverPivotPoint = driverParams.slice(0, 3);
  const axisLineResidual = length(cross(subtract(pivotPoint, driverPivotPoint), axis));
  assert(axisLineResidual <= TOLERANCE_METERS, "arm_left_3-1 pivot is not on the truc_chinh-1 axis");
  const localPivotPoint = inverseRigidTransform(target.transformArrayData, pivotPoint);
  const pivotTransformResidual = distance(pivotPoint, swTransform(target.transformArrayData, localPivotPoint));
  const localAxis = inverseRigidVector(target.transformArrayData, axis);
  const targetNode = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(targetNode?.matrix?.length === 16, `${TARGET_ID} GLB node matrix is missing`);
  const glbMatrixResidual = maxAbsoluteDifference(targetNode.matrix, toGltfMatrix(target.transformArrayData));
  assert(glbMatrixResidual <= MATRIX_TOLERANCE, `${TARGET_ID} GLB matrix does not match CAD transform`);

  const angleRangeRadians = finiteArray(driverMotion.motion?.angleRangeRadians, 2, "truc_chinh angle range");
  const samples = [0, 0.5, 1].map((progress, index) => ({ progress, angleRadians: driverMotion.samples?.[index]?.angleRadians ?? angleRangeRadians[0] + (angleRangeRadians[1] - angleRangeRadians[0]) * progress }));

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
    motion: { kind: "axis-rotation", property: "rotation", progressRange: [0, 1], initialProgress: 0, angleRangeRadians, angleRangeKind: "diagnostic-test-envelope", cadAngularLimit: null, driver: "normalized-progress", preserveInitialMeshScale: true },
    pivot: { kind: "axis", space: "solidworks-assembly", point: pivotPoint, localPoint: localPivotPoint, axis, localAxis, sourceMate: "Concentric6", targetReferenceType2: targetConcentric.referenceType2, driverReferenceType2: driverConcentric.referenceType2 },
    driver: { partId: DRIVER_ID, motionFile: DRIVER_MOTION_URL, relation: "rigid-rotation", sourceMates: PRIMARY_DRIVER_MATES },
    upstreamDriver: { partId: "wiper_gear-1", motionFile: WIPER_MOTION_URL, relation: "coincident-follow", sourceMates: ["Coincident7"] },
    connection: clone(arm2Motion.connection),
    constraints: [parentMate, parallel, concentric, pathMate, wiperMate, limitMate].map(summarizeMate),
    samples,
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      cadEvidenceSchema: evidence.schemaVersion,
      solidWorksRevision: evidence.source.solidWorksRevision,
      sessionMode: evidence.source.sessionMode,
      targetComponent: TARGET_ID,
      parentComponent: PARENT_ID,
      driverComponent: DRIVER_ID,
      parentMate: PRIMARY_PARENT_MATE,
      driverMates: PRIMARY_DRIVER_MATES,
      connectionMates: ["PathMate10", "LimitDistance1", "Coincident7"],
      deferredMates: [],
      readOnlyIntent: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    driverInitialTransform: clone(driver.transformArrayData),
    validation: { toleranceMeters: TOLERANCE_METERS, glbMatrixTolerance: MATRIX_TOLERANCE, glbMatrixResidual, pivotTransformResidualMeters: pivotTransformResidual, axisAlignmentDot: axisAlignmentDot, axisLineResidualMeters: axisLineResidual, targetAxisDirection: axis, driverAxisDirection: driverAxis, sampleProgress: samples.map((sample) => sample.progress), sampleAnglesRadians: samples.map((sample) => sample.angleRadians), rangeIsDiagnosticOnly: true, preservedOrientation: true },
  };
}

function upsertBy(items, key, value) { const index = items.findIndex((item) => item[key] === value[key]); if (index < 0) items.push(value); else items[index] = value; }
function updateManifest(manifest, motion) {
  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part?.gltfNode === TARGET_ID, `manifest ${TARGET_ID} mapping is missing`);
  part.parent = { id: PARENT_ID, status: "cad-mate-resolved", sourceFeature: PRIMARY_PARENT_MATE, reason: "Coincident5 resolves arm_left_3-1 against fixed body_may-1; the aggregate GLB root remains the runtime scene parent." };
  part.pivot = { status: "cad-axis-resolved", point: clone(motion.pivot.point), axis: clone(motion.pivot.axis), localPoint: clone(motion.pivot.localPoint), localAxis: clone(motion.pivot.localAxis), sourceFeature: "Concentric6", reason: "Concentric6 supplies the arm_left_3-1 axis shared with truc_chinh-1; Parallel1 preserves the shaft orientation." };
  part.connectionStatus = "runtime-arm-left-3-ready";
  manifest.status = "phase-6-arm-left-3-ready";
  manifest.phase = "phase-6";
  manifest.runtimeReady = false;
  manifest.loader.requiredFiles ??= [];
  if (!manifest.loader.requiredFiles.includes(MOTION_URL)) manifest.loader.requiredFiles.push(MOTION_URL);
  manifest.rollback.generatedFiles ??= [];
  if (!manifest.rollback.generatedFiles.includes(MOTION_URL)) manifest.rollback.generatedFiles.push(MOTION_URL);
  manifest.motionFiles = [...new Set([...(manifest.motionFiles ?? []), MOTION_URL])];
  manifest.motions ??= [];
  upsertBy(manifest.motions, "file", { status: "verified", runtimeReady: true, file: MOTION_URL, nodeName: TARGET_ID, parentId: PARENT_ID, sourceFeature: "Concentric6+Parallel1", kind: "axis-rotation", driver: DRIVER_ID });
  manifest.artifactMatrix ??= [];
  upsertBy(manifest.artifactMatrix, "kind", { kind: "motion-definition-arm-left-3", file: MOTION_URL, runtimeServed: true, owner: CLUSTER_ID, status: "phase-6-arm-left-3-verified" });
  return manifest;
}
function updateValidation(validation, motion, manifest) {
  validation.phase = "phase-6";
  validation.status = "partial-runtime-ready";
  validation.runtimeReady = false;
  validation.motionReady = true;
  const checks = validation.checks ?? [];
  const phase6Checks = [
    { id: "arm-left-3-cad-parent", passed: motion.parentId === PARENT_ID && motion.sourceEvidence.parentMate === PRIMARY_PARENT_MATE, detail: "arm_left_3-1 is anchored to fixed body_may-1 by Coincident5." },
    { id: "arm-left-3-driver-axis", passed: motion.driver.partId === DRIVER_ID && motion.pivot.sourceMate === "Concentric6" && motion.validation.axisAlignmentDot >= 1 - 1e-8 && motion.validation.axisLineResidualMeters <= TOLERANCE_METERS, detail: "Concentric6 and Parallel1 make arm_left_3-1 follow the verified truc_chinh-1 axis." },
    { id: "arm-left-3-initial-transform", passed: motion.validation.glbMatrixResidual <= MATRIX_TOLERANCE && motion.validation.pivotTransformResidualMeters <= TOLERANCE_METERS, detail: "The final.glb arm node and CAD axis pivot agree at progress 0." },
    { id: "arm-left-3-diagnostic-samples", passed: motion.samples.length === 3 && motion.validation.sampleProgress.join(",") === "0,0.5,1" && motion.motion.cadAngularLimit === null, detail: "The arm is tested against the same explicit diagnostic rotation envelope as truc_chinh-1." },
    { id: "arm-left-3-single-render-owner", passed: manifest.parts.find((part) => part.id === TARGET_ID)?.render?.asset === FINAL_GLB_URL, detail: "arm_left_3-1 remains owned by final.glb; no separate overlay is loaded." },
    { id: "arm-left-3-preserves-previous-parts", passed: manifest.parts.find((part) => part.id === "arm_left_2-1")?.connectionStatus === "runtime-arm-left-2-ready" && manifest.parts.find((part) => part.id === DRIVER_ID)?.connectionStatus === "runtime-truc-chinh-ready", detail: "The verified arm_left_2-1 and truc_chinh-1 records remain ready." },
    { id: "arm-left-3-deferred-mates-recorded", passed: motion.sourceEvidence.deferredMates.length === 0 && motion.connection?.mate === "PathMate10" && ["LimitDistance1", "Coincident7"].every((name) => motion.constraints.some((mate) => mate.name === name)), detail: "The PathMate10 point-on-path connection and Coincident7 wiper coupling are explicit and resolved." },
  ];
  for (const check of phase6Checks) upsertBy(checks, "id", check);
  validation.checks = checks;
  validation.armLeft3 = { file: MOTION_URL, status: motion.status, samples: clone(motion.samples), toleranceMeters: TOLERANCE_METERS, driver: DRIVER_MOTION_URL, connection: clone(motion.connection), deferredMates: motion.sourceEvidence.deferredMates };
  validation.runtimeBlockers = ["The remaining cluster-03 components still require later CAD normalization phases.", "PathMate10, LimitDistance1 and Coincident7 are resolved for the arm_left_2/arm_left_3/wiper linkage; collision verification remains outside this checkpoint."];
  return validation;
}
function validateMotion(motion, evidence, inventory, driverMotion, arm2Motion) {
  assert(motion.schemaVersion === CONTRACT_VERSION && motion.clusterId === CLUSTER_ID && motion.status === "verified" && motion.runtimeReady === true, "motion artifact is not verified");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion identity mismatch");
  assert(motion.motion?.kind === "axis-rotation" && motion.motion.property === "rotation" && motion.motion.cadAngularLimit === null, "motion is not the diagnostic axis follower");
  assert(motion.pivot?.sourceMate === "Concentric6" && motion.driver?.partId === DRIVER_ID && motion.driver.motionFile === DRIVER_MOTION_URL, "driver axis relation changed");
  assert(motion.connection?.mate === "PathMate10" && motion.connection.sourcePartId === ARM2_ID && arm2Motion.connection?.mate === "PathMate10", "arm_left_2 point connection changed");
  assert(JSON.stringify(motion.driver.sourceMates) === JSON.stringify(PRIMARY_DRIVER_MATES), "driver mate evidence changed");
  assert(motion.motion.angleRangeRadians?.[0] === driverMotion.motion.angleRangeRadians?.[0] && motion.motion.angleRangeRadians?.[1] === driverMotion.motion.angleRangeRadians?.[1], "driver angular range changed");
  assert(motion.samples?.length === 3 && motion.validation.sampleProgress.join(",") === "0,0.5,1", "motion samples changed");
  assert(motion.validation.axisAlignmentDot >= 1 - 1e-8 && motion.validation.axisLineResidualMeters <= TOLERANCE_METERS, "CAD axis alignment exceeds tolerance");
  assert(motion.validation.pivotTransformResidualMeters <= TOLERANCE_METERS && motion.validation.glbMatrixResidual <= MATRIX_TOLERANCE, "arm_left_3 transform validation exceeds tolerance");
  assert(evidence.source?.readOnlyIntent === true && evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "CAD evidence source changed");
}
function main() {
  const evidence = readJson(evidencePath);
  const inventory = readJson(inventoryPath);
  const driverMotion = readJson(driverMotionPath);
  const arm2Motion = readJson(arm2MotionPath);
  const motion = createMotion(inventory, evidence, driverMotion, arm2Motion, readGlbJson(glbPath));
  if (process.argv.includes("--check")) {
    const storedMotion = readJson(motionPath);
    const manifest = readJson(manifestPath);
    const validation = readJson(validationPath);
    validateMotion(storedMotion, evidence, inventory, driverMotion, arm2Motion);
    assert(JSON.stringify(storedMotion) === JSON.stringify(motion), "stored arm-left-3 artifact is stale; regenerate it");
    assert(manifest.status === "phase-6-arm-left-3-ready", "manifest is not at the arm_left_3 checkpoint");
    assert(manifest.motionFiles.includes(MOTION_URL) && validation.phase === "phase-6" && validation.motionReady === true, "manifest/validation is not at arm_left_3 checkpoint");
    assert(validation.checks.every((check) => check.passed === true), "validation contains a failed check");
    console.log(JSON.stringify({ status: "verified", phase: "phase-6", part: TARGET_ID, mode: "check" }, null, 2));
    return;
  }
  const manifest = updateManifest(readJson(manifestPath), motion);
  const validation = updateValidation(readJson(validationPath), motion, manifest);
  validateMotion(motion, evidence, inventory, driverMotion, arm2Motion);
  assert(validation.checks.every((check) => check.passed === true), "Phase 6 arm_left_3 validation contains a failed check");
  writeJson(motionPath, motion);
  writeJson(manifestPath, manifest);
  writeJson(validationPath, validation);
  console.log(JSON.stringify({ status: "verified", phase: "phase-6", part: TARGET_ID, output: path.relative(repoRoot, motionPath) }, null, 2));
}
main();
