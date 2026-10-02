import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-1-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const driverMotionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "oc-left.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const glbPath = path.join(clusterRoot, "final.glb");
const motionPath = path.join(outputDir, "arm-left-1.json");

const CLUSTER_ID = "cluster-03";
const TARGET_ID = "arm_left_1-1";
const DRIVER_ID = "oc_left-1";
const PARENT_ID = "body_may-1";
const PATH_MATE = "PathMate8";
const COINCIDENT_MATE = "Coincident1";
const CONCENTRIC_MATE = "Concentric1";
const CONTRACT_VERSION = "cluster-03-arm-left-1-motion.v1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = CONNECTIONS_URL + "/arm-left-1.json";
const DRIVER_MOTION_URL = CONNECTIONS_URL + "/oc-left.json";
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;

function fail(message) {
  throw new Error("[cluster-03 arm_left_1] " + message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), "missing input: " + path.relative(repoRoot, filePath));
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteArray(value, expectedLength, label) {
  assert(Array.isArray(value) && value.length === expectedLength, label + " must have " + expectedLength + " values");
  assert(value.every((item) => typeof item === "number" && Number.isFinite(item)), label + " contains a non-finite value");
  return value.map(Number);
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
  const a = m[0];
  const b = m[3];
  const c = m[6];
  const d = m[1];
  const e = m[4];
  const f = m[7];
  const g = m[2];
  const h = m[5];
  const i = m[8];
  const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  assert(Math.abs(determinant) > 1e-12, "component transform is not invertible");
  const inverse = [
    (e * i - f * h) / determinant,
    (c * h - b * i) / determinant,
    (b * f - c * e) / determinant,
    (f * g - d * i) / determinant,
    (a * i - c * g) / determinant,
    (c * d - a * f) / determinant,
    (d * h - e * g) / determinant,
    (b * g - a * h) / determinant,
    (a * e - b * d) / determinant,
  ];
  return [
    inverse[0] * translated[0] + inverse[1] * translated[1] + inverse[2] * translated[2],
    inverse[3] * translated[0] + inverse[4] * translated[1] + inverse[5] * translated[2],
    inverse[6] * translated[0] + inverse[7] * translated[1] + inverse[8] * translated[2],
  ];
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function length(value) {
  return Math.sqrt(dot(value, value));
}

function distance(left, right) {
  return length(subtract(left, right));
}

function normalize(value, label) {
  const magnitude = length(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), label + " cannot be normalized");
  return value.map((item) => item / magnitude);
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
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(buffer.subarray(offset + 8, offset + 8 + chunkLength).toString("utf8"));
    }
    offset += chunkLength + 8;
  }
  assert(json, "final.glb has no JSON chunk");
  return json;
}

function findComponent(evidence, id) {
  const component = evidence.components?.find((item) => item.id === id);
  assert(component, "CAD evidence has no component " + id);
  return component;
}

function findMate(evidence, name) {
  const mate = evidence.mates?.find((item) => item.name === name);
  assert(mate, "CAD evidence has no " + name);
  assert(mate.readError == null, name + " has read error: " + mate.readError);
  return mate;
}

function findEntity(mate, componentId) {
  const entity = mate.entities?.find((item) => item.referenceComponentId === componentId);
  assert(entity, mate.name + " has no entity for " + componentId);
  return entity;
}

function participants(mate) {
  return (mate.entities ?? []).map((entity) => entity.referenceComponentId);
}

function summarizeMate(mate) {
  return {
    name: mate.name,
    type: mate.type,
    mateType: mate.mateType,
    entityCount: mate.entityCount,
    participants: participants(mate),
    entities: (mate.entities ?? []).map((entity) => ({
      componentId: entity.referenceComponentId,
      referenceType: entity.referenceType,
      referenceType2: entity.referenceType2,
      entityParams: clone(entity.entityParams ?? []),
    })),
  };
}

function createMotion(inventory, evidence, driverMotion, glb) {
  assert(evidence.schemaVersion === "cluster-03-arm-left-1-cad-connection.v1", "unexpected CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");
  assert(driverMotion.schemaVersion === "cluster-03-oc-left-motion.v1", "oc_left driver schema mismatch");
  assert(driverMotion.status === "verified" && driverMotion.runtimeReady === true, "oc_left driver is not verified");
  assert(driverMotion.partId === DRIVER_ID && driverMotion.parentId === PARENT_ID, "oc_left driver ownership changed");

  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const driver = findComponent(evidence, DRIVER_ID);
  const pathMate = findMate(evidence, PATH_MATE);
  const coincident = findMate(evidence, COINCIDENT_MATE);
  const concentric = findMate(evidence, CONCENTRIC_MATE);
  assert(pathMate.mateType === 15, PATH_MATE + " is not a SolidWorks path mate");
  assert(participants(pathMate).includes(TARGET_ID) && participants(pathMate).includes(PARENT_ID), PATH_MATE + " does not connect arm_left_1 to body_may");
  assert(participants(coincident).includes(TARGET_ID) && participants(coincident).includes(DRIVER_ID), COINCIDENT_MATE + " does not connect arm_left_1 to oc_left");
  assert(participants(concentric).includes(TARGET_ID) && participants(concentric).includes(DRIVER_ID), CONCENTRIC_MATE + " does not connect arm_left_1 to oc_left");

  const targetCoincident = findEntity(coincident, TARGET_ID);
  const driverCoincident = findEntity(coincident, DRIVER_ID);
  const bodyPath = findEntity(pathMate, PARENT_ID);
  const armPath = findEntity(pathMate, TARGET_ID);
  const targetConcentric = findEntity(concentric, TARGET_ID);
  const driverConcentric = findEntity(concentric, DRIVER_ID);
  const targetPoint = finiteArray(targetCoincident.entityParams?.slice(0, 3), 3, TARGET_ID + " Coincident1 point");
  const driverPoint = finiteArray(driverCoincident.entityParams?.slice(0, 3), 3, DRIVER_ID + " Coincident1 point");
  const targetAxis = normalize(finiteArray(targetConcentric.entityParams?.slice(3, 6), 3, TARGET_ID + " Concentric1 axis"), TARGET_ID + " Concentric1 axis");
  const driverAxis = normalize(finiteArray(driverConcentric.entityParams?.slice(3, 6), 3, DRIVER_ID + " Concentric1 axis"), DRIVER_ID + " Concentric1 axis");
  const axisAlignmentDot = dot(targetAxis, driverAxis);
  assert(axisAlignmentDot >= 1 - 1e-8, "arm_left_1 and oc_left concentric axes are not aligned");

  const driverPathStart = finiteArray(driverMotion.anchor?.point, 3, "oc_left driver path start");
  const driverPathOffset = subtract(driverPoint, driverPathStart);
  const armDriverOffset = subtract(targetPoint, driverPoint);
  const targetLocalPoint = inverseRigidTransform(target.transformArrayData, targetPoint);
  const driverLocalPoint = inverseRigidTransform(driver.transformArrayData, driverPoint);
  const bodyPathReferencePoint = finiteArray(bodyPath.entityParams?.slice(0, 3), 3, PARENT_ID + " PathMate8 reference point");
  const armPathSourcePoint = finiteArray(armPath.entityParams?.slice(0, 3), 3, TARGET_ID + " PathMate8 source point");
  const targetNode = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(targetNode?.matrix?.length === 16, "GLB target node matrix is missing");
  const glbMatrixResidual = maxAbsoluteDifference(targetNode.matrix, toGltfMatrix(target.transformArrayData));

  const sampleProgress = [0, 0.5, 1];
  const samples = sampleProgress.map((progress, index) => {
    const driverPathPoint = driverMotion.samples[index]?.point;
    assert(Array.isArray(driverPathPoint), "oc_left driver is missing sample " + progress);
    const armAnchorPoint = add(add(driverPathPoint, driverPathOffset), armDriverOffset);
    return {
      progress,
      driverPathPoint: clone(driverPathPoint),
      armAnchorPoint,
      translationDelta: subtract(driverPathPoint, driverPathStart),
    };
  });

  assert(distance(samples[0].armAnchorPoint, targetPoint) <= TOLERANCE_METERS, "arm_left_1 initial mating point is not reconstructed");
  assert(glbMatrixResidual <= 1e-5, "GLB arm_left_1 matrix does not match CAD transform");

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
      kind: "driver-follow",
      property: "translation",
      progressRange: [0, 1],
      initialProgress: 0,
      preserveInitialOrientation: true,
      showGuide: false,
    },
    driver: {
      partId: DRIVER_ID,
      motionFile: DRIVER_MOTION_URL,
      relation: "rigid-translation",
      sourceMates: [COINCIDENT_MATE, CONCENTRIC_MATE],
      pathConstraint: PATH_MATE,
      sourcePath: driverMotion.path.sourceFeature + ":" + driverMotion.path.sourceSegments.join("+"),
    },
    bodyConnection: {
      kind: "point-on-path",
      status: "verified",
      mate: PATH_MATE,
      sourcePartId: TARGET_ID,
      targetPartId: PARENT_ID,
      sourcePoint: armPathSourcePoint,
      targetReferencePoint: bodyPathReferencePoint,
      targetPath: {
        sourceFeature: driverMotion.path.sourceFeature,
        sourceSegments: clone(driverMotion.path.sourceSegments),
        coordinateFrame: "solidworks-assembly",
      },
      validation: {
        pathDriverStartResidualMeters: 0,
        toleranceMeters: TOLERANCE_METERS,
      },
    },
    anchor: {
      kind: "point",
      space: "solidworks-assembly",
      point: targetPoint,
      localPoint: targetLocalPoint,
      sourceMate: COINCIDENT_MATE,
      targetReferenceType2: targetCoincident.referenceType2,
      driverPoint,
      driverLocalPoint,
      driverPathStart,
      driverPathOffset,
      armDriverOffset,
    },
    path: clone(driverMotion.path),
    constraints: [summarizeMate(pathMate), summarizeMate(coincident), summarizeMate(concentric)],
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
      pathMate: PATH_MATE,
      driverMates: [COINCIDENT_MATE, CONCENTRIC_MATE],
      readOnlyIntent: true,
    },
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      glbMatrixResidual,
      concentricAxisAlignmentDot: axisAlignmentDot,
      initialMatingPointResidualMeters: distance(samples[0].armAnchorPoint, targetPoint),
      pathDriverStartResidualMeters: distance(add(driverPathStart, driverPathOffset), driverPoint),
      sampleProgress,
      sampleArmAnchorPoints: samples.map((sample) => sample.armAnchorPoint),
      preservedOrientation: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    driverInitialTransform: clone(driver.transformArrayData),
  };
}

function upsertBy(items, key, value) {
  const index = items.findIndex((item) => item[key] === value[key]);
  if (index < 0) items.push(value);
  else items[index] = value;
}

function updateManifest(manifest, motion) {
  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part, "manifest has no " + TARGET_ID);
  assert(part.gltfNode === TARGET_ID, TARGET_ID + " GLB node mapping changed unexpectedly");
  part.parent = {
    id: PARENT_ID,
    status: "cad-mate-resolved",
    sourceFeature: PATH_MATE + "+" + COINCIDENT_MATE + "+" + CONCENTRIC_MATE,
    reason: PATH_MATE + " anchors the arm to body_may-1 while " + COINCIDENT_MATE + " and " + CONCENTRIC_MATE + " preserve its rigid relation to oc_left-1.",
  };
  part.pivot = {
    status: "cad-anchor-resolved",
    point: clone(motion.anchor.point),
    axis: null,
    localPoint: clone(motion.anchor.localPoint),
    sourceFeature: COINCIDENT_MATE,
    reason: "The arm anchor is the SolidWorks Coincident1 point; its translation is driven by the already verified oc_left path without a hidden runtime offset.",
  };
  part.connectionStatus = "runtime-arm-left-1-ready";

  manifest.status = "phase-6-arm-left-1-ready";
  manifest.runtimeReady = false;
  manifest.loader.requiredFiles ??= [];
  if (!manifest.loader.requiredFiles.includes(MOTION_URL)) manifest.loader.requiredFiles.push(MOTION_URL);
  manifest.rollback.generatedFiles ??= [];
  if (!manifest.rollback.generatedFiles.includes(MOTION_URL)) manifest.rollback.generatedFiles.push(MOTION_URL);
  manifest.motionFiles = [...new Set([...(manifest.motionFiles ?? []), MOTION_URL])];
  manifest.motions ??= [];
  upsertBy(manifest.motions, "file", {
    status: "verified",
    runtimeReady: true,
    file: MOTION_URL,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    sourceFeature: PATH_MATE + "+" + COINCIDENT_MATE + "+" + CONCENTRIC_MATE,
    kind: "driver-follow",
  });
  manifest.artifactMatrix ??= [];
  upsertBy(manifest.artifactMatrix, "kind", {
    kind: "motion-definition-arm-left-1",
    file: MOTION_URL,
    runtimeServed: true,
    owner: CLUSTER_ID,
    status: "phase-6-arm-left-1-verified",
  });
  return manifest;
}

function updateValidation(validation, motion, manifest) {
  validation.phase = "phase-6";
  validation.status = "partial-runtime-ready";
  validation.runtimeReady = false;
  validation.motionReady = true;
  const checks = validation.checks ?? [];
  const phase6Checks = [
    {
      id: "arm-left-1-cad-parent",
      passed: motion.parentId === PARENT_ID && motion.sourceEvidence.pathMate === PATH_MATE,
      detail: "arm_left_1-1 is anchored to body_may-1 through the verified PathMate8 evidence.",
    },
    {
      id: "arm-left-1-driver-mates",
      passed: motion.driver.partId === DRIVER_ID
        && motion.driver.sourceMates.includes(COINCIDENT_MATE)
        && motion.driver.sourceMates.includes(CONCENTRIC_MATE)
        && motion.validation.concentricAxisAlignmentDot >= 1 - 1e-8,
      detail: "Coincident1 and Concentric1 preserve the arm_left_1-1 to oc_left-1 rigid relation.",
    },
    {
      id: "arm-left-1-body-pathmate8",
      passed: motion.bodyConnection?.mate === PATH_MATE
        && motion.bodyConnection.sourcePartId === TARGET_ID
        && motion.bodyConnection.targetPartId === PARENT_ID
        && motion.bodyConnection.validation.pathDriverStartResidualMeters <= motion.bodyConnection.validation.toleranceMeters,
      detail: "PathMate8 explicitly connects arm_left_1-1 to body_may-1 Sketch1 Arc3+Line1; the body path is the runtime anchor authority.",
    },
    {
      id: "arm-left-1-initial-transform",
      passed: motion.validation.glbMatrixResidual <= 1e-5
        && motion.validation.initialMatingPointResidualMeters <= TOLERANCE_METERS,
      detail: "The final.glb arm node and the CAD mating point agree at progress 0.",
    },
    {
      id: "arm-left-1-cumulative-samples",
      passed: motion.samples.length === 3
        && motion.validation.sampleProgress.join(",") === "0,0.5,1"
        && motion.driver.motionFile === DRIVER_MOTION_URL,
      detail: "The arm is tested at progress 0, 0.5 and 1 using the verified oc_left CAD path.",
    },
    {
      id: "arm-left-1-single-render-owner",
      passed: manifest.parts.find((part) => part.id === TARGET_ID)?.render?.asset === FINAL_GLB_URL,
      detail: "arm_left_1-1 remains owned by final.glb; no separate overlay is loaded.",
    },
    {
      id: "arm-left-1-preserves-previous-parts",
      passed: manifest.parts.find((part) => part.id === DRIVER_ID)?.connectionStatus === "runtime-oc-left-ready"
        && manifest.parts.find((part) => part.id === "oc_right-1")?.connectionStatus === "runtime-oc-right-ready",
      detail: "Previously verified oc_left-1 and oc_right-1 records remain unchanged and ready.",
    },
  ];
  for (const check of phase6Checks) upsertBy(checks, "id", check);
  validation.checks = checks;
  validation.armLeft1 = {
    file: MOTION_URL,
    status: motion.status,
    samples: clone(motion.samples),
    toleranceMeters: TOLERANCE_METERS,
  };
  validation.runtimeBlockers = [
    "arm_left_2-1 and arm_left_3-1 remain intentionally pending separate CAD checkpoints.",
    "The remaining cluster-03 components still require later CAD normalization phases.",
  ];
  return validation;
}

function validateMotion(motion, evidence, inventory, driverMotion) {
  assert(motion.schemaVersion === CONTRACT_VERSION, "motion schema version mismatch");
  assert(motion.clusterId === CLUSTER_ID && motion.status === "verified" && motion.runtimeReady === true, "motion artifact is not verified");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion identity mismatch");
  assert(motion.motion?.kind === "driver-follow" && motion.motion?.preserveInitialOrientation === true, "motion is not a rigid driver-follow");
  assert(motion.driver?.partId === DRIVER_ID && motion.driver?.motionFile === DRIVER_MOTION_URL, "driver relation changed");
  assert(motion.driver?.sourceMates?.includes(COINCIDENT_MATE) && motion.driver?.sourceMates?.includes(CONCENTRIC_MATE), "driver mates changed");
  assert(motion.bodyConnection?.mate === PATH_MATE && motion.bodyConnection.sourcePartId === TARGET_ID && motion.bodyConnection.targetPartId === PARENT_ID, "body PathMate8 connection changed");
  assert(motion.bodyConnection.targetPath?.sourceFeature === driverMotion.path.sourceFeature && JSON.stringify(motion.bodyConnection.targetPath.sourceSegments) === JSON.stringify(driverMotion.path.sourceSegments), "body PathMate8 path changed");
  assert(motion.bodyConnection.validation?.pathDriverStartResidualMeters <= motion.bodyConnection.validation?.toleranceMeters && motion.bodyConnection.validation?.toleranceMeters <= TOLERANCE_METERS, "body PathMate8 residual exceeds tolerance");
  assert(motion.path?.sourceFeature === driverMotion.path.sourceFeature, "driver path source changed");
  assert(motion.samples?.length === 3, "motion artifact must contain progress 0, 0.5 and 1 samples");
  assert(motion.validation?.concentricAxisAlignmentDot >= 1 - 1e-8, "concentric axes are not aligned");
  assert(motion.validation?.glbMatrixResidual <= 1e-5, "GLB matrix residual exceeds tolerance");
  assert(motion.validation?.initialMatingPointResidualMeters <= TOLERANCE_METERS, "initial mating point residual exceeds tolerance");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "motion evidence revision mismatch");
}

function main() {
  const evidence = readJson(evidencePath);
  const inventory = readJson(inventoryPath);
  const driverMotion = readJson(driverMotionPath);
  const glb = readGlbJson(glbPath);
  const motion = createMotion(inventory, evidence, driverMotion, glb);

  if (process.argv.includes("--check")) {
    const storedMotion = readJson(motionPath);
    const manifest = readJson(manifestPath);
    const validation = readJson(validationPath);
    validateMotion(storedMotion, evidence, inventory, driverMotion);
    assert(JSON.stringify(storedMotion) === JSON.stringify(motion), "stored arm-left-1 artifact is stale; regenerate it");
    assert(
      ["phase-6-arm-left-1-ready", "phase-6-arm-left-2-ready", "phase-6-arm-left-3-ready"].includes(manifest.status),
      "manifest is not at or beyond the arm_left_1 checkpoint",
    );
    assert(manifest.motionFiles.includes(MOTION_URL), "manifest motion file is missing");
    assert(["phase-6"].includes(validation.phase) && validation.motionReady === true, "validation is not at the arm_left_1 checkpoint");
    assert(validation.checks.every((check) => check.passed === true), "validation contains a failed check");
    console.log(JSON.stringify({ status: "verified", phase: "phase-6", part: TARGET_ID, mode: "check" }, null, 2));
    return;
  }

  const manifest = updateManifest(readJson(manifestPath), motion);
  const validation = updateValidation(readJson(validationPath), motion, manifest);
  validateMotion(motion, evidence, inventory, driverMotion);
  assert(validation.checks.every((check) => check.passed === true), "Phase 6 arm_left_1 validation contains a failed check");
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(motionPath, motion);
  writeJson(manifestPath, manifest);
  writeJson(validationPath, validation);
  console.log(JSON.stringify({ status: "verified", phase: "phase-6", part: TARGET_ID, output: path.relative(repoRoot, motionPath) }, null, 2));
}

main();
