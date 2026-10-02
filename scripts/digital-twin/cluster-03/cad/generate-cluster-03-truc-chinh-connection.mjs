import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-5-truc-chinh-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const motionPath = path.join(outputDir, "truc-chinh.json");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const glbPath = path.join(clusterRoot, "final.glb");

const CLUSTER_ID = "cluster-03";
const TARGET_ID = "truc_chinh-1";
const PARENT_ID = "body_may-1";
const MATE_NAME = "Concentric3";
const CONTRACT_VERSION = "cluster-03-truc-chinh-motion.v1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = `${CONNECTIONS_URL}/truc-chinh.json`;
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;
const MATRIX_TOLERANCE = 1e-5;
const DIAGNOSTIC_ANGLE_RANGE = [0, Math.PI * 2];

function fail(message) {
  throw new Error(`[cluster-03 truc_chinh] ${message}`);
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
  assert(
    Array.isArray(value) && value.length === expectedLength,
    `${label} must contain ${expectedLength} values`,
  );
  assert(
    value.every((item) => typeof item === "number" && Number.isFinite(item)),
    `${label} contains a non-finite value`,
  );
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
  return normalize(
    [
      m[0] * vector[0] + m[1] * vector[1] + m[2] * vector[2],
      m[3] * vector[0] + m[4] * vector[1] + m[5] * vector[2],
      m[6] * vector[0] + m[7] * vector[1] + m[8] * vector[2],
    ],
    "local axis",
  );
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
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) {
      json = JSON.parse(buffer.subarray(offset + 8, offset + 8 + length).toString("utf8"));
    }
    offset += length + 8;
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
  assert(evidence.schemaVersion === "cluster-03-truc-chinh-cad-connection.v1", "unexpected CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");

  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const mate = findMate(evidence, MATE_NAME);
  assert(mate.mateType === 1, `${MATE_NAME} is not a SolidWorks concentric mate`);
  const targetEntity = findEntity(mate, TARGET_ID);
  const parentEntity = findEntity(mate, PARENT_ID);
  const targetParams = finiteArray(targetEntity.entityParams, 8, `${MATE_NAME} target entity params`);
  const parentParams = finiteArray(parentEntity.entityParams, 8, `${MATE_NAME} parent entity params`);
  const axis = normalize(targetParams.slice(3, 6), `${MATE_NAME} target axis`);
  const parentAxis = normalize(parentParams.slice(3, 6), `${MATE_NAME} parent axis`);
  const axisAlignment = Math.abs(dot(axis, parentAxis));
  assert(axisAlignment >= 1 - 1e-8, `${MATE_NAME} entities do not share an axis`);
  const pivotPoint = targetParams.slice(0, 3);
  const localPivotPoint = inverseRigidTransform(target.transformArrayData, pivotPoint);
  const reconstructedPivot = swTransform(target.transformArrayData, localPivotPoint);
  const pivotResidual = distance(pivotPoint, reconstructedPivot);
  const localAxis = inverseRigidVector(target.transformArrayData, axis);
  const glb = readGlbJson(glbPath);
  const node = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(node?.matrix?.length === 16, `${TARGET_ID} GLB node matrix is missing`);
  const matrixResidual = maxAbsoluteDifference(node.matrix, toGltfMatrix(target.transformArrayData));
  assert(matrixResidual <= MATRIX_TOLERANCE, `${TARGET_ID} GLB matrix does not match CAD transform`);

  const relatedMates = (evidence.mates ?? []).map(summarizeMate);
  const samples = [0, 0.5, 1].map((progress) => ({
    progress,
    angleRadians: DIAGNOSTIC_ANGLE_RANGE[0]
      + (DIAGNOSTIC_ANGLE_RANGE[1] - DIAGNOSTIC_ANGLE_RANGE[0]) * progress,
  }));

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
      sourceMate: MATE_NAME,
      targetReferenceType2: targetEntity.referenceType2,
      parentReferenceType2: parentEntity.referenceType2,
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
      axisMate: MATE_NAME,
      readOnlyIntent: true,
      dependentMates: relatedMates
        .filter((item) => item.name !== MATE_NAME)
        .map((item) => item.name),
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      glbMatrixTolerance: MATRIX_TOLERANCE,
      glbMatrixResidual: matrixResidual,
      pivotTransformResidualMeters: pivotResidual,
      axisAlignmentDot: axisAlignment,
      targetAxisDirection: axis,
      parentAxisDirection: parentAxis,
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

function updateManifest(manifest, motion) {
  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part, `manifest has no ${TARGET_ID}`);
  assert(part.gltfNode === TARGET_ID, `${TARGET_ID} GLB mapping changed unexpectedly`);
  part.parent = {
    id: PARENT_ID,
    status: "cad-mate-resolved",
    sourceFeature: MATE_NAME,
    reason: `${MATE_NAME} resolves the moving shaft axis against fixed ${PARENT_ID}; the aggregate GLB root remains the runtime scene parent to preserve CAD transforms.`,
  };
  part.pivot = {
    status: "cad-axis-resolved",
    point: clone(motion.pivot.point),
    axis: clone(motion.pivot.axis),
    localPoint: clone(motion.pivot.localPoint),
    localAxis: clone(motion.pivot.localAxis),
    sourceFeature: MATE_NAME,
    reason: `${MATE_NAME} supplies the shaft axis and a CAD point on that axis; no hidden runtime offset is introduced.`,
  };
  part.connectionStatus = "runtime-truc-chinh-ready";
  manifest.status = "phase-5-truc-chinh-ready";
  manifest.runtimeReady = false;
  manifest.phase = "phase-5";
  manifest.motions = manifest.motions ?? [];
  upsertByKey(manifest.motions, "nodeName", {
    status: "verified",
    runtimeReady: true,
    file: MOTION_URL,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    sourceFeature: MATE_NAME,
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
    kind: "motion-definition-truc-chinh",
    file: MOTION_URL,
    runtimeServed: true,
    owner: "cluster-03",
    status: "phase-5-truc-chinh-verified",
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
      id: "truc-chinh-cad-axis",
      passed: motion.status === "verified"
        && motion.parentId === PARENT_ID
        && motion.sourceEvidence.axisMate === MATE_NAME
        && motion.validation.axisAlignmentDot >= 1 - 1e-8,
      detail: "truc_chinh-1 is connected to fixed body_may-1 through the verified Concentric3 axis evidence.",
    },
    {
      id: "truc-chinh-initial-transform",
      passed: motion.validation.glbMatrixResidual <= motion.validation.glbMatrixTolerance
        && motion.validation.pivotTransformResidualMeters <= motion.validation.toleranceMeters,
      detail: "The final.glb node transform and the CAD axis pivot round-trip within the recorded tolerances.",
    },
    {
      id: "truc-chinh-diagnostic-rotation",
      passed: motion.motion.kind === "axis-rotation"
        && motion.motion.cadAngularLimit === null
        && motion.motion.angleRangeKind === "diagnostic-test-envelope"
        && motion.samples.length === 3,
      detail: "The runtime test range is explicit and diagnostic-only because SolidWorks supplied no angular limit for this checkpoint.",
    },
    {
      id: "truc-chinh-preserves-oc-pivots",
      passed: manifest.parts.find((part) => part.id === "oc_left-1")?.connectionStatus === "runtime-oc-left-ready"
        && manifest.parts.find((part) => part.id === "oc_right-1")?.connectionStatus === "runtime-oc-right-ready",
      detail: "The two previously verified oc path connections remain unchanged while truc_chinh-1 is added.",
    },
    {
      id: "truc-chinh-single-render-owner",
      passed: manifest.parts.find((part) => part.id === TARGET_ID)?.render?.asset === FINAL_GLB_URL,
      detail: "truc_chinh-1 remains owned by final.glb; no duplicate shaft overlay is loaded.",
    },
  ];
  for (const check of phase5Checks) upsertByKey(checks, "id", check);
  const pendingCheck = checks.find((check) => check.id === "pending-state-explicit");
  if (pendingCheck) {
    pendingCheck.detail = "Unresolved CAD relationships remain explicit; oc_left-1, oc_right-1 and truc_chinh-1 are the only resolved motion parts.";
  }
  validation.checks = checks;
  validation.trucChinh = {
    file: MOTION_URL,
    status: motion.status,
    axis: clone(motion.pivot.axis),
    samples: clone(motion.samples),
    toleranceMeters: motion.validation.toleranceMeters,
    rangeIsDiagnosticOnly: true,
  };
  validation.runtimeBlockers = [
    "Only oc_left-1, oc_right-1 and truc_chinh-1 are connected in Phase 5; the remaining shaft and gear parts remain intentionally pending.",
    "truc_chinh-1 has no CAD angular limit or verified gear ratio yet; dependent transmission coupling remains deferred to later checkpoints.",
  ];
  return validation;
}

function validateMotion(motion, evidence, inventory) {
  assert(motion.schemaVersion === CONTRACT_VERSION, "motion schema version mismatch");
  assert(motion.clusterId === CLUSTER_ID && motion.status === "verified" && motion.runtimeReady === true, "motion artifact is not verified");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion identity mismatch");
  assert(motion.motion?.kind === "axis-rotation", "motion is not an axis rotation");
  assert(motion.motion?.cadAngularLimit === null && motion.motion?.angleRangeKind === "diagnostic-test-envelope", "motion range must remain diagnostic-only");
  assert(motion.pivot?.sourceMate === MATE_NAME && motion.pivot?.axis?.length === 3, "CAD axis evidence is missing");
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
    assert(JSON.stringify(storedMotion) === JSON.stringify(motion), "stored truc_chinh artifact is stale; regenerate it");
    assert(["phase-5-truc-chinh-ready", "phase-5-truc-nen-ready", "phase-5-gear-motor-chinh-ready", "phase-5-gear-motor-nen-ready", "phase-5-gear-nen-ready", "phase-6-arm-left-3-ready"].includes(manifest.status), "manifest is not at or beyond the truc_chinh checkpoint");
    assert(manifest.motionFiles?.includes(MOTION_URL), "manifest motion files are stale");
    assert(["phase-5", "phase-6"].includes(validation.phase) && validation.motionReady === true, "validation is not at the truc_chinh checkpoint");
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
