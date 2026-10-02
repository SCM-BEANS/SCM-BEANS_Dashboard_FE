import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-3-oc-left-cad-evidence.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const motionPath = path.join(outputDir, "oc-left.json");

const CLUSTER_ID = "cluster-03";
const CONTRACT_VERSION = "cluster-03-oc-left-motion.v1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = `${CONNECTIONS_URL}/oc-left.json`;
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TARGET_ID = "oc_left-1";
const PARENT_ID = "body_may-1";
const PATH_MATE = "PathMate7";
const TOLERANCE_METERS = 1e-8;

function fail(message) {
  throw new Error(`[cluster-03 oc_left] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing input: ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteArray(value, expectedLength, label) {
  assert(Array.isArray(value) && value.length === expectedLength, `${label} must have ${expectedLength} values`);
  assert(value.every((item) => typeof item === "number" && Number.isFinite(item)), `${label} contains a non-finite value`);
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

function transformSketchPoint(sketch, component, point) {
  return swTransform(component.transformArrayData, swTransform(sketch.sketchToModelTransform, point));
}

function transformSketchVector(sketch, component, vector) {
  return swTransform(component.transformArrayData, swTransform(sketch.sketchToModelTransform, vector, false), false);
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function scale(value, factor) {
  return value.map((item) => item * factor);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function length(value) {
  return Math.sqrt(dot(value, value));
}

function normalize(value, label) {
  const magnitude = length(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), `${label} cannot be normalized`);
  return scale(value, 1 / magnitude);
}

function distance(left, right) {
  return length(subtract(left, right));
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

function findComponent(evidence, id) {
  const component = evidence.components?.find((item) => item.id === id);
  assert(component, `CAD evidence has no component ${id}`);
  return component;
}

function findPart(evidence, componentId) {
  const part = evidence.parts?.find((item) => item.componentId === componentId);
  assert(part, `CAD evidence has no part ${componentId}`);
  return part;
}

function findSketch(part, featureName) {
  const sketch = part.sketches?.find((item) => item.featureName === featureName);
  assert(sketch, `CAD evidence has no ${part.componentId}:${featureName}`);
  return sketch;
}

function findSegment(sketch, predicate, label) {
  const segment = sketch.segments?.find(predicate);
  assert(segment, `CAD evidence has no ${label} in ${sketch.featureName}`);
  return segment;
}

function findPathMate(evidence) {
  const mate = evidence.mates?.find((item) => item.name === PATH_MATE);
  assert(mate, `CAD evidence has no ${PATH_MATE}`);
  assert(mate.mateType === 15, `${PATH_MATE} is not a SolidWorks path mate`);
  assert(
    mate.entities?.some((entity) => entity.referenceComponentId === TARGET_ID)
      && mate.entities?.some((entity) => entity.referenceComponentId === PARENT_ID),
    `${PATH_MATE} does not connect ${TARGET_ID} to ${PARENT_ID}`,
  );
  return mate;
}

function pathPointAt(path, progress) {
  const arc = path.segments[0];
  const line = path.segments[1];
  const arcDistance = arc.lengthMeters;
  const lineDistance = line.lengthMeters;
  const totalDistance = arcDistance + lineDistance;
  const distanceAlongPath = Math.max(0, Math.min(1, progress)) * totalDistance;
  if (distanceAlongPath <= arcDistance) {
    const t = arcDistance === 0 ? 1 : distanceAlongPath / arcDistance;
    const angle = arc.sweepRadians * t;
    const basisX = normalize(subtract(arc.start, arc.center), "arc start vector");
    const basisY = normalize(cross(arc.normal, basisX), "arc basis");
    return add(
      arc.center,
      add(scale(basisX, arc.radius * Math.cos(angle)), scale(basisY, arc.radius * Math.sin(angle))),
    );
  }
  const t = lineDistance === 0 ? 1 : (distanceAlongPath - arcDistance) / lineDistance;
  return add(line.start, scale(subtract(line.end, line.start), t));
}

function createMotionArtifact(inventory, evidence) {
  assert(evidence.schemaVersion === "cluster-03-oc-left-cad-connection.v1", "unexpected CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");

  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const targetPart = findPart(evidence, TARGET_ID);
  const parentPart = findPart(evidence, PARENT_ID);
  const ocSketch = findSketch(targetPart, "Sketch1");
  const pathSketch = findSketch(parentPart, "Sketch1");
  const arcSegment = findSegment(pathSketch, (segment) => segment.isCircle && segment.name === "Arc3", "Arc3");
  const lineSegment = findSegment(pathSketch, (segment) => segment.isLine && segment.name === "Line1", "Line1");
  const pathMate = findPathMate(evidence);
  const anchorEntity = pathMate.entities.find((entity) => entity.referenceComponentId === TARGET_ID);
  const anchorWorld = finiteArray(anchorEntity.entityParams?.slice(0, 3), 3, `${PATH_MATE} target entity point`);

  const center = transformSketchPoint(pathSketch, parent, arcSegment.circleParams.slice(0, 3));
  const arcStart = transformSketchPoint(pathSketch, parent, arcSegment.sketchStartPoint);
  const arcEnd = transformSketchPoint(pathSketch, parent, arcSegment.sketchEndPoint);
  const lineStart = transformSketchPoint(pathSketch, parent, lineSegment.sketchStartPoint);
  const lineEnd = transformSketchPoint(pathSketch, parent, lineSegment.sketchEndPoint);
  const normal = normalize(transformSketchVector(pathSketch, parent, [0, 0, 1]), "Sketch1 normal");
  const radius = Number(arcSegment.circleParams[6]);
  const arcStartVector = normalize(subtract(arcStart, center), "Sketch1 arc start");
  const arcBasisY = normalize(cross(normal, arcStartVector), "Sketch1 arc basis");
  const arcEndVector = normalize(subtract(arcEnd, center), "Sketch1 arc end");
  const sweepRadians = Math.atan2(dot(arcEndVector, arcBasisY), dot(arcEndVector, arcStartVector));
  const arcLength = Math.abs(sweepRadians) * radius;
  const lineLength = distance(lineStart, lineEnd);
  const anchorLocal = inverseRigidTransform(target.transformArrayData, anchorWorld);
  const reconstructedAnchor = swTransform(target.transformArrayData, anchorLocal);

  assert(distance(anchorWorld, arcStart) <= TOLERANCE_METERS, `${PATH_MATE} anchor does not match Sketch1 arc start`);
  assert(distance(arcEnd, lineStart) <= TOLERANCE_METERS, "Sketch1 arc and line are not joined");
  assert(distance(anchorWorld, reconstructedAnchor) <= TOLERANCE_METERS, "oc_left anchor cannot be reconstructed from its component transform");
  assert(Math.abs(distance(center, arcStart) - radius) <= TOLERANCE_METERS, "Sketch1 arc radius does not match its start point");
  assert(Math.abs(distance(center, arcEnd) - radius) <= TOLERANCE_METERS, "Sketch1 arc radius does not match its end point");
  assert(arcLength > 0 && lineLength > 0, "Sketch1 motion path has no usable length");

  const path = {
    sourcePartId: PARENT_ID,
    sourceFeature: "Sketch1",
    sourceSegments: [arcSegment.name, lineSegment.name],
    coordinateFrame: "solidworks-assembly",
    segments: [
      {
        kind: "arc",
        sourceSegmentIndex: arcSegment.index,
        sourceSegmentName: arcSegment.name,
        center,
        start: arcStart,
        end: arcEnd,
        radius,
        normal,
        sweepRadians,
        lengthMeters: arcLength,
      },
      {
        kind: "line",
        sourceSegmentIndex: lineSegment.index,
        sourceSegmentName: lineSegment.name,
        start: lineStart,
        end: lineEnd,
        direction: normalize(subtract(lineEnd, lineStart), "Sketch1 line direction"),
        lengthMeters: lineLength,
      },
    ],
    lengthMeters: arcLength + lineLength,
    start: arcStart,
    end: lineEnd,
  };

  const sampleProgress = [0, 0.5, 1];
  const samples = sampleProgress.map((progress) => ({
    progress,
    point: pathPointAt(path, progress),
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
      kind: "path-follow",
      property: "translation",
      preserveInitialOrientation: true,
      progressRange: [0, 1],
      initialProgress: 0,
    },
    anchor: {
      kind: "point",
      space: "solidworks-assembly",
      point: anchorWorld,
      localPoint: anchorLocal,
      sourceMate: PATH_MATE,
      targetReferenceType2: anchorEntity.referenceType2,
    },
    path,
    samples,
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      cadEvidenceSchema: evidence.schemaVersion,
      solidWorksRevision: evidence.source.solidWorksRevision,
      sessionMode: evidence.source.sessionMode,
      targetComponent: TARGET_ID,
      parentComponent: PARENT_ID,
      mateFeature: PATH_MATE,
      targetSketch: `${TARGET_ID}:Sketch1`,
      pathSketch: `${PARENT_ID}:Sketch1`,
      readOnlyIntent: true,
    },
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      anchorToCadArcStartMeters: distance(anchorWorld, arcStart),
      arcToLineJoinMeters: distance(arcEnd, lineStart),
      anchorTransformResidualMeters: distance(anchorWorld, reconstructedAnchor),
      sampleProgress,
      samplePoints: samples.map((sample) => sample.point),
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    targetSketchEvidence: {
      featureName: ocSketch.featureName,
      segmentCount: ocSketch.segmentCount,
      sourceFile: "oc_left.SLDPRT",
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
  assert(part.gltfNode === TARGET_ID, `${TARGET_ID} GLB node mapping changed unexpectedly`);
  part.parent = {
    id: PARENT_ID,
    status: "cad-mate-resolved",
    sourceFeature: PATH_MATE,
    reason: `${PATH_MATE} connects ${TARGET_ID} to fixed ${PARENT_ID}; runtime parent is resolved from CAD evidence.`,
  };
  part.pivot = {
    status: "cad-anchor-resolved",
    point: clone(motion.anchor.point),
    axis: null,
    localPoint: clone(motion.anchor.localPoint),
    sourceFeature: PATH_MATE,
    reason: "The SolidWorks PathMate7 target reference is the translation anchor that must stay on body_may Sketch1.",
  };
  part.connectionStatus = "runtime-oc-left-ready";

  manifest.status = "phase-3-oc-left-ready";
  manifest.runtimeReady = false;
  manifest.motion = {
    status: "verified",
    runtimeReady: true,
    file: MOTION_URL,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    sourceFeature: PATH_MATE,
  };
  manifest.motionFile = MOTION_URL;
  manifest.loader.requiredFiles ??= [];
  if (!manifest.loader.requiredFiles.includes(MOTION_URL)) manifest.loader.requiredFiles.push(MOTION_URL);
  manifest.rollback.generatedFiles ??= [];
  if (!manifest.rollback.generatedFiles.includes(MOTION_URL)) manifest.rollback.generatedFiles.push(MOTION_URL);
  upsertByKey(manifest.artifactMatrix ?? (manifest.artifactMatrix = []), "kind", {
    kind: "motion-definition",
    file: MOTION_URL,
    runtimeServed: true,
    owner: "cluster-03",
    status: "phase-3-oc-left-verified",
  });
  return manifest;
}

function updateValidation(validation, motion, manifest) {
  validation.phase = "phase-3";
  validation.status = "partial-runtime-ready";
  validation.runtimeReady = false;
  validation.motionReady = true;
  const checks = validation.checks ?? [];
  const phase3Checks = [
    {
      id: "oc-left-cad-connection",
      passed: motion.status === "verified" && motion.parentId === PARENT_ID && motion.sourceEvidence.mateFeature === PATH_MATE,
      detail: "oc_left-1 is connected to body_may-1 through the verified SolidWorks PathMate7 evidence.",
    },
    {
      id: "oc-left-sketch-path-continuity",
      passed: motion.validation.anchorToCadArcStartMeters <= TOLERANCE_METERS
        && motion.validation.arcToLineJoinMeters <= TOLERANCE_METERS,
      detail: "The manifest-derived arc and line meet at the CAD Sketch1 endpoints without a gap.",
    },
    {
      id: "oc-left-initial-anchor",
      passed: motion.validation.anchorTransformResidualMeters <= TOLERANCE_METERS
        && manifest.parts.find((part) => part.id === TARGET_ID)?.connectionStatus === "runtime-oc-left-ready",
      detail: "The GLB node initial transform reconstructs the CAD PathMate7 anchor at progress 0.",
    },
    {
      id: "oc-left-single-render-owner",
      passed: manifest.parts.find((part) => part.id === TARGET_ID)?.render?.asset === FINAL_GLB_URL,
      detail: "oc_left-1 remains owned by final.glb; oc_left.glb is not loaded as an overlay.",
    },
  ];
  for (const check of phase3Checks) upsertByKey(checks, "id", check);
  const pendingCheck = checks.find((check) => check.id === "pending-state-explicit");
  if (pendingCheck) {
    pendingCheck.detail = "Unresolved CAD relationships remain explicit; only oc_left-1 is resolved in this phase.";
  }
  validation.checks = checks;
  validation.ocLeft = {
    file: MOTION_URL,
    status: motion.status,
    samples: clone(motion.samples),
    toleranceMeters: TOLERANCE_METERS,
  };
  validation.runtimeBlockers = [
    "Only oc_left-1 is connected in Phase 3; oc_right-1 remains intentionally untouched.",
    "The remaining cluster-03 components still require separate CAD mate normalization phases.",
  ];
  return validation;
}

function validateMotion(motion, evidence, inventory) {
  assert(motion.schemaVersion === CONTRACT_VERSION, "motion schema version mismatch");
  assert(motion.clusterId === CLUSTER_ID && motion.status === "verified" && motion.runtimeReady === true, "motion artifact is not verified");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion identity mismatch");
  assert(motion.path?.sourceFeature === "Sketch1", "motion path is not sourced from body_may Sketch1");
  assert(motion.samples?.length === 3, "motion artifact must contain progress 0, 0.5 and 1 samples");
  assert(motion.validation.anchorToCadArcStartMeters <= TOLERANCE_METERS, "motion anchor is not on the CAD arc start");
  assert(motion.validation.arcToLineJoinMeters <= TOLERANCE_METERS, "motion arc and line are not continuous");
  assert(motion.validation.anchorTransformResidualMeters <= TOLERANCE_METERS, "motion anchor does not match the target transform");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "motion evidence revision mismatch");
}

function main() {
  const evidence = readJson(evidencePath);
  const inventory = readJson(path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json"));
  const motion = createMotionArtifact(inventory, evidence);

  if (process.argv.includes("--check")) {
    const storedMotion = readJson(motionPath);
    const manifest = readJson(manifestPath);
    const validation = readJson(validationPath);
    validateMotion(storedMotion, evidence, inventory);
    assert(JSON.stringify(storedMotion) === JSON.stringify(motion), "stored oc-left artifact is stale; regenerate it");
    assert(
      [
        "phase-3-oc-left-ready",
        "phase-4-oc-right-ready",
        "phase-5-truc-chinh-ready",
        "phase-5-truc-nen-ready",
        "phase-5-gear-motor-chinh-ready",
        "phase-5-gear-motor-nen-ready",
        "phase-5-gear-nen-ready",
        "phase-6-arm-left-3-ready",
      ].includes(manifest.status),
      "manifest is not at or beyond the oc_left checkpoint",
    );
    assert(manifest.motionFile === MOTION_URL, "manifest motion file is stale");
    assert(
      ["phase-3", "phase-4", "phase-5", "phase-6"].includes(validation.phase)
        && validation.motionReady === true,
      "validation is not at the oc_left checkpoint",
    );
    assert(validation.checks.every((check) => check.passed === true), "validation contains a failed check");
    console.log(JSON.stringify({ status: "verified", phase: "phase-3", part: TARGET_ID, mode: "check" }, null, 2));
    return;
  }

  const manifest = updateManifest(readJson(manifestPath), motion);
  const validation = updateValidation(readJson(validationPath), motion, manifest);
  validateMotion(motion, evidence, inventory);
  assert(validation.checks.every((check) => check.passed === true), "Phase 3 validation contains a failed check");
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(motionPath, motion);
  writeJson(manifestPath, manifest);
  writeJson(validationPath, validation);
  console.log(JSON.stringify({ status: "verified", phase: "phase-3", part: TARGET_ID, output: path.relative(repoRoot, motionPath) }, null, 2));
}

main();
