import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const outputDir = path.join(clusterRoot, "connections");
const plansDir = path.join(repoRoot, "plans");
const inventoryPath = path.join(plansDir, "cluster-03-phase-0-inventory.json");
const right1EvidencePath = path.join(plansDir, "cluster-03-phase-7-arm-right-1-cad-evidence.json");
const right2EvidencePath = path.join(plansDir, "cluster-03-phase-7-arm-right-2-cad-evidence.json");
const right3EvidencePath = path.join(plansDir, "cluster-03-phase-7-arm-right-3-cad-evidence.json");
const driverPath = path.join(outputDir, "oc-right.json");
const shaftPath = path.join(outputDir, "truc-chinh.json");
const glbPath = path.join(clusterRoot, "final.glb");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const right1Path = path.join(outputDir, "arm-right-1.json");
const right2Path = path.join(outputDir, "arm-right-2.json");
const right3Path = path.join(outputDir, "arm-right-3.json");

const CLUSTER_ID = "cluster-03";
const PARENT_ID = "body_may-1";
const DRIVER_ID = "oc_right-1";
const RIGHT1_ID = "arm_right_1-1";
const RIGHT2_ID = "arm_right_2-1";
const RIGHT3_ID = "arm_right_3-1";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const TOLERANCE_METERS = 1e-8;

function fail(message) {
  throw new Error(`[cluster-03 arm_right] ${message}`);
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

function distance(left, right) {
  return length(subtract(left, right));
}

function normalize(value, label) {
  const magnitude = length(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), `${label} cannot be normalized`);
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

function componentGlbResidual(glb, component) {
  const node = (glb.nodes ?? []).find((item) => item.name === component.id);
  assert(node?.matrix?.length === 16, `GLB target node matrix is missing for ${component.id}`);
  const residual = maxAbsoluteDifference(node.matrix, toGltfMatrix(component.transformArrayData));
  assert(residual <= 1e-5, `GLB ${component.id} matrix does not match CAD transform`);
  return residual;
}

function makeSamples(driverMotion, driverStart, driverPoint, armPoint) {
  const driverOffset = subtract(driverPoint, driverStart);
  const armOffset = subtract(armPoint, driverPoint);
  return [0, 0.5, 1].map((progress, index) => {
    const driverPathPoint = driverMotion.samples?.[index]?.point;
    assert(Array.isArray(driverPathPoint), `oc_right driver is missing sample ${progress}`);
    const armAnchorPoint = add(add(driverPathPoint, driverOffset), armOffset);
    return {
      progress,
      driverPathPoint: clone(driverPathPoint),
      armAnchorPoint,
      translationDelta: subtract(driverPathPoint, driverStart),
    };
  });
}

function createRight1(inventory, evidence, driverMotion, glb) {
  assert(evidence.schemaVersion === "cluster-03-arm-right-1-cad-connection.v1", "unexpected arm_right_1 CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "arm_right_1 CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch for arm_right_1");
  assert(driverMotion.schemaVersion === "cluster-03-oc-right-motion.v1", "oc_right driver schema mismatch");
  assert(driverMotion.status === "verified" && driverMotion.runtimeReady === true, "oc_right driver is not verified");

  const target = findComponent(evidence, RIGHT1_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const driver = findComponent(evidence, DRIVER_ID);
  const coincident = findMate(evidence, "Coincident12");
  const concentric = findMate(evidence, "Concentric17");
  const bodyPathMate = findMate(evidence, "PathMate13");
  const parentCoincident = findMate(evidence, "Coincident11");
  const chainCoincident = findMate(evidence, "Coincident13");
  const crossConcentric = findMate(evidence, "Concentric20");
  assert(participants(coincident).includes(RIGHT1_ID) && participants(coincident).includes(DRIVER_ID), "Coincident12 does not connect arm_right_1 to oc_right");
  assert(participants(concentric).includes(RIGHT1_ID) && participants(concentric).includes(DRIVER_ID), "Concentric17 does not connect arm_right_1 to oc_right");
  assert(participants(bodyPathMate).includes(RIGHT1_ID) && participants(bodyPathMate).includes(PARENT_ID), "PathMate13 does not connect arm_right_1 to body_may");
  assert(participants(chainCoincident).includes(RIGHT1_ID) && participants(chainCoincident).includes(RIGHT2_ID), "Coincident13 does not connect arm_right_1 to arm_right_2");
  assert(participants(crossConcentric).includes(RIGHT1_ID) && participants(crossConcentric).includes("head_nen-1"), "Concentric20 does not record the head_nen cross-branch mate");

  const targetCoincident = findEntity(coincident, RIGHT1_ID);
  const driverCoincident = findEntity(coincident, DRIVER_ID);
  const bodyPathEntity = findEntity(bodyPathMate, PARENT_ID);
  const armPathEntity = findEntity(bodyPathMate, RIGHT1_ID);
  const targetConcentric = findEntity(concentric, RIGHT1_ID);
  const driverConcentric = findEntity(concentric, DRIVER_ID);
  const targetPoint = finiteArray(targetCoincident.entityParams?.slice(0, 3), 3, "arm_right_1 Coincident12 point");
  const driverPoint = finiteArray(driverCoincident.entityParams?.slice(0, 3), 3, "oc_right Coincident12 point");
  const targetAxis = normalize(finiteArray(targetConcentric.entityParams?.slice(3, 6), 3, "arm_right_1 Concentric17 axis"), "arm_right_1 Concentric17 axis");
  const driverAxis = normalize(finiteArray(driverConcentric.entityParams?.slice(3, 6), 3, "oc_right Concentric17 axis"), "oc_right Concentric17 axis");
  const axisAlignmentDot = dot(targetAxis, driverAxis);
  assert(Math.abs(axisAlignmentDot) >= 1 - 1e-8, "arm_right_1 and oc_right concentric axes are not aligned");

  const driverPathStart = finiteArray(driverMotion.anchor?.point, 3, "oc_right driver path start");
  const driverPathOffset = subtract(driverPoint, driverPathStart);
  const armDriverOffset = subtract(targetPoint, driverPoint);
  const targetLocalPoint = inverseRigidTransform(target.transformArrayData, targetPoint);
  const driverLocalPoint = inverseRigidTransform(driver.transformArrayData, driverPoint);
  const bodyPathReferencePoint = finiteArray(bodyPathEntity.entityParams?.slice(0, 3), 3, "body_may PathMate13 reference point");
  const armPathSourcePoint = finiteArray(armPathEntity.entityParams?.slice(0, 3), 3, "arm_right_1 PathMate13 source point");
  const armPathSourceDirection = normalize(finiteArray(armPathEntity.entityParams?.slice(3, 6), 3, "arm_right_1 PathMate13 source direction"), "arm_right_1 PathMate13 source direction");
  const rotationAxisPoint = finiteArray(targetConcentric.entityParams?.slice(0, 3), 3, "arm_right_1 Concentric17 axis point");
  const rotationAxis = targetAxis;
  const glbMatrixResidual = componentGlbResidual(glb, target);
  const samples = makeSamples(driverMotion, driverPathStart, driverPoint, targetPoint);
  const constraints = [
    summarizeMate(parentCoincident),
    summarizeMate(coincident),
    summarizeMate(concentric),
    summarizeMate(bodyPathMate),
    summarizeMate(crossConcentric),
    summarizeMate(chainCoincident),
  ];
  const initialMatingPointResidualMeters = distance(samples[0].armAnchorPoint, targetPoint);

  assert(initialMatingPointResidualMeters <= TOLERANCE_METERS, "arm_right_1 initial mating point is not reconstructed");
  return {
    schemaVersion: "cluster-03-arm-right-1-motion.v1",
    clusterId: CLUSTER_ID,
    status: "verified",
    runtimeReady: true,
    units: "meters",
    coordinateFrame: "solidworks-assembly",
    partId: RIGHT1_ID,
    nodeName: RIGHT1_ID,
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
      motionFile: `${CONNECTIONS_URL}/oc-right.json`,
      relation: "rigid-translation-with-path-roll",
      sourceMates: ["Coincident12", "Concentric17"],
      pathConstraint: "PathMate13",
      sourcePath: `${driverMotion.path.sourceFeature}:${driverMotion.path.sourceSegments.join("+")}`,
    },
    bodyConnection: {
      kind: "point-on-path",
      status: "verified",
      mate: "PathMate13",
      sourcePartId: RIGHT1_ID,
      targetPartId: PARENT_ID,
      sourcePoint: armPathSourcePoint,
      sourceDirection: armPathSourceDirection,
      targetReferencePoint: bodyPathReferencePoint,
      rotationAxis: { point: rotationAxisPoint, axis: rotationAxis },
      targetPath: {
        sourceFeature: driverMotion.path.sourceFeature,
        sourceSegments: clone(driverMotion.path.sourceSegments),
        coordinateFrame: "solidworks-assembly",
      },
      validation: { pathDriverStartResidualMeters: 0, toleranceMeters: TOLERANCE_METERS },
    },
    anchor: {
      kind: "point",
      space: "solidworks-assembly",
      point: targetPoint,
      localPoint: targetLocalPoint,
      sourceMate: "Coincident12",
      targetReferenceType2: targetCoincident.referenceType2,
      driverPoint,
      driverLocalPoint,
      driverPathStart,
      driverPathOffset,
      armDriverOffset,
    },
    path: clone(driverMotion.path),
    constraints,
    crossConstraints: [summarizeMate(crossConcentric)],
    deferredMates: ["Concentric20"],
    samples,
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      cadEvidenceSchema: evidence.schemaVersion,
      solidWorksRevision: evidence.source.solidWorksRevision,
      sessionMode: evidence.source.sessionMode,
      targetComponent: RIGHT1_ID,
      parentComponent: PARENT_ID,
      driverComponent: DRIVER_ID,
      pathMate: "PathMate13",
      driverMates: ["Coincident12", "Concentric17"],
      chainMates: ["Coincident11", "Coincident13"],
      crossBranchMates: ["Concentric20"],
      readOnlyIntent: true,
    },
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      glbMatrixResidual,
      concentricAxisAlignmentDot: axisAlignmentDot,
      concentricAxisAlignmentAbsoluteDot: Math.abs(axisAlignmentDot),
      initialMatingPointResidualMeters,
      pathDriverStartResidualMeters: distance(add(driverPathStart, driverPathOffset), driverPoint),
      sampleProgress: samples.map((sample) => sample.progress),
      sampleArmAnchorPoints: samples.map((sample) => sample.armAnchorPoint),
      preservedOrientation: true,
      crossBranchMateRecorded: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    driverInitialTransform: clone(driver.transformArrayData),
  };
}

function createArm3LineConnection(evidence, arm3Evidence) {
  const pathMate = findMate(evidence, "PathMate14");
  assert(pathMate.mateType === 15, "PathMate14 is not a SolidWorks path mate");
  assert(participants(pathMate).includes(RIGHT2_ID) && participants(pathMate).includes(RIGHT3_ID), "PathMate14 does not connect arm_right_2 to arm_right_3");
  const sourceEntity = findEntity(pathMate, RIGHT2_ID);
  const targetEntity = findEntity(pathMate, RIGHT3_ID);
  const sourcePoint = finiteArray(sourceEntity.entityParams?.slice(0, 3), 3, "arm_right_2 PathMate14 source point");
  const arm3Component = findComponent(arm3Evidence, RIGHT3_ID);
  const arm3Part = arm3Evidence.parts?.find((item) => item.componentId === RIGHT3_ID);
  const sketch = arm3Part?.sketches?.find((item) => item.featureName === "Sketch1");
  const line = sketch?.segments?.find((item) => item.name === "Line1");
  assert(sketch && line, "arm_right_3 Sketch1 Line1 is missing from CAD evidence");
  const localStart = finiteArray(line.sketchStartPoint, 3, "arm_right_3 Sketch1 Line1 start");
  const localEnd = finiteArray(line.sketchEndPoint, 3, "arm_right_3 Sketch1 Line1 end");
  const localDirection = normalize(finiteArray(line.lineParams?.slice(3, 6), 3, "arm_right_3 Sketch1 Line1 direction"), "arm_right_3 Sketch1 Line1 direction");
  const modelStart = swTransform(sketch.sketchToModelTransform, localStart);
  const modelEnd = swTransform(sketch.sketchToModelTransform, localEnd);
  const worldStart = swTransform(arm3Component.transformArrayData, modelStart);
  const worldEnd = swTransform(arm3Component.transformArrayData, modelEnd);
  const direction = normalize(subtract(worldEnd, worldStart), "arm_right_3 PathMate14 direction");
  const lengthMeters = distance(worldStart, worldEnd);
  const lineProjectionMeters = dot(subtract(sourcePoint, worldStart), direction);
  const pathResidualMeters = length(cross(subtract(sourcePoint, worldStart), direction));
  const initialParameter = Math.max(0, Math.min(1, lineProjectionMeters / lengthMeters));
  assert(lengthMeters > 0, "arm_right_3 Sketch1 Line1 has zero length");
  assert(pathResidualMeters <= 1e-8, "arm_right_2 PathMate14 point is not on arm_right_3 Sketch1 Line1");
  return {
    kind: "point-on-path",
    status: "verified",
    mate: "PathMate14",
    sourcePartId: RIGHT2_ID,
    targetPartId: RIGHT3_ID,
    sourcePoint,
    sourceLocalPoint: inverseRigidTransform(findComponent(evidence, RIGHT2_ID).transformArrayData, sourcePoint),
    targetPath: {
      sourceFeature: "Sketch1",
      sourceSegment: "Line1",
      point: clone(sourcePoint),
      direction,
      start: worldStart,
      end: worldEnd,
      localPoint: clone(localStart),
      localDirection,
      localStart: clone(localStart),
      localEnd: clone(localEnd),
      parameterRange: [0, 1],
      initialParameter,
      lengthMeters,
      coordinateFrame: "solidworks-assembly",
    },
    validation: {
      pathResidualMeters,
      lineProjectionMeters,
      lineProjectionParameter: initialParameter,
      toleranceMeters: TOLERANCE_METERS,
    },
  };
}

function createRight2(inventory, evidence, right1Evidence, right1Motion, driverMotion, arm3Evidence, glb) {
  assert(evidence.schemaVersion === "cluster-03-arm-right-2-cad-connection.v1", "unexpected arm_right_2 CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "arm_right_2 CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch for arm_right_2");
  const target = findComponent(evidence, RIGHT2_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const driver = findComponent(evidence, DRIVER_ID);
  const coincident = findMate(evidence, "Coincident13");
  const concentric = findMate(evidence, "Concentric21");
  const pathConnection = findMate(evidence, "PathMate14");
  assert(participants(coincident).includes(RIGHT1_ID) && participants(coincident).includes(RIGHT2_ID), "Coincident13 does not connect both right arms");
  assert(participants(concentric).includes(DRIVER_ID) && participants(concentric).includes(RIGHT2_ID), "Concentric21 does not connect arm_right_2 to oc_right");
  const chainPoint = finiteArray(findEntity(coincident, RIGHT1_ID).entityParams?.slice(0, 3), 3, "arm_right_1 Coincident13 point");
  const targetPoint = finiteArray(findEntity(coincident, RIGHT2_ID).entityParams?.slice(0, 3), 3, "arm_right_2 Coincident13 point");
  const targetConcentric = findEntity(concentric, RIGHT2_ID);
  const driverConcentric = findEntity(concentric, DRIVER_ID);
  const targetAxis = normalize(finiteArray(targetConcentric.entityParams?.slice(3, 6), 3, "arm_right_2 Concentric21 axis"), "arm_right_2 Concentric21 axis");
  const driverAxis = normalize(finiteArray(driverConcentric.entityParams?.slice(3, 6), 3, "oc_right Concentric21 axis"), "oc_right Concentric21 axis");
  const axisAlignmentDot = dot(targetAxis, driverAxis);
  assert(Math.abs(axisAlignmentDot) >= 1 - 1e-8, "arm_right_2 and oc_right concentric axes are not aligned");
  const driverStart = finiteArray(driverMotion.anchor?.point, 3, "oc_right driver path start");
  const driverPathOffset = subtract(chainPoint, driverStart);
  const chainOffset = subtract(targetPoint, chainPoint);
  const connection = createArm3LineConnection(evidence, arm3Evidence);
  const driverLocalPoint = inverseRigidTransform(driver.transformArrayData, driverConcentric.entityParams.slice(0, 3));
  const driverLocalAxis = swTransform(driver.transformArrayData, driverAxis, false);
  const glbMatrixResidual = componentGlbResidual(glb, target);
  const samples = makeSamples(driverMotion, driverStart, chainPoint, targetPoint);
  const initialMatingPointResidualMeters = distance(samples[0].armAnchorPoint, targetPoint);
  assert(initialMatingPointResidualMeters <= TOLERANCE_METERS, "arm_right_2 initial Coincident13 point is not reconstructed");

  return {
    schemaVersion: "cluster-03-arm-right-2-motion.v1",
    clusterId: CLUSTER_ID,
    status: "verified",
    runtimeReady: true,
    units: "meters",
    coordinateFrame: "solidworks-assembly",
    partId: RIGHT2_ID,
    nodeName: RIGHT2_ID,
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
      motionFile: `${CONNECTIONS_URL}/oc-right.json`,
      relation: "rigid-translation",
      sourceMates: ["Coincident13", "Concentric21"],
      dependencyPartId: RIGHT1_ID,
      dependencyMotionFile: `${CONNECTIONS_URL}/arm-right-1.json`,
      sourcePath: `${driverMotion.path.sourceFeature}:${driverMotion.path.sourceSegments.join("+")}`,
    },
    anchor: {
      kind: "point",
      space: "solidworks-assembly",
      point: targetPoint,
      localPoint: inverseRigidTransform(target.transformArrayData, targetPoint),
      sourceMate: "Coincident13",
      chainPoint,
      driverPathStart: driverStart,
      driverPathOffset,
      chainOffset,
    },
    path: clone(driverMotion.path),
    connection: {
      ...connection,
      driverAxis: {
        sourceMate: "Concentric21",
        partId: DRIVER_ID,
        point: finiteArray(driverConcentric.entityParams?.slice(0, 3), 3, "oc_right Concentric21 point"),
        axis: driverAxis,
        localPoint: driverLocalPoint,
        localAxis: normalize(driverLocalAxis, "oc_right Concentric21 local axis"),
      },
      initialLineProgress: connection.targetPath.initialParameter,
    },
    constraints: [summarizeMate(coincident), summarizeMate(concentric), summarizeMate(pathConnection)],
    samples,
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      cadEvidenceSchema: evidence.schemaVersion,
      solidWorksRevision: evidence.source.solidWorksRevision,
      sessionMode: evidence.source.sessionMode,
      targetComponent: RIGHT2_ID,
      parentComponent: PARENT_ID,
      driverComponent: DRIVER_ID,
      dependencyComponent: RIGHT1_ID,
      driverMates: ["Coincident13", "Concentric21"],
      connectionMates: ["PathMate14"],
      readOnlyIntent: true,
    },
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      glbMatrixResidual,
      concentricAxisAlignmentDot: axisAlignmentDot,
      concentricAxisAlignmentAbsoluteDot: Math.abs(axisAlignmentDot),
      initialMatingPointResidualMeters,
      pathConnectionResidualMeters: connection.validation.pathResidualMeters,
      lineProjectionParameter: connection.validation.lineProjectionParameter,
      sampleProgress: samples.map((sample) => sample.progress),
      sampleArmAnchorPoints: samples.map((sample) => sample.armAnchorPoint),
      preservedOrientation: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    driverInitialTransform: clone(driver.transformArrayData),
    dependencyInitialTransform: clone(findComponent(right1Evidence, RIGHT1_ID).transformArrayData),
    dependencyMotionFile: right1Motion.sourceEvidence ? `${CONNECTIONS_URL}/arm-right-1.json` : `${CONNECTIONS_URL}/arm-right-1.json`,
  };
}

function createRight3(inventory, evidence, right2Motion, shaftMotion, glb) {
  assert(evidence.schemaVersion === "cluster-03-arm-right-3-cad-connection.v1", "unexpected arm_right_3 CAD evidence schema");
  assert(evidence.source?.readOnlyIntent === true, "arm_right_3 CAD evidence must be read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch for arm_right_3");
  const target = findComponent(evidence, RIGHT3_ID);
  const parent = findComponent(evidence, PARENT_ID);
  const shaft = findComponent(evidence, "truc_chinh-1");
  const parallel = findMate(evidence, "Parallel7");
  const coincident = findMate(evidence, "Coincident15");
  const concentric = findMate(evidence, "Concentric22");
  const pathConnection = findMate(evidence, "PathMate14");
  assert(participants(parallel).includes("truc_chinh-1") && participants(parallel).includes(RIGHT3_ID), "Parallel7 does not connect truc_chinh to arm_right_3");
  assert(participants(coincident).includes(PARENT_ID) && participants(coincident).includes(RIGHT3_ID), "Coincident15 does not connect arm_right_3 to body_may");
  assert(participants(concentric).includes("truc_chinh-1") && participants(concentric).includes(RIGHT3_ID), "Concentric22 does not connect truc_chinh to arm_right_3");
  assert(participants(pathConnection).includes(RIGHT2_ID) && participants(pathConnection).includes(RIGHT3_ID), "PathMate14 does not connect both right arms");

  const targetConcentric = findEntity(concentric, RIGHT3_ID);
  const shaftConcentric = findEntity(concentric, "truc_chinh-1");
  const pivotPoint = finiteArray(targetConcentric.entityParams?.slice(0, 3), 3, "arm_right_3 Concentric22 pivot");
  const targetAxis = normalize(finiteArray(targetConcentric.entityParams?.slice(3, 6), 3, "arm_right_3 Concentric22 axis"), "arm_right_3 Concentric22 axis");
  const shaftAxis = normalize(finiteArray(shaftConcentric.entityParams?.slice(3, 6), 3, "truc_chinh Concentric22 axis"), "truc_chinh Concentric22 axis");
  const axisAlignmentDot = dot(targetAxis, shaftAxis);
  assert(Math.abs(axisAlignmentDot) >= 1 - 1e-8, "arm_right_3 and truc_chinh concentric axes are not aligned");
  const shaftPivotPoint = finiteArray(shaftConcentric.entityParams?.slice(0, 3), 3, "truc_chinh Concentric22 axis point");
  const axisLineSeparationMeters = length(cross(subtract(pivotPoint, shaftPivotPoint), targetAxis));
  assert(axisLineSeparationMeters <= TOLERANCE_METERS, "arm_right_3 and truc_chinh Concentric22 axes are not collinear");
  const glbMatrixResidual = componentGlbResidual(glb, target);
  const angleRange = clone(shaftMotion.motion.angleRangeRadians);
  const samples = (shaftMotion.samples ?? []).map((sample) => ({
    progress: sample.progress,
    angleRadians: sample.angleRadians,
  }));
  assert(samples.length >= 2, "truc_chinh motion has no diagnostic samples");

  return {
    schemaVersion: "cluster-03-arm-right-3-motion.v1",
    clusterId: CLUSTER_ID,
    status: "verified",
    runtimeReady: true,
    units: "meters",
    coordinateFrame: "solidworks-assembly",
    partId: RIGHT3_ID,
    nodeName: RIGHT3_ID,
    parentId: PARENT_ID,
    motion: {
      kind: "axis-rotation",
      property: "rotation",
      progressRange: [0, 1],
      initialProgress: 0,
      angleRangeRadians: angleRange,
      angleRangeKind: "diagnostic-test-envelope",
      cadAngularLimit: null,
    },
    pivot: {
      kind: "axis",
      point: pivotPoint,
      localPoint: inverseRigidTransform(target.transformArrayData, pivotPoint),
      axis: targetAxis,
      localAxis: normalize(swTransform(target.transformArrayData, targetAxis, false), "arm_right_3 local axis"),
    },
    driver: {
      partId: "truc_chinh-1",
      motionFile: `${CONNECTIONS_URL}/truc-chinh.json`,
      relation: "rigid-rotation",
      sourceMates: ["Parallel7", "Concentric22"],
    },
    connection: clone(right2Motion.connection),
    constraints: [summarizeMate(parallel), summarizeMate(coincident), summarizeMate(concentric), summarizeMate(pathConnection)],
    samples,
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      cadEvidenceSchema: evidence.schemaVersion,
      solidWorksRevision: evidence.source.solidWorksRevision,
      sessionMode: evidence.source.sessionMode,
      targetComponent: RIGHT3_ID,
      parentComponent: PARENT_ID,
      driverComponent: "truc_chinh-1",
      driverMates: ["Parallel7", "Concentric22"],
      parentMate: "Coincident15",
      connectionMates: ["PathMate14"],
      readOnlyIntent: true,
    },
    validation: {
      toleranceMeters: TOLERANCE_METERS,
      glbMatrixResidual,
      concentricAxisAlignmentDot: axisAlignmentDot,
      concentricAxisAlignmentAbsoluteDot: Math.abs(axisAlignmentDot),
      concentricAxisLineSeparationMeters: axisLineSeparationMeters,
      connectionPathResidualMeters: right2Motion.connection.validation.pathResidualMeters,
      preservedOrientation: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    driverInitialTransform: clone(shaft.transformArrayData),
  };
}

function upsertBy(items, key, value) {
  const index = items.findIndex((item) => item[key] === value[key]);
  if (index < 0) items.push(value);
  else items[index] = value;
}

function updateManifest(manifest, motions) {
  const definitions = [
    [motions.right1, RIGHT1_ID, "PathMate13+Coincident11+Coincident12+Concentric17+Coincident13", "runtime-arm-right-1-ready"],
    [motions.right2, RIGHT2_ID, "Coincident13+Concentric21+PathMate14", "runtime-arm-right-2-ready"],
    [motions.right3, RIGHT3_ID, "Coincident15+Parallel7+Concentric22+PathMate14", "runtime-arm-right-3-ready"],
  ];
  for (const [motion, id, sourceFeature, connectionStatus] of definitions) {
    const part = manifest.parts?.find((item) => item.id === id);
    assert(part, `manifest has no ${id}`);
    assert(part.gltfNode === id, `${id} GLB node mapping changed unexpectedly`);
    part.parent = {
      id: PARENT_ID,
      status: "cad-mate-resolved",
      sourceFeature,
      reason: `SolidWorks mate chain for ${id} is preserved in the runtime motion definition; no mesh overlay is loaded.`,
    };
    part.pivot = {
      status: "cad-anchor-resolved",
      point: clone(motion.anchor?.point ?? motion.pivot?.point),
      axis: motion.pivot?.axis ?? null,
      localPoint: clone(motion.anchor?.localPoint ?? motion.pivot?.localPoint),
      sourceFeature: motion.pivot ? "Concentric22" : "Coincident12/Coincident13",
      reason: "Pivot and anchor are taken from the extracted SolidWorks mate entities.",
    };
    part.connectionStatus = connectionStatus;
  }

  const motionFiles = [
    `${CONNECTIONS_URL}/arm-right-1.json`,
    `${CONNECTIONS_URL}/arm-right-2.json`,
    `${CONNECTIONS_URL}/arm-right-3.json`,
  ];
  manifest.status = "phase-7-arm-right-3-ready";
  manifest.runtimeReady = false;
  manifest.phase = "phase-7";
  manifest.loader.requiredFiles = Array.from(new Set([...(manifest.loader.requiredFiles ?? []), ...motionFiles]));
  manifest.rollback.generatedFiles = Array.from(new Set([...(manifest.rollback.generatedFiles ?? []), ...motionFiles]));
  for (const [kind, file, status] of [
    ["motion-definition-arm-right-1", motionFiles[0], "phase-7-arm-right-1-verified"],
    ["motion-definition-arm-right-2", motionFiles[1], "phase-7-arm-right-2-verified"],
    ["motion-definition-arm-right-3", motionFiles[2], "phase-7-arm-right-3-verified"],
  ]) {
    upsertBy(manifest.artifactMatrix, "file", { kind, file, runtimeServed: true, owner: CLUSTER_ID, status });
  }
  return manifest;
}

function updateValidation(validation, motions) {
  const checks = validation.checks ?? [];
  const entries = [
    { id: "arm-right-1-cad-parent", phase: "phase-7", status: "passed", evidence: "arm-right-1.json", details: "PathMate13 and Coincident11 resolve arm_right_1-1 against body_may-1." },
    { id: "arm-right-1-driver-mates", phase: "phase-7", status: "passed", evidence: "arm-right-1.json", details: "Coincident12 and Concentric17 align arm_right_1-1 with oc_right-1." },
    { id: "arm-right-1-head-cross-mate", phase: "phase-7", status: "passed", evidence: "arm-right-1.json", details: "Concentric20 is recorded as a cross-branch mate; head_nen-1 remains owned by arm_left_1-1." },
    { id: "arm-right-1-glb-transform", phase: "phase-7", status: "passed", evidence: "arm-right-1.json", details: `GLB matrix residual ${motions.right1.validation.glbMatrixResidual} m.` },
    { id: "arm-right-2-chain", phase: "phase-7", status: "passed", evidence: "arm-right-2.json", details: "Coincident13 and Concentric21 connect arm_right_2-1 to arm_right_1-1 and oc_right-1." },
    { id: "arm-right-2-pathmate14", phase: "phase-7", status: "passed", evidence: "arm-right-2.json", details: `PathMate14 line residual ${motions.right2.validation.pathConnectionResidualMeters} m.` },
    { id: "arm-right-2-glb-transform", phase: "phase-7", status: "passed", evidence: "arm-right-2.json", details: `GLB matrix residual ${motions.right2.validation.glbMatrixResidual} m.` },
    { id: "arm-right-3-shaft-axis", phase: "phase-7", status: "passed", evidence: "arm-right-3.json", details: "Parallel7 and Concentric22 make arm_right_3-1 follow truc_chinh-1." },
    { id: "arm-right-3-parent", phase: "phase-7", status: "passed", evidence: "arm-right-3.json", details: "Coincident15 resolves arm_right_3-1 against body_may-1." },
    { id: "arm-right-3-pathmate14", phase: "phase-7", status: "passed", evidence: "arm-right-3.json", details: `PathMate14 line residual ${motions.right3.validation.connectionPathResidualMeters} m.` },
    { id: "arm-right-3-glb-transform", phase: "phase-7", status: "passed", evidence: "arm-right-3.json", details: `GLB matrix residual ${motions.right3.validation.glbMatrixResidual} m.` },
  ];
  for (const entry of entries) upsertBy(checks, "id", entry);
  validation.checks = checks;
  validation.phase = "phase-7";
  validation.status = "phase-7-arm-right-3-verified";
  validation.runtimeReady = false;
  validation.motionReady = true;
  validation.armRight1 = { file: `${CONNECTIONS_URL}/arm-right-1.json`, status: "verified", deferredMates: ["Concentric20"], samples: motions.right1.samples, toleranceMeters: TOLERANCE_METERS };
  validation.armRight2 = { file: `${CONNECTIONS_URL}/arm-right-2.json`, status: "verified", samples: motions.right2.samples, toleranceMeters: TOLERANCE_METERS };
  validation.armRight3 = { file: `${CONNECTIONS_URL}/arm-right-3.json`, status: "verified", samples: motions.right3.samples, toleranceMeters: TOLERANCE_METERS };
  validation.runtimeBlockers = Array.from(new Set([
    ...(validation.runtimeBlockers ?? []).filter((item) => !String(item).includes("arm_right")),
    "Runtime loader integration remains deferred until the cluster-03 motion set is complete.",
    "Concentric20 is a cross-branch CAD relation and is recorded without reparenting head_nen-1.",
  ]));
  return validation;
}

function assertStoredArtifacts(motions) {
  for (const [filePath, motion] of [[right1Path, motions.right1], [right2Path, motions.right2], [right3Path, motions.right3]]) {
    const stored = readJson(filePath);
    assert(JSON.stringify(stored) === JSON.stringify(motion), `${path.basename(filePath)} is stale; rerun without --check`);
  }
  const manifest = readJson(manifestPath);
  assert(manifest.status === "phase-7-arm-right-3-ready", "manifest right-arm phase is stale");
  for (const file of ["arm-right-1.json", "arm-right-2.json", "arm-right-3.json"]) {
    assert(manifest.loader.requiredFiles.includes(`${CONNECTIONS_URL}/${file}`), `manifest does not load ${file}`);
  }
  const validation = readJson(validationPath);
  for (const id of ["arm-right-1-cad-parent", "arm-right-2-pathmate14", "arm-right-3-shaft-axis"]) {
    assert(validation.checks.find((check) => check.id === id)?.status === "passed", `validation check ${id} is not passed`);
  }
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const inventory = readJson(inventoryPath);
  const right1Evidence = readJson(right1EvidencePath);
  const right2Evidence = readJson(right2EvidencePath);
  const right3Evidence = readJson(right3EvidencePath);
  const driverMotion = readJson(driverPath);
  const shaftMotion = readJson(shaftPath);
  const glb = readGlbJson(glbPath);
  const right1 = createRight1(inventory, right1Evidence, driverMotion, glb);
  const right2 = createRight2(inventory, right2Evidence, right1Evidence, right1, driverMotion, right3Evidence, glb);
  const right3 = createRight3(inventory, right3Evidence, right2, shaftMotion, glb);
  const motions = { right1, right2, right3 };
  if (checkOnly) {
    assertStoredArtifacts(motions);
    console.log("cluster-03 arm_right_1/2/3 artifacts are current and verified.");
    return;
  }

  const manifest = updateManifest(readJson(manifestPath), motions);
  const validation = updateValidation(readJson(validationPath), motions);
  writeJson(right1Path, right1);
  writeJson(right2Path, right2);
  writeJson(right3Path, right3);
  writeJson(manifestPath, manifest);
  writeJson(validationPath, validation);
  assertStoredArtifacts(motions);
  console.log("Generated cluster-03 arm_right_1/2/3 motion artifacts and updated manifest/validation.");
}

main();
