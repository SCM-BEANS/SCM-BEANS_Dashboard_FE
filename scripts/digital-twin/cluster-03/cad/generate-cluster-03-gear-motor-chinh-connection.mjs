import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-5-gear-motor-chinh-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const motionPath = path.join(outputDir, "gear-motor-chinh.json");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const glbPath = path.join(clusterRoot, "final.glb");

const CLUSTER_ID = "cluster-03";
const TARGET_ID = "gear_motor_chinh-1";
const PARENT_ID = "body_may-1";
const AXIS_MATE = "Concentric12";
const GEAR_MATE = "GearMate2";
const DRIVEN_ID = "wiper_gear-1";
const CONTRACT_VERSION = "cluster-03-gear-motor-chinh-motion.v1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = `${CONNECTIONS_URL}/gear-motor-chinh.json`;
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;
const MATRIX_TOLERANCE = 1e-5;
const DIAGNOSTIC_ANGLE_RANGE = [0, Math.PI * 2];
const MAIN_DRIVE_CALIBRATION = {
  kind: "cam-path-master",
  camPathPartId: "oc_left-1",
  camProgressRange: [0, 1],
  motorAngleRangeRadians: [0, 1.66818569905618],
  wiperAngleRangeRadians: [0, -1.66818569905618],
  distanceMode: "LimitDistance-range",
  sourceMates: ["GearMate2", "PathMate11", "LimitDistance2", "PathMate10", "LimitDistance1"],
  samples: [
    { camProgress: 0, motorAngleRadians: 0 },
    { camProgress: 0.01, motorAngleRadians: 0.00942477796076938 },
    { camProgress: 0.02, motorAngleRadians: 0.01884955592153876 },
    { camProgress: 0.03, motorAngleRadians: 0.02827433388230814 },
    { camProgress: 0.04, motorAngleRadians: 0.03769911184307752 },
    { camProgress: 0.05, motorAngleRadians: 0.047123889803846894 },
    { camProgress: 0.06, motorAngleRadians: 0.05654866776461628 },
    { camProgress: 0.07, motorAngleRadians: 0.06597344572538566 },
    { camProgress: 0.08, motorAngleRadians: 0.07853981633974483 },
    { camProgress: 0.09, motorAngleRadians: 0.0879645943005142 },
    { camProgress: 0.1, motorAngleRadians: 0.09738937226128358 },
    { camProgress: 0.11, motorAngleRadians: 0.10681415022205297 },
    { camProgress: 0.12, motorAngleRadians: 0.11623892818282235 },
    { camProgress: 0.13, motorAngleRadians: 0.12566370614359174 },
    { camProgress: 0.14, motorAngleRadians: 0.1350884841043611 },
    { camProgress: 0.15, motorAngleRadians: 0.14765485471872028 },
    { camProgress: 0.16, motorAngleRadians: 0.15707963267948966 },
    { camProgress: 0.17, motorAngleRadians: 0.16650441064025903 },
    { camProgress: 0.18, motorAngleRadians: 0.1759291886010284 },
    { camProgress: 0.19, motorAngleRadians: 0.18535396656179778 },
    { camProgress: 0.2, motorAngleRadians: 0.19477874452256716 },
    { camProgress: 0.21, motorAngleRadians: 0.20420352248333654 },
    { camProgress: 0.22, motorAngleRadians: 0.21676989309769573 },
    { camProgress: 0.23, motorAngleRadians: 0.2261946710584651 },
    { camProgress: 0.24, motorAngleRadians: 0.23561944901923448 },
    { camProgress: 0.25, motorAngleRadians: 0.24504422698000386 },
    { camProgress: 0.26, motorAngleRadians: 0.25446900494077324 },
    { camProgress: 0.27, motorAngleRadians: 0.26389378290154264 },
    { camProgress: 0.28, motorAngleRadians: 0.273318560862312 },
    { camProgress: 0.29, motorAngleRadians: 0.2827433388230814 },
    { camProgress: 0.3, motorAngleRadians: 0.29530970943744056 },
    { camProgress: 0.31, motorAngleRadians: 0.3047344873982099 },
    { camProgress: 0.32, motorAngleRadians: 0.3141592653589793 },
    { camProgress: 0.33, motorAngleRadians: 0.32358404331974866 },
    { camProgress: 0.34, motorAngleRadians: 0.33300882128051806 },
    { camProgress: 0.35, motorAngleRadians: 0.3424335992412874 },
    { camProgress: 0.36, motorAngleRadians: 0.3518583772020568 },
    { camProgress: 0.37, motorAngleRadians: 0.36442474781641604 },
    { camProgress: 0.38, motorAngleRadians: 0.3738495257771854 },
    { camProgress: 0.39, motorAngleRadians: 0.3832743037379548 },
    { camProgress: 0.4, motorAngleRadians: 0.39269908169872414 },
    { camProgress: 0.41, motorAngleRadians: 0.40212385965949354 },
    { camProgress: 0.42, motorAngleRadians: 0.41154863762026295 },
    { camProgress: 0.43, motorAngleRadians: 0.4209734155810323 },
    { camProgress: 0.44, motorAngleRadians: 0.43353978619539146 },
    { camProgress: 0.45, motorAngleRadians: 0.4429645641561608 },
    { camProgress: 0.46, motorAngleRadians: 0.4523893421169302 },
    { camProgress: 0.47, motorAngleRadians: 0.4618141200776996 },
    { camProgress: 0.48, motorAngleRadians: 0.47123889803846897 },
    { camProgress: 0.49, motorAngleRadians: 0.48066367599923837 },
    { camProgress: 0.5, motorAngleRadians: 0.4900884539600077 },
    { camProgress: 0.51, motorAngleRadians: 0.4995132319207771 },
    { camProgress: 0.52, motorAngleRadians: 0.5120796025351363 },
    { camProgress: 0.53, motorAngleRadians: 0.5215043804959058 },
    { camProgress: 0.54, motorAngleRadians: 0.5309291584566751 },
    { camProgress: 0.55, motorAngleRadians: 0.5403539364174444 },
    { camProgress: 0.56, motorAngleRadians: 0.5497787143782138 },
    { camProgress: 0.57, motorAngleRadians: 0.5592034923389833 },
    { camProgress: 0.58, motorAngleRadians: 0.5686282702997526 },
    { camProgress: 0.59, motorAngleRadians: 0.5811946409141117 },
    { camProgress: 0.6, motorAngleRadians: 0.5906194188748811 },
    { camProgress: 0.61, motorAngleRadians: 0.6000441968356505 },
    { camProgress: 0.62, motorAngleRadians: 0.6094689747964198 },
    { camProgress: 0.63, motorAngleRadians: 0.6283185307179586 },
    { camProgress: 0.64, motorAngleRadians: 0.6440264939859076 },
    { camProgress: 0.65, motorAngleRadians: 0.6628760499074464 },
    { camProgress: 0.66, motorAngleRadians: 0.6817256058289851 },
    { camProgress: 0.67, motorAngleRadians: 0.7005751617505239 },
    { camProgress: 0.68, motorAngleRadians: 0.7194247176720626 },
    { camProgress: 0.69, motorAngleRadians: 0.7414158662471911 },
    { camProgress: 0.7, motorAngleRadians: 0.7602654221687299 },
    { camProgress: 0.71, motorAngleRadians: 0.7822565707438585 },
    { camProgress: 0.72, motorAngleRadians: 0.8042477193189871 },
    { camProgress: 0.73, motorAngleRadians: 0.8262388678941156 },
    { camProgress: 0.74, motorAngleRadians: 0.8482300164692441 },
    { camProgress: 0.75, motorAngleRadians: 0.8733627576979625 },
    { camProgress: 0.76, motorAngleRadians: 0.8984954989266809 },
    { camProgress: 0.77, motorAngleRadians: 0.9236282401553992 },
    { camProgress: 0.78, motorAngleRadians: 0.9519025740377073 },
    { camProgress: 0.79, motorAngleRadians: 0.9801769079200154 },
    { camProgress: 0.8, motorAngleRadians: 1.0084512418023235 },
    { camProgress: 0.81, motorAngleRadians: 1.0398671683382215 },
    { camProgress: 0.82, motorAngleRadians: 1.0744246875277093 },
    { camProgress: 0.83, motorAngleRadians: 1.108982206717197 },
    { camProgress: 0.84, motorAngleRadians: 1.1466813185602747 },
    { camProgress: 0.85, motorAngleRadians: 1.1875220230569419 },
    { camProgress: 0.86, motorAngleRadians: 1.231504320207199 },
    { camProgress: 0.87, motorAngleRadians: 1.2817698026646356 },
    { camProgress: 0.88, motorAngleRadians: 1.338318470429252 },
    { camProgress: 0.89, motorAngleRadians: 1.4074335088082273 },
    { camProgress: 0.9, motorAngleRadians: 1.4953981031087415 },
    { camProgress: 0.91, motorAngleRadians: 1.6524777357882312 },
    { camProgress: 0.92, motorAngleRadians: 1.66818569905618 },
    { camProgress: 0.93, motorAngleRadians: 1.66818569905618 },
    { camProgress: 0.94, motorAngleRadians: 1.66818569905618 },
    { camProgress: 0.95, motorAngleRadians: 1.66818569905618 },
    { camProgress: 0.96, motorAngleRadians: 1.66818569905618 },
    { camProgress: 0.97, motorAngleRadians: 1.66818569905618 },
    { camProgress: 0.98, motorAngleRadians: 1.66818569905618 },
    { camProgress: 0.99, motorAngleRadians: 1.66818569905618 },
    { camProgress: 1, motorAngleRadians: 1.66818569905618 },
  ],
};

function fail(message) { throw new Error(`[cluster-03 gear_motor_chinh] ${message}`); }
function assert(condition, message) { if (!condition) fail(message); }
function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing input ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function finiteArray(value, expectedLength, label) {
  assert(Array.isArray(value) && value.length === expectedLength, `${label} must contain ${expectedLength} values`);
  assert(value.every((item) => typeof item === "number" && Number.isFinite(item)), `${label} contains a non-finite value`);
  return value.map(Number);
}
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function length(value) { return Math.sqrt(dot(value, value)); }
function normalize(value, label) {
  const magnitude = length(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), `${label} cannot be normalized`);
  return value.map((item) => item / magnitude);
}
function distance(left, right) { return length(left.map((value, index) => value - right[index])); }
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
function toGltfMatrix(matrix) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  return [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, m[9], m[10], m[11], 1];
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
  assert(evidence.schemaVersion === "cluster-03-gear-motor-chinh-cad-connection.v1", "unexpected CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");
  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const axisMate = findMate(evidence, AXIS_MATE);
  const gearMate = findMate(evidence, GEAR_MATE);
  assert(axisMate.mateType === 1, `${AXIS_MATE} is not a SolidWorks concentric mate`);
  assert(gearMate.mateType === 10 && gearMate.definitionType === "IGearMateFeatureData", `${GEAR_MATE} gear definition data is missing`);
  const axisTarget = findEntity(axisMate, TARGET_ID);
  const axisParent = findEntity(axisMate, PARENT_ID);
  const targetParams = finiteArray(axisTarget.entityParams, 8, `${AXIS_MATE} target params`);
  const parentParams = finiteArray(axisParent.entityParams, 8, `${AXIS_MATE} parent params`);
  const axis = normalize(targetParams.slice(3, 6), `${AXIS_MATE} target axis`);
  const parentAxis = normalize(parentParams.slice(3, 6), `${AXIS_MATE} parent axis`);
  const axisAlignment = Math.abs(dot(axis, parentAxis));
  assert(axisAlignment >= 1 - 1e-8, `${AXIS_MATE} entities do not share an axis`);
  const gearTarget = findEntity(gearMate, TARGET_ID);
  const drivenEntity = findEntity(gearMate, DRIVEN_ID);
  const gearTargetAxis = normalize(finiteArray(gearTarget.entityParams, 8, `${GEAR_MATE} target params`).slice(3, 6), `${GEAR_MATE} target axis`);
  const drivenAxis = normalize(finiteArray(drivenEntity.entityParams, 8, `${GEAR_MATE} driven params`).slice(3, 6), `${GEAR_MATE} driven axis`);
  assert(Math.abs(dot(axis, gearTargetAxis)) >= 1 - 1e-8, `${GEAR_MATE} target axis differs from ${AXIS_MATE}`);
  const ratioNumerator = Number(gearMate.definitionValues?.gearRatioNumerator);
  const ratioDenominator = Number(gearMate.definitionValues?.gearRatioDenominator);
  const reverse = gearMate.definitionValues?.reverse === true;
  assert(ratioNumerator > 0 && ratioDenominator > 0, `${GEAR_MATE} ratio is invalid`);
  const ratio = ratioNumerator / ratioDenominator;
  const pivotPoint = targetParams.slice(0, 3);
  const localPivotPoint = inverseRigidTransform(target.transformArrayData, pivotPoint);
  const pivotResidual = distance(pivotPoint, swTransform(target.transformArrayData, localPivotPoint));
  const localAxis = inverseRigidVector(target.transformArrayData, axis);
  const glb = readGlbJson(glbPath);
  const node = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(node?.matrix?.length === 16, `${TARGET_ID} GLB node matrix is missing`);
  const matrixResidual = maxAbsoluteDifference(node.matrix, toGltfMatrix(target.transformArrayData));
  assert(matrixResidual <= MATRIX_TOLERANCE, `${TARGET_ID} GLB matrix does not match CAD transform`);
  const samples = [0, 0.5, 1].map((progress) => ({
    progress,
    angleRadians: DIAGNOSTIC_ANGLE_RANGE[1] * progress,
  }));
  const relatedMates = (evidence.mates ?? []).map(summarizeMate);
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
      kind: "axis-rotation",
      property: "rotation",
      progressRange: [0, 1],
      initialProgress: 0,
      angleRangeRadians: DIAGNOSTIC_ANGLE_RANGE,
      angleRangeKind: "diagnostic-test-envelope",
      cadAngularLimit: null,
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
    gear: {
      sourceMate: GEAR_MATE,
      drivenComponent: DRIVEN_ID,
      ratioNumerator,
      ratioDenominator,
      ratio,
      reverse,
      targetAxis: gearTargetAxis,
      drivenAxis,
      couplingStatus: "runtime-gear-follow",
      driveCalibration: clone(MAIN_DRIVE_CALIBRATION),
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
      gearMate: GEAR_MATE,
      drivenComponent: DRIVEN_ID,
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
      gearTargetAxisAlignmentDot: Math.abs(dot(axis, gearTargetAxis)),
      gearDrivenAxisAlignmentDot: Math.abs(dot(axis, drivenAxis)),
      ratio,
      ratioNumerator,
      ratioDenominator,
      reverse,
      cadAngularLimit: null,
      rangeIsDiagnosticOnly: true,
      sampleProgress: samples.map((sample) => sample.progress),
      sampleAnglesRadians: samples.map((sample) => sample.angleRadians),
    },
  };
}

function upsertByKey(items, key, value) {
  const index = items.findIndex((item) => item[key] === value[key]);
  if (index < 0) items.push(value);
  else items[index] = value;
}
function hasLaterCheckpoint(value) {
  return value?.phase === "phase-6" || String(value?.status ?? "").startsWith("phase-6");
}
function updateManifest(manifest, motion) {
  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part && part.gltfNode === TARGET_ID, `manifest mapping for ${TARGET_ID} is missing`);
  part.parent = {
    id: PARENT_ID,
    status: "cad-mate-resolved",
    sourceFeature: AXIS_MATE,
    reason: `${AXIS_MATE} resolves the gear motor axis against fixed ${PARENT_ID}; ${GEAR_MATE} records its ratio to ${DRIVEN_ID}.`,
  };
  part.pivot = {
    status: "cad-axis-resolved",
    point: clone(motion.pivot.point),
    axis: clone(motion.pivot.axis),
    localPoint: clone(motion.pivot.localPoint),
    localAxis: clone(motion.pivot.localAxis),
    sourceFeature: AXIS_MATE,
    reason: `${AXIS_MATE} supplies the gear motor axis; dependent ${GEAR_MATE} coupling remains deferred until the driven gear checkpoint.`,
  };
  part.connectionStatus = "runtime-gear-motor-chinh-ready";
  if (!hasLaterCheckpoint(manifest)) {
    manifest.status = "phase-5-gear-motor-chinh-ready";
    manifest.phase = "phase-5";
  }
  manifest.runtimeReady = false;
  manifest.motions = manifest.motions ?? [];
  upsertByKey(manifest.motions, "nodeName", {
    status: "verified",
    runtimeReady: true,
    file: MOTION_URL,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    sourceFeature: `${AXIS_MATE}+${GEAR_MATE}`,
    kind: "axis-rotation",
  });
  manifest.motionFiles = manifest.motions.map((item) => item.file);
  manifest.motionFile = manifest.motionFiles[0] ?? null;
  manifest.motion = manifest.motions.find((item) => item.nodeName === "oc_left-1") ?? manifest.motions[0];
  manifest.loader.requiredFiles ??= [];
  if (!manifest.loader.requiredFiles.includes(MOTION_URL)) manifest.loader.requiredFiles.push(MOTION_URL);
  manifest.rollback.generatedFiles ??= [];
  if (!manifest.rollback.generatedFiles.includes(MOTION_URL)) manifest.rollback.generatedFiles.push(MOTION_URL);
  upsertByKey(manifest.artifactMatrix ?? (manifest.artifactMatrix = []), "kind", {
    kind: "motion-definition-gear-motor-chinh",
    file: MOTION_URL,
    runtimeServed: true,
    owner: "cluster-03",
    status: "phase-5-gear-motor-chinh-verified",
  });
  return manifest;
}
function updateValidation(validation, motion, manifest) {
  const preserveLaterCheckpoint = hasLaterCheckpoint(validation);
  if (!preserveLaterCheckpoint) validation.phase = "phase-5";
  validation.status = "partial-runtime-ready";
  validation.runtimeReady = false;
  validation.motionReady = true;
  const checks = validation.checks ?? [];
  const phase5Checks = [
    {
      id: "gear-motor-chinh-cad-axis",
      passed: motion.status === "verified" && motion.parentId === PARENT_ID && motion.sourceEvidence.axisMate === AXIS_MATE && motion.validation.axisAlignmentDot >= 1 - 1e-8,
      detail: "gear_motor_chinh-1 is connected to fixed body_may-1 through the verified Concentric12 axis evidence.",
    },
    {
      id: "gear-motor-chinh-ratio-evidence",
      passed: motion.sourceEvidence.gearMate === GEAR_MATE && motion.gear.ratioNumerator === 0.008 && motion.gear.ratioDenominator === 0.008 && motion.gear.reverse === true,
      detail: "GearMate2 supplies the runtime 1:1 reversed relation from gear_motor_chinh-1 to wiper_gear-1.",
    },
    {
      id: "gear-motor-chinh-main-drive-calibration",
      passed: motion.gear.driveCalibration?.kind === "cam-path-master" && motion.gear.driveCalibration.camPathPartId === "oc_left-1" && motion.gear.driveCalibration.motorAngleRangeRadians[0] === 0 && Math.abs(motion.gear.driveCalibration.motorAngleRangeRadians[1] - MAIN_DRIVE_CALIBRATION.motorAngleRangeRadians[1]) <= 1e-12 && motion.gear.driveCalibration.distanceMode === "LimitDistance-range" && MAIN_DRIVE_CALIBRATION.sourceMates.every((mate) => motion.gear.driveCalibration.sourceMates.includes(mate)),
      detail: "gear_motor_chinh-1 is calibrated against the complete oc_left-1 CAD path; the motor envelope is about 0 to 1.66819 rad and LimitDistance1/2 remain ranges.",
    },
    {
      id: "gear-motor-chinh-initial-transform",
      passed: motion.validation.glbMatrixResidual <= motion.validation.glbMatrixTolerance && motion.validation.pivotTransformResidualMeters <= motion.validation.toleranceMeters,
      detail: "The final.glb node transform and CAD axis pivot round-trip within the recorded tolerances.",
    },
    {
      id: "gear-motor-chinh-diagnostic-rotation",
      passed: motion.motion.kind === "axis-rotation" && motion.motion.cadAngularLimit === null && motion.motion.angleRangeKind === "diagnostic-test-envelope" && motion.samples.length === 3,
      detail: "One rotation is exposed for local testing; CAD did not provide a physical angular limit.",
    },
    {
      id: "gear-motor-chinh-preserves-previous-parts",
      passed: manifest.parts.find((part) => part.id === "oc_left-1")?.connectionStatus === "runtime-oc-left-ready" && manifest.parts.find((part) => part.id === "oc_right-1")?.connectionStatus === "runtime-oc-right-ready" && manifest.parts.find((part) => part.id === "truc_chinh-1")?.connectionStatus === "runtime-truc-chinh-ready" && manifest.parts.find((part) => part.id === "truc_nen-1")?.connectionStatus === "runtime-truc-nen-ready",
      detail: "The verified oc and shaft connections remain ready while gear_motor_chinh-1 is added.",
    },
    {
      id: "gear-motor-chinh-single-render-owner",
      passed: manifest.parts.find((part) => part.id === TARGET_ID)?.render?.asset === FINAL_GLB_URL,
      detail: "gear_motor_chinh-1 remains owned by final.glb; no duplicate gear overlay is loaded.",
    },
  ];
  for (const check of phase5Checks) upsertByKey(checks, "id", check);
  const pendingCheck = checks.find((check) => check.id === "pending-state-explicit");
  if (pendingCheck) pendingCheck.detail = "Unresolved CAD relationships remain explicit; oc_left-1, oc_right-1, truc_chinh-1, truc_nen-1 and gear_motor_chinh-1 are the only resolved motion parts.";
  validation.checks = checks;
  validation.gearMotorChinh = {
    file: MOTION_URL,
    status: motion.status,
    axis: clone(motion.pivot.axis),
    gearMate: GEAR_MATE,
    ratio: motion.gear.ratio,
    reverse: motion.gear.reverse,
    samples: clone(motion.samples),
    driveCalibration: clone(motion.gear.driveCalibration),
    toleranceMeters: motion.validation.toleranceMeters,
    rangeIsDiagnosticOnly: true,
  };
  if (!preserveLaterCheckpoint) {
    validation.runtimeBlockers = [
      "Only oc_left-1, oc_right-1, truc_chinh-1, truc_nen-1 and gear_motor_chinh-1 are connected in Phase 5; gear_motor_nen-1 and gear_nen-1 remain pending.",
      "GearMate2 ratio evidence is recorded, but wiper_gear-1 is not coupled in runtime until its own checkpoint passes.",
    ];
  }
  return validation;
}
function validateMotion(motion, evidence, inventory) {
  assert(motion.schemaVersion === CONTRACT_VERSION, "motion schema version mismatch");
  assert(motion.clusterId === CLUSTER_ID && motion.status === "verified" && motion.runtimeReady === true, "motion artifact is not verified");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion identity mismatch");
  assert(motion.motion?.kind === "axis-rotation" && motion.motion?.cadAngularLimit === null, "motion is not a diagnostic axis rotation");
  assert(motion.pivot?.sourceMate === AXIS_MATE && motion.pivot?.axis?.length === 3, "CAD axis evidence is missing");
  assert(motion.gear?.sourceMate === GEAR_MATE && motion.gear.ratio === 1 && motion.gear.reverse === true, "CAD gear evidence is missing");
  assert(JSON.stringify(motion.gear.driveCalibration) === JSON.stringify(MAIN_DRIVE_CALIBRATION), "main drive calibration is missing or stale");
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
    assert(JSON.stringify(storedMotion) === JSON.stringify(motion), "stored gear_motor_chinh artifact is stale; regenerate it");
    assert(["phase-5-gear-motor-chinh-ready", "phase-5-gear-motor-nen-ready", "phase-5-gear-nen-ready", "phase-6-arm-left-3-ready"].includes(manifest.status), "manifest is not at or beyond the gear_motor_chinh checkpoint");
    assert(manifest.motionFiles?.includes(MOTION_URL), "manifest motion files are stale");
    assert(["phase-5", "phase-6"].includes(validation.phase) && validation.motionReady === true, "validation is not at the gear_motor_chinh checkpoint");
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
