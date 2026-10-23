import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-2-cad-evidence.json");
const arm3EvidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-3-cad-evidence.json");
const previousEvidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-1-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const driverMotionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "oc-left.json");
const previousMotionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "arm-left-1.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const glbPath = path.join(clusterRoot, "final.glb");
const motionPath = path.join(outputDir, "arm-left-2.json");

const CLUSTER_ID = "cluster-03";
const TARGET_ID = "arm_left_2-1";
const DRIVER_ID = "oc_left-1";
const CHAIN_ID = "arm_left_1-1";
const ARM3_ID = "arm_left_3-1";
const PARENT_ID = "body_may-1";
const COINCIDENT_MATE = "Coincident3";
const CONCENTRIC_MATE = "Concentric2";
const PATH_CONNECTION_MATE = "PathMate10";
const LIMIT_CONNECTION_MATE = "LimitDistance1";
const CONTRACT_VERSION = "cluster-03-arm-left-2-motion.v1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = CONNECTIONS_URL + "/arm-left-2.json";
const DRIVER_MOTION_URL = CONNECTIONS_URL + "/oc-left.json";
const CHAIN_MOTION_URL = CONNECTIONS_URL + "/arm-left-1.json";
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;

function fail(message) { throw new Error("[cluster-03 arm_left_2] " + message); }
function assert(condition, message) { if (!condition) fail(message); }
function readJson(filePath) { assert(fs.existsSync(filePath), "missing input: " + path.relative(repoRoot, filePath)); return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function writeJson(filePath, value) { fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8"); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
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
  const a = m[0], b = m[3], c = m[6], d = m[1], e = m[4], f = m[7], g = m[2], h = m[5], i = m[8];
  const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  assert(Math.abs(determinant) > 1e-12, "component transform is not invertible");
  const inverse = [
    (e * i - f * h) / determinant, (c * h - b * i) / determinant, (b * f - c * e) / determinant,
    (f * g - d * i) / determinant, (a * i - c * g) / determinant, (c * d - a * f) / determinant,
    (d * h - e * g) / determinant, (b * g - a * h) / determinant, (a * e - b * d) / determinant,
  ];
  return [
    inverse[0] * translated[0] + inverse[1] * translated[1] + inverse[2] * translated[2],
    inverse[3] * translated[0] + inverse[4] * translated[1] + inverse[5] * translated[2],
    inverse[6] * translated[0] + inverse[7] * translated[1] + inverse[8] * translated[2],
  ];
}
function inverseRigidVector(matrix, vector) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  const v = finiteArray(vector, 3, "vector");
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function add(left, right) { return left.map((value, index) => value + right[index]); }
function cross(left, right) { return [left[1] * right[2] - left[2] * right[1], left[2] * right[0] - left[0] * right[2], left[0] * right[1] - left[1] * right[0]]; }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function length(value) { return Math.sqrt(dot(value, value)); }
function distance(left, right) { return length(subtract(left, right)); }
function normalize(value, label) {
  const magnitude = length(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), label + " cannot be normalized");
  return value.map((item) => item / magnitude);
}
function toGltfMatrix(matrix) {
  const m = finiteArray(matrix, 16, "SolidWorks transform");
  return [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, m[9], m[10], m[11], 1];
}
function maxAbsoluteDifference(left, right) { return Math.max(...left.map((value, index) => Math.abs(value - right[index]))); }
function readGlbJson(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.toString("ascii", 0, 4) === "glTF", "final.glb is not a binary GLB");
  let offset = 12, json = null;
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset), chunkType = buffer.readUInt32LE(offset + 4);
    if (chunkType === 0x4e4f534a) json = JSON.parse(buffer.subarray(offset + 8, offset + 8 + chunkLength).toString("utf8"));
    offset += chunkLength + 8;
  }
  assert(json, "final.glb has no JSON chunk");
  return json;
}
function findComponent(evidence, id) { const item = evidence.components?.find((value) => value.id === id); assert(item, "CAD evidence has no component " + id); return item; }
function findMate(evidence, name) { const item = evidence.mates?.find((value) => value.name === name); assert(item, "CAD evidence has no " + name); assert(item.readError == null, name + " has read error: " + item.readError); return item; }
function findEntity(mate, componentId) { const item = mate.entities?.find((value) => value.referenceComponentId === componentId); assert(item, mate.name + " has no entity for " + componentId); return item; }
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
    entities: (mate.entities ?? []).map((entity) => ({
      componentId: entity.referenceComponentId,
      referenceType: entity.referenceType,
      referenceType2: entity.referenceType2,
      entityParams: clone(entity.entityParams ?? []),
    })),
  };
}
function createArm3PathConnection(evidence, arm3Evidence, target, driverMotion) {
  const pathMate = findMate(evidence, PATH_CONNECTION_MATE);
  const limitMate = findMate(evidence, LIMIT_CONNECTION_MATE);
  assert(participants(pathMate).includes(TARGET_ID) && participants(pathMate).includes(ARM3_ID), PATH_CONNECTION_MATE + " does not connect arm_left_2-1 to arm_left_3-1");
  const sourceEntity = findEntity(pathMate, TARGET_ID);
  const sourcePoint = finiteArray(sourceEntity.entityParams?.slice(0, 3), 3, TARGET_ID + " PathMate10 point");
  const arm3Component = findComponent(arm3Evidence, ARM3_ID);
  const arm3Part = arm3Evidence.parts?.find((part) => part.componentId === ARM3_ID);
  assert(arm3Part, "arm_left_3-1 part sketch evidence is missing");
  const sketch = arm3Part.sketches?.find((item) => item.featureName === "Sketch1");
  const line = sketch?.segments?.find((segment) => segment.name === "Line1");
  assert(sketch && line?.lineParams?.length === 6, "arm_left_3-1 Sketch1 Line1 path evidence is missing");
  const pathPointLocal = finiteArray(line.lineParams.slice(0, 3), 3, "arm_left_3-1 Sketch1 Line1 point");
  const pathDirectionLocal = normalize(finiteArray(line.lineParams.slice(3, 6), 3, "arm_left_3-1 Sketch1 Line1 direction"), "arm_left_3-1 Sketch1 Line1 direction");
  const pathStartLocal = finiteArray(line.sketchStartPoint, 3, "arm_left_3-1 Sketch1 Line1 start");
  const pathEndLocal = finiteArray(line.sketchEndPoint, 3, "arm_left_3-1 Sketch1 Line1 end");
  const pathPointPart = swTransform(sketch.sketchToModelTransform, pathPointLocal);
  const pathDirectionPart = normalize(swTransform(sketch.sketchToModelTransform, pathDirectionLocal, false), "arm_left_3 Sketch1 Line1 model direction");
  const pathStartPart = swTransform(sketch.sketchToModelTransform, pathStartLocal);
  const pathEndPart = swTransform(sketch.sketchToModelTransform, pathEndLocal);
  const pathPoint = swTransform(arm3Component.transformArrayData, pathPointPart);
  const pathDirection = normalize(swTransform(arm3Component.transformArrayData, pathDirectionPart, false), "arm_left_3 Sketch1 Line1 assembly direction");
  const pathStart = swTransform(arm3Component.transformArrayData, pathStartPart);
  const pathEnd = swTransform(arm3Component.transformArrayData, pathEndPart);
  const pathLength = distance(pathStart, pathEnd);
  assert(pathLength > 0, "arm_left_3 Sketch1 Line1 segment has no length");
  const pathStartResidual = length(cross(subtract(pathStart, pathPoint), pathDirection));
  const pathEndResidual = length(cross(subtract(pathEnd, pathPoint), pathDirection));
  const pathStartProjection = dot(subtract(pathStart, pathPoint), pathDirection);
  const pathEndProjection = dot(subtract(pathEnd, pathPoint), pathDirection);
  assert(pathStartResidual <= TOLERANCE_METERS && pathEndResidual <= TOLERANCE_METERS, "arm_left_3 Sketch1 Line1 segment endpoints are not on the target line");
  assert(Math.abs(pathEndProjection - pathStartProjection - pathLength) <= TOLERANCE_METERS, "arm_left_3 Sketch1 Line1 segment direction is inconsistent");
  const pathResidual = length(cross(subtract(sourcePoint, pathPoint), pathDirection));
  const lineProjection = dot(subtract(sourcePoint, pathPoint), pathDirection);
  const concentric = findMate(evidence, CONCENTRIC_MATE);
  const driverConcentric = findEntity(concentric, DRIVER_ID);
  const driverAxisPoint = finiteArray(driverConcentric.entityParams?.slice(0, 3), 3, DRIVER_ID + " Concentric2 point");
  const driverAxis = normalize(finiteArray(driverConcentric.entityParams?.slice(3, 6), 3, DRIVER_ID + " Concentric2 axis"), DRIVER_ID + " Concentric2 axis");
  assert(driverMotion.targetInitialTransform?.length === 16, "oc_left target transform is missing");
  const limitSource = findEntity(limitMate, TARGET_ID);
  const limitTarget = findEntity(limitMate, ARM3_ID);
  const limitSourcePoint = finiteArray(limitSource.entityParams?.slice(0, 3), 3, TARGET_ID + " LimitDistance1 point");
  const limitTargetPoint = finiteArray(limitTarget.entityParams?.slice(0, 3), 3, ARM3_ID + " LimitDistance1 point");
  const limitDistance = Number(limitMate.definitionValues?.distance);
  const limitResidual = Math.abs(distance(limitSourcePoint, limitTargetPoint) - limitDistance);
  assert(pathResidual <= TOLERANCE_METERS, "arm_left_2 PathMate10 point is not on the arm_left_3 Sketch1 Line1 path");
  assert(Number.isFinite(limitDistance) && limitResidual <= TOLERANCE_METERS, "arm_left_2 LimitDistance1 connection point is inconsistent");
  return {
    kind: "point-on-path",
    status: "verified",
    mate: PATH_CONNECTION_MATE,
    sourcePartId: TARGET_ID,
    targetPartId: ARM3_ID,
    sourcePoint,
    sourceLocalPoint: inverseRigidTransform(target.transformArrayData, sourcePoint),
    targetPath: { sourceFeature: "Sketch1", sourceSegment: "Line1", point: pathPoint, direction: pathDirection, start: pathStart, end: pathEnd, localPoint: pathPointLocal, localDirection: pathDirectionLocal, localStart: pathStartLocal, localEnd: pathEndLocal, parameterRange: [0, 1], lengthMeters: pathLength, coordinateFrame: "solidworks-assembly" },
    driverAxis: { sourceMate: CONCENTRIC_MATE, partId: DRIVER_ID, point: driverAxisPoint, axis: driverAxis, localPoint: inverseRigidTransform(driverMotion.targetInitialTransform, driverAxisPoint), localAxis: normalize(inverseRigidVector(driverMotion.targetInitialTransform, driverAxis), DRIVER_ID + " Concentric2 local axis") },
    limit: { mate: LIMIT_CONNECTION_MATE, sourcePoint: limitSourcePoint, targetPoint: limitTargetPoint, distanceMeters: limitDistance, minimumDistanceMeters: Number(limitMate.definitionValues?.minimumDistance), maximumDistanceMeters: Number(limitMate.definitionValues?.maximumDistance) },
    validation: { pathResidualMeters: pathResidual, limitDistanceResidualMeters: limitResidual, lineProjectionMeters: lineProjection, toleranceMeters: TOLERANCE_METERS },
  };
}
function createMotion(inventory, evidence, arm3Evidence, previousEvidence, driverMotion, previousMotion, glb) {
  assert(evidence.schemaVersion === "cluster-03-arm-left-2-cad-connection.v1", "unexpected CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");
  assert(driverMotion.schemaVersion === "cluster-03-oc-left-motion.v1" && driverMotion.status === "verified", "oc_left driver is not verified");
  assert(previousMotion.schemaVersion === "cluster-03-arm-left-1-motion.v1" && previousMotion.status === "verified", "arm_left_1 chain is not verified");
  assert(previousMotion.partId === CHAIN_ID && previousMotion.driver?.partId === DRIVER_ID, "arm_left_1 chain ownership changed");

  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const pathDriver = findComponent(evidence, DRIVER_ID);
  const chainEvidenceMate = findMate(previousEvidence, COINCIDENT_MATE);
  const chainEntity = findEntity(chainEvidenceMate, CHAIN_ID);
  const coincident = findMate(evidence, COINCIDENT_MATE);
  const concentric = findMate(evidence, CONCENTRIC_MATE);
  assert(participants(coincident).includes(TARGET_ID) && participants(coincident).includes(CHAIN_ID), COINCIDENT_MATE + " does not connect arm_left_2 to arm_left_1");
  assert(participants(concentric).includes(TARGET_ID) && participants(concentric).includes(DRIVER_ID), CONCENTRIC_MATE + " does not connect arm_left_2 to oc_left");

  const targetEntity = findEntity(coincident, TARGET_ID);
  const targetConcentric = findEntity(concentric, TARGET_ID);
  const driverConcentric = findEntity(concentric, DRIVER_ID);
  const connection = createArm3PathConnection(evidence, arm3Evidence, target, driverMotion);
  const chainPoint = finiteArray(chainEntity.entityParams?.slice(0, 3), 3, CHAIN_ID + " Coincident3 point");
  const targetPoint = finiteArray(targetEntity.entityParams?.slice(0, 3), 3, TARGET_ID + " Coincident3 point");
  const targetAxis = normalize(finiteArray(targetConcentric.entityParams?.slice(3, 6), 3, TARGET_ID + " Concentric2 axis"), TARGET_ID + " Concentric2 axis");
  const driverAxis = normalize(finiteArray(driverConcentric.entityParams?.slice(3, 6), 3, DRIVER_ID + " Concentric2 axis"), DRIVER_ID + " Concentric2 axis");
  const axisAlignmentDot = dot(targetAxis, driverAxis);
  assert(axisAlignmentDot >= 1 - 1e-8, "arm_left_2 and oc_left concentric axes are not aligned");

  const driverPathStart = finiteArray(driverMotion.anchor?.point, 3, "oc_left driver path start");
  const driverPathOffset = subtract(chainPoint, driverPathStart);
  const chainOffset = subtract(targetPoint, chainPoint);
  const targetLocalPoint = inverseRigidTransform(target.transformArrayData, targetPoint);
  const targetNode = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(targetNode?.matrix?.length === 16, "GLB target node matrix is missing");
  const glbMatrixResidual = maxAbsoluteDifference(targetNode.matrix, toGltfMatrix(target.transformArrayData));

  const sampleProgress = [0, 0.5, 1];
  const samples = sampleProgress.map((progress, index) => {
    const driverPathPoint = driverMotion.samples[index]?.point;
    assert(Array.isArray(driverPathPoint), "oc_left driver is missing sample " + progress);
    const armAnchorPoint = add(add(driverPathPoint, driverPathOffset), chainOffset);
    return { progress, driverPathPoint: clone(driverPathPoint), armAnchorPoint, translationDelta: subtract(driverPathPoint, driverPathStart) };
  });
  assert(distance(samples[0].armAnchorPoint, targetPoint) <= TOLERANCE_METERS, "arm_left_2 initial mating point is not reconstructed");
  assert(glbMatrixResidual <= 1e-5, "GLB arm_left_2 matrix does not match CAD transform");

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
    motion: { kind: "driver-follow", property: "translation", progressRange: [0, 1], initialProgress: 0, preserveInitialOrientation: true, showGuide: false },
    driver: {
      partId: DRIVER_ID,
      motionFile: DRIVER_MOTION_URL,
      relation: "rigid-translation",
      sourceMates: [COINCIDENT_MATE, CONCENTRIC_MATE],
      dependencyPartId: CHAIN_ID,
      dependencyMotionFile: CHAIN_MOTION_URL,
      sourcePath: driverMotion.path.sourceFeature + ":" + driverMotion.path.sourceSegments.join("+"),
    },
    anchor: {
      kind: "point",
      space: "solidworks-assembly",
      point: targetPoint,
      localPoint: targetLocalPoint,
      sourceMate: COINCIDENT_MATE,
      targetReferenceType2: targetEntity.referenceType2,
      chainPoint,
      driverPathStart,
      driverPathOffset,
      chainOffset,
    },
    path: clone(driverMotion.path),
    constraints: [
      summarizeMate(coincident),
      summarizeMate(concentric),
      ...evidence.mates.filter((mate) => ["PathMate10", "PathMate11", "LimitDistance1", "LimitDistance2"].includes(mate.name)).map(summarizeMate),
    ],
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
      dependencyComponent: CHAIN_ID,
      driverMates: [COINCIDENT_MATE, CONCENTRIC_MATE],
      connectionMates: [PATH_CONNECTION_MATE, LIMIT_CONNECTION_MATE],
      deferredMates: ["PathMate11", "LimitDistance2"],
      readOnlyIntent: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    driverInitialTransform: clone(pathDriver.transformArrayData),
    connection,
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      glbMatrixResidual,
      concentricAxisAlignmentDot: axisAlignmentDot,
      initialMatingPointResidualMeters: distance(samples[0].armAnchorPoint, targetPoint),
      chainOffsetMeters: length(chainOffset),
      connectionPathResidualMeters: connection.validation.pathResidualMeters,
      connectionLimitDistanceResidualMeters: connection.validation.limitDistanceResidualMeters,
      connectionLineProjectionMeters: connection.validation.lineProjectionMeters,
      sampleProgress,
      sampleArmAnchorPoints: samples.map((sample) => sample.armAnchorPoint),
      preservedOrientation: true,
    },
  };
}
function upsertBy(items, key, value) { const index = items.findIndex((item) => item[key] === value[key]); if (index < 0) items.push(value); else items[index] = value; }
function updateManifest(manifest, motion) {
  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part && part.gltfNode === TARGET_ID, "manifest arm_left_2 mapping is missing");
  part.parent = { id: PARENT_ID, status: "cad-mate-resolved", sourceFeature: COINCIDENT_MATE + "+" + CONCENTRIC_MATE + "+" + PATH_CONNECTION_MATE, reason: "Coincident3 chains arm_left_2-1 to arm_left_1-1, Concentric2 preserves the oc_left-1 axis relation, and PathMate10 supplies the explicit point-on-path connection to arm_left_3-1." };
  part.pivot = { status: "cad-anchor-resolved", point: clone(motion.anchor.point), axis: null, localPoint: clone(motion.anchor.localPoint), sourceFeature: COINCIDENT_MATE, reason: "The arm anchor is the SolidWorks Coincident3 point; its translation is driven by the verified oc_left path through the CAD chain." };
  part.connectionStatus = "runtime-arm-left-2-ready";
  manifest.status = "phase-6-arm-left-2-ready";
  manifest.runtimeReady = false;
  manifest.loader.requiredFiles ??= [];
  if (!manifest.loader.requiredFiles.includes(MOTION_URL)) manifest.loader.requiredFiles.push(MOTION_URL);
  manifest.rollback.generatedFiles ??= [];
  if (!manifest.rollback.generatedFiles.includes(MOTION_URL)) manifest.rollback.generatedFiles.push(MOTION_URL);
  manifest.motionFiles = [...new Set([...(manifest.motionFiles ?? []), MOTION_URL])];
  manifest.motions ??= [];
  upsertBy(manifest.motions, "file", { status: "verified", runtimeReady: true, file: MOTION_URL, nodeName: TARGET_ID, parentId: PARENT_ID, sourceFeature: COINCIDENT_MATE + "+" + CONCENTRIC_MATE + "+" + PATH_CONNECTION_MATE, kind: "driver-follow" });
  manifest.artifactMatrix ??= [];
  upsertBy(manifest.artifactMatrix, "kind", { kind: "motion-definition-arm-left-2", file: MOTION_URL, runtimeServed: true, owner: CLUSTER_ID, status: "phase-6-arm-left-2-verified" });
  return manifest;
}
function updateValidation(validation, motion, manifest) {
  validation.phase = "phase-6";
  validation.status = "partial-runtime-ready";
  validation.runtimeReady = false;
  validation.motionReady = true;
  const checks = validation.checks ?? [];
  const phase6Checks = [
    { id: "arm-left-2-cad-chain", passed: motion.parentId === PARENT_ID && motion.driver.dependencyPartId === CHAIN_ID && motion.sourceEvidence.driverMates.includes(COINCIDENT_MATE), detail: "arm_left_2-1 is chained to the verified arm_left_1-1 checkpoint by Coincident3." },
    { id: "arm-left-2-driver-mates", passed: motion.driver.partId === DRIVER_ID && motion.driver.sourceMates.includes(CONCENTRIC_MATE) && motion.validation.concentricAxisAlignmentDot >= 1 - 1e-8, detail: "Concentric2 preserves the arm_left_2-1 to oc_left-1 axis relation." },
    { id: "arm-left-2-arm-left-3-connection", passed: motion.connection?.mate === PATH_CONNECTION_MATE && motion.connection.targetPartId === ARM3_ID && motion.validation.connectionPathResidualMeters <= TOLERANCE_METERS && motion.validation.connectionLimitDistanceResidualMeters <= TOLERANCE_METERS, detail: "PathMate10 now records the arm_left_2-1 point on arm_left_3-1 Sketch1 Line1, with LimitDistance1 checked at the same CAD position." },
    { id: "arm-left-2-initial-transform", passed: motion.validation.glbMatrixResidual <= 1e-5 && motion.validation.initialMatingPointResidualMeters <= TOLERANCE_METERS, detail: "The final.glb arm node and the CAD Coincident3 point agree at progress 0." },
    { id: "arm-left-2-cumulative-samples", passed: motion.samples.length === 3 && motion.validation.sampleProgress.join(",") === "0,0.5,1", detail: "The arm is tested at progress 0, 0.5 and 1 using the verified CAD chain." },
    { id: "arm-left-2-single-render-owner", passed: manifest.parts.find((part) => part.id === TARGET_ID)?.render?.asset === FINAL_GLB_URL, detail: "arm_left_2-1 remains owned by final.glb; no separate overlay is loaded." },
    { id: "arm-left-2-preserves-previous-parts", passed: manifest.parts.find((part) => part.id === CHAIN_ID)?.connectionStatus === "runtime-arm-left-1-ready" && manifest.parts.find((part) => part.id === DRIVER_ID)?.connectionStatus === "runtime-oc-left-ready", detail: "The previously verified arm_left_1-1 and oc_left-1 records remain ready." },
  ];
  for (const check of phase6Checks) upsertBy(checks, "id", check);
  validation.checks = checks;
  validation.armLeft2 = { file: MOTION_URL, status: motion.status, samples: clone(motion.samples), toleranceMeters: TOLERANCE_METERS };
  validation.runtimeBlockers = ["PathMate11 and LimitDistance2 remain evidence for later wiper_gear-dependent work.", "The remaining cluster-03 components still require later CAD normalization phases."];
  return validation;
}
function validateMotion(motion, evidence, inventory, driverMotion, previousMotion) {
  assert(motion.schemaVersion === CONTRACT_VERSION && motion.status === "verified" && motion.runtimeReady === true, "motion artifact is not verified");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion identity mismatch");
  assert(motion.motion?.kind === "driver-follow" && motion.motion.preserveInitialOrientation === true, "motion is not a rigid driver-follow");
  assert(motion.driver?.partId === DRIVER_ID && motion.driver.motionFile === DRIVER_MOTION_URL && motion.driver.dependencyPartId === CHAIN_ID && motion.driver.dependencyMotionFile === CHAIN_MOTION_URL, "driver chain changed");
  assert(motion.driver.sourceMates.includes(COINCIDENT_MATE) && motion.driver.sourceMates.includes(CONCENTRIC_MATE), "driver mates changed");
  assert(motion.connection?.mate === PATH_CONNECTION_MATE && motion.connection.targetPartId === ARM3_ID, "arm_left_3 point connection changed");
  assert(motion.validation.connectionPathResidualMeters <= TOLERANCE_METERS && motion.validation.connectionLimitDistanceResidualMeters <= TOLERANCE_METERS, "arm_left_2 to arm_left_3 connection exceeds tolerance");
  assert(motion.path.sourceFeature === driverMotion.path.sourceFeature && previousMotion.status === "verified", "driver path chain changed");
  assert(motion.samples?.length === 3 && motion.validation.sampleProgress.join(",") === "0,0.5,1", "motion samples changed");
  assert(motion.validation.concentricAxisAlignmentDot >= 1 - 1e-8 && motion.validation.glbMatrixResidual <= 1e-5 && motion.validation.initialMatingPointResidualMeters <= TOLERANCE_METERS, "arm_left_2 validation exceeds tolerance");
  assert(evidence.source?.readOnlyIntent === true && evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "CAD evidence source changed");
}
function main() {
  const evidence = readJson(evidencePath);
  const arm3Evidence = readJson(arm3EvidencePath);
  const previousEvidence = readJson(previousEvidencePath);
  const inventory = readJson(inventoryPath);
  const driverMotion = readJson(driverMotionPath);
  const previousMotion = readJson(previousMotionPath);
  const glb = readGlbJson(glbPath);
  const motion = createMotion(inventory, evidence, arm3Evidence, previousEvidence, driverMotion, previousMotion, glb);
  if (process.argv.includes("--check")) {
    const storedMotion = readJson(motionPath);
    const manifest = readJson(manifestPath);
    const validation = readJson(validationPath);
    validateMotion(storedMotion, evidence, inventory, driverMotion, previousMotion);
    assert(JSON.stringify(storedMotion) === JSON.stringify(motion), "stored arm-left-2 artifact is stale; regenerate it");
    assert(["phase-6-arm-left-2-ready", "phase-6-arm-left-3-ready"].includes(manifest.status), "manifest is not at or beyond arm_left_2");
    assert(manifest.motionFiles.includes(MOTION_URL) && validation.phase === "phase-6" && validation.motionReady === true, "manifest/validation is not at arm_left_2 checkpoint");
    assert(validation.checks.every((check) => check.passed === true), "validation contains a failed check");
    console.log(JSON.stringify({ status: "verified", phase: "phase-6", part: TARGET_ID, mode: "check" }, null, 2));
    return;
  }
  const manifest = updateManifest(readJson(manifestPath), motion);
  const validation = updateValidation(readJson(validationPath), motion, manifest);
  validateMotion(motion, evidence, inventory, driverMotion, previousMotion);
  assert(validation.checks.every((check) => check.passed === true), "Phase 6 arm_left_2 validation contains a failed check");
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(motionPath, motion);
  writeJson(manifestPath, manifest);
  writeJson(validationPath, validation);
  console.log(JSON.stringify({ status: "verified", phase: "phase-6", part: TARGET_ID, output: path.relative(repoRoot, motionPath) }, null, 2));
}
main();
