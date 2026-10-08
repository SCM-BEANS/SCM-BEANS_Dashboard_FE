import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const motionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "arm-left-1.json");
const driverPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "oc-left.json");
const manifestPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "cluster-03.manifest.json");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-1-cad-evidence.json");
const gacEvidencePath = path.join(repoRoot, "plans", "cluster-03-phase-8-gac-coffee-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const glbPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "final.glb");

const TARGET_ID = "arm_left_1-1";
const DRIVER_ID = "oc_left-1";
const PARENT_ID = "body_may-1";
const ATTACHMENTS = [
  { partId: "head_nen-1", parentId: "arm_left_1-1", relation: "rigid-follow", sourceMates: ["Concentric13", "Concentric14", "Coincident8"] },
  { partId: "gac_coffee-1", parentId: "body_may-1", relation: "body-mounted-tangent-contact", motionParentId: "arm_left_1-1", motionRelation: "straight-body-bar-translation", sourceMates: ["Coincident10", "Tangent3"] },
];
const REQUIRED_FINAL_AGGREGATE_NODES = [
  "body_may-1",
  "oc_left-1",
  "oc_right-1",
  "truc_chinh-1",
  "truc_nen-1",
  "gear_motor_chinh-1",
  "gear_motor_nen-1",
  "gear_nen-1",
  "arm_left_1-1",
  "arm_left_2-1",
  "arm_left_3-1",
  "arm_right_1-1",
  "arm_right_2-1",
  "arm_right_3-1",
  "box_nen-1",
  "head_nen-1",
  "gac_coffee-1",
  "wiper_gear-1",
];
const TOLERANCE_METERS = 1e-8;

function fail(message) {
  throw new Error("[cluster-03 arm_left_1 validation] " + message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), "missing " + path.relative(repoRoot, filePath));
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function length(value) {
  return Math.sqrt(value.reduce((sum, item) => sum + item * item, 0));
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

function normalize(value) {
  const magnitude = length(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), "vector cannot be normalized");
  return scale(value, 1 / magnitude);
}

function isUnitVector(value, tolerance = 1e-8) {
  return Array.isArray(value) && value.length === 3 && Math.abs(length(value) - 1) <= tolerance;
}

function rotateVector(value, axis, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add(
    add(scale(value, cosine), scale(cross(axis, value), sine)),
    scale(axis, dot(axis, value) * (1 - cosine)),
  );
}

function unwrapAngleNear(angle, reference) {
  let result = angle;
  while (result - reference > Math.PI) result -= Math.PI * 2;
  while (result - reference < -Math.PI) result += Math.PI * 2;
  return result;
}

function getPathPoint(pathDefinition, progress) {
  const arc = pathDefinition.segments[0];
  const line = pathDefinition.segments[1];
  const distanceAlongPath = progress * pathDefinition.lengthMeters;
  if (distanceAlongPath <= arc.lengthMeters) {
    const center = arc.center;
    const basisX = normalize(subtract(arc.start, center));
    const basisY = normalize(cross(normalize(arc.normal), basisX));
    const angle = distanceAlongPath / arc.radius;
    return add(
      center,
      add(
        scale(basisX, arc.radius * Math.cos(angle)),
        scale(basisY, arc.radius * Math.sin(angle)),
      ),
    );
  }

  const lineProgress = Math.min(
    1,
    (distanceAlongPath - arc.lengthMeters) / line.lengthMeters,
  );
  return add(
    line.start,
    scale(subtract(line.end, line.start), lineProgress),
  );
}

function solveBodyPathAngle(connection, pathDefinition, progress, previousAngle) {
  const axis = normalize(connection.rotationAxis.axis);
  const direction = normalize(connection.sourceDirection);
  const pathStart = pathDefinition.start;
  const pathDelta = subtract(getPathPoint(pathDefinition, progress), pathStart);
  const movedAxisPoint = add(connection.rotationAxis.point, pathDelta);
  const sourceRelative = subtract(connection.sourcePoint, connection.rotationAxis.point);
  const targetRelative = subtract(connection.targetReferencePoint, movedAxisPoint);
  const quarterTurnDirection = cross(axis, direction);
  const cosineTerm = dot(cross(targetRelative, direction), axis);
  const sineTerm = dot(cross(targetRelative, quarterTurnDirection), axis);
  const constant = dot(cross(sourceRelative, direction), axis);
  const amplitude = Math.hypot(cosineTerm, sineTerm);
  assert(amplitude > 1e-12, "PathMate8 body solver is singular");
  assert(Math.abs(constant) <= amplitude + 1e-10, "PathMate8 body solver has no solution");

  const phase = Math.atan2(sineTerm, cosineTerm);
  const offset = Math.acos(Math.max(-1, Math.min(1, -constant / amplitude)));
  const candidates = [phase - offset, phase + offset]
    .map((angle) => unwrapAngleNear(angle, previousAngle))
    .map((angle) => {
      const resolvedSource = add(
        movedAxisPoint,
        rotateVector(sourceRelative, axis, angle),
      );
      const resolvedDirection = normalize(rotateVector(direction, axis, angle));
      const targetOffset = subtract(connection.targetReferencePoint, resolvedSource);
      return {
        angle,
        residualMeters: length(cross(targetOffset, resolvedDirection)),
      };
    })
    .sort(
      (left, right) =>
        Math.abs(left.angle - previousAngle) - Math.abs(right.angle - previousAngle) ||
        left.residualMeters - right.residualMeters,
    );
  const solution = candidates[0];
  assert(solution && solution.residualMeters <= 1e-7, "PathMate8 body line residual exceeds tolerance");
  return solution;
}

function main() {
  const motion = readJson(motionPath);
  const driver = readJson(driverPath);
  const manifest = readJson(manifestPath);
  const evidence = readJson(evidencePath);
  const gacEvidence = readJson(gacEvidencePath);
  const inventory = readJson(inventoryPath);
  const glb = readGlbJson(glbPath);
  const glbNodeNames = new Set((glb.nodes ?? []).map((node) => node.name));
  assert(
    REQUIRED_FINAL_AGGREGATE_NODES.every((nodeName) => glbNodeNames.has(nodeName)),
    "final.glb must remain the full cluster-03 aggregate; a single-part body_may.glb is not a valid replacement",
  );

  assert(motion.schemaVersion === "cluster-03-arm-left-1-motion.v1", "motion schema changed");
  assert(motion.status === "verified" && motion.runtimeReady === true, "motion is not runtime-ready");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion ownership changed");
  assert(motion.motion.kind === "driver-follow" && motion.motion.preserveInitialOrientation === true, "motion kind changed");
  assert(motion.driver.partId === DRIVER_ID && motion.driver.motionFile === "/models/digital-twin/cluster-03/connections/oc-left.json", "driver relation changed");
  assert(motion.driver.sourceMates.includes("Coincident1") && motion.driver.sourceMates.includes("Concentric1"), "driver mate evidence changed");
  assert(motion.driver.pathConstraint === "PathMate8", "PathMate8 evidence changed");
  assert(motion.bodyConnection?.kind === "point-on-path", "arm_left_1 body PathMate8 connection is missing");
  assert(motion.bodyConnection.mate === "PathMate8" && motion.bodyConnection.sourcePartId === TARGET_ID && motion.bodyConnection.targetPartId === PARENT_ID, "arm_left_1 body PathMate8 participants changed");
  assert(motion.bodyConnection.sourceDirection?.length === 3, "arm_left_1 body PathMate8 source direction is missing");
  assert(motion.bodyConnection.rotationAxis?.point?.length === 3 && motion.bodyConnection.rotationAxis?.axis?.length === 3, "arm_left_1 body PathMate8 rotation axis is missing");
  assert(motion.bodyConnection.targetPath?.sourceFeature === "Sketch1" && JSON.stringify(motion.bodyConnection.targetPath.sourceSegments) === JSON.stringify(["Arc3", "Line1"]), "arm_left_1 body PathMate8 path changed");
  assert(motion.bodyConnection.targetPath.coordinateFrame === "solidworks-assembly", "arm_left_1 body PathMate8 frame changed");
  assert(motion.bodyConnection.validation?.pathDriverStartResidualMeters <= motion.bodyConnection.validation?.toleranceMeters && motion.bodyConnection.validation?.toleranceMeters <= TOLERANCE_METERS, "arm_left_1 body PathMate8 residual exceeds tolerance");
  assert(Array.isArray(motion.attachments) && motion.attachments.length === ATTACHMENTS.length, "arm_left_1 attached parts are missing");
  for (const expected of ATTACHMENTS) {
    const attachment = motion.attachments.find((item) => item.partId === expected.partId);
    assert(attachment?.nodeName === expected.partId && attachment.parentId === expected.parentId, "attachment ownership changed for " + expected.partId);
    assert(attachment.relation === expected.relation, "attachment relation changed for " + expected.partId);
    if (expected.motionParentId) {
      assert(attachment.motionParentId === expected.motionParentId, "attachment motion parent changed for " + expected.partId);
      assert(attachment.motionRelation === expected.motionRelation, "attachment motion relation changed for " + expected.partId);
    }
    assert(JSON.stringify(attachment.sourceMates) === JSON.stringify(expected.sourceMates), "attachment mates changed for " + expected.partId);
    const manifestPart = manifest.parts.find((item) => item.id === expected.partId);
    const expectedStatus = expected.parentId === TARGET_ID
      ? "runtime-arm-left-1-attached"
      : "runtime-body-mounted-straight-slide";
    assert(manifestPart?.parent?.id === expected.parentId && manifestPart.connectionStatus === expectedStatus, "manifest attachment is stale for " + expected.partId);
    assert((glb.nodes ?? []).some((node) => node.name === expected.partId && node.matrix?.length === 16), "GLB attached node matrix is missing for " + expected.partId);
    const attachmentEvidence = expected.partId === "gac_coffee-1" ? gacEvidence : evidence;
    for (const mateName of expected.sourceMates) {
      const mate = attachmentEvidence.mates.find((item) => item.name === mateName);
      const expectedParticipants = expected.partId === "gac_coffee-1" && mateName === "Coincident10"
        ? ["body_may-1", expected.partId]
        : [TARGET_ID, expected.partId];
      assert(expectedParticipants.every((participant) => mate?.entities?.some((entity) => entity.referenceComponentId === participant)), mateName + " attachment evidence changed for " + expected.partId);
    }
  }
  assert(motion.path.sourceFeature === driver.path.sourceFeature, "driver path source changed");
  assert(motion.samples.length === 3, "expected three progress samples");
  assert(motion.validation.sampleProgress.join(",") === "0,0.5,1", "sample progress changed");
  assert(motion.validation.concentricAxisAlignmentDot >= 1 - 1e-8, "CAD concentric axes are not aligned");
  assert(motion.validation.initialMatingPointResidualMeters <= TOLERANCE_METERS, "initial mating point exceeds tolerance");
  assert(motion.validation.glbMatrixResidual <= 1e-5, "GLB matrix residual exceeds tolerance");
  assert(evidence.source.readOnlyIntent === true, "CAD evidence is not read-only");
  assert(evidence.source.solidWorksRevision === inventory.source.solidWorksRevision, "SolidWorks revision mismatch");
  assert(gacEvidence.source.readOnlyIntent === true, "gac_coffee CAD evidence is not read-only");
  assert(gacEvidence.source.solidWorksRevision === inventory.source.solidWorksRevision, "gac_coffee SolidWorks revision mismatch");
  assert(gacEvidence.targetComponent?.id === "gac_coffee-1" && gacEvidence.parentComponent?.id === "body_may-1", "gac_coffee CAD ownership changed");
  assert((glb.nodes ?? []).some((node) => node.name === TARGET_ID && node.matrix?.length === 16), "GLB target node matrix is missing");
  const gacArcEndProgress = motion.path.segments[0].lengthMeters / motion.path.lengthMeters;
  assert(gacArcEndProgress > 0 && gacArcEndProgress < 1, "gac_coffee Arc3/Line1 boundary is invalid");
  const gacAttachment = motion.attachments.find((item) => item.partId === "gac_coffee-1");
  const gacSlideGuide = gacAttachment?.slideGuide;
  assert(gacSlideGuide?.kind === "straight-translation", "gac_coffee straight slide guide is missing");
  assert(gacSlideGuide.coordinateFrame === "solidworks-assembly", "gac_coffee slide guide frame changed");
  assert(isUnitVector(gacSlideGuide.axis), "gac_coffee slide axis is not unit length");
  assert(isUnitVector(gacSlideGuide.guide?.axis), "gac_coffee groove guide axis is not unit length");
  assert(gacSlideGuide.pushProgressRange?.[0] === 0, "gac_coffee push phase must start at progress 0");
  assert(Math.abs(gacSlideGuide.pushProgressRange?.[1] - gacArcEndProgress) <= 1e-12, "gac_coffee push phase boundary changed");
  const gacCoincidentMate = gacEvidence.mates.find((item) => item.name === "Coincident10");
  const gacTangentMate = gacEvidence.mates.find((item) => item.name === "Tangent3");
  const gacCoincidentEntity = gacCoincidentMate?.entities?.find((item) => item.referenceComponentId === "gac_coffee-1");
  const gacTangentEntity = gacTangentMate?.entities?.find((item) => item.referenceComponentId === "gac_coffee-1");
  const coincidentNormal = normalize(gacCoincidentEntity?.entityParams?.slice(3, 6) ?? []);
  const tangentNormal = normalize(gacTangentEntity?.entityParams?.slice(3, 6) ?? []);
  const expectedSlideAxis = normalize(subtract(tangentNormal, scale(coincidentNormal, dot(tangentNormal, coincidentNormal))));
  assert(dot(gacSlideGuide.axis, expectedSlideAxis) >= 1 - 1e-8, "gac_coffee slide axis is not derived from Coincident10/Tangent3");
  assert(Math.abs(dot(gacSlideGuide.axis, coincidentNormal)) <= 1e-8, "gac_coffee slide axis leaves the Coincident10 plane");

  let previousBodyAngle = 0;
  const bodyPathSamples = [0, 0.5, 1].map((progress) => {
    const solution = solveBodyPathAngle(
      motion.bodyConnection,
      driver.path,
      progress,
      previousBodyAngle,
    );
    previousBodyAngle = solution.angle;
    return {
      progress,
      angleRadians: solution.angle,
      residualMeters: solution.residualMeters,
    };
  });

  const part = manifest.parts.find((item) => item.id === TARGET_ID);
  assert(part?.connectionStatus === "runtime-arm-left-1-ready", "manifest target part is not ready");
  assert(part.parent?.id === PARENT_ID && part.pivot?.sourceFeature === "Coincident1", "manifest CAD ownership is stale");
  const gacPart = manifest.parts.find((item) => item.id === "gac_coffee-1");
  assert(gacPart?.parent?.id === PARENT_ID && gacPart.connectionStatus === "runtime-body-mounted-straight-slide", "manifest gac_coffee CAD ownership is stale");
  assert(part.render?.asset === "/models/digital-twin/cluster-03/final.glb", "render owner changed");
  assert(manifest.motionFiles.includes("/models/digital-twin/cluster-03/connections/arm-left-1.json"), "manifest motion URL is missing");
  assert(manifest.parts.find((item) => item.id === DRIVER_ID)?.connectionStatus === "runtime-oc-left-ready", "oc_left regressed");
  assert(manifest.parts.find((item) => item.id === "oc_right-1")?.connectionStatus === "runtime-oc-right-ready", "oc_right regressed");

  const laterArmStatuses = ["arm_left_2-1", "arm_left_3-1"].map((partId) => ({
    partId,
    status: manifest.parts.find((item) => item.id === partId)?.connectionStatus ?? "missing",
  }));
  console.log(JSON.stringify({
    status: "verified",
    phase: "phase-8",
    part: "gac_coffee-1",
    parent: PARENT_ID,
    driver: DRIVER_ID,
    motionKind: motion.motion.kind,
    axisAlignmentDot: motion.validation.concentricAxisAlignmentDot,
    initialMatingPointResidualMeters: motion.validation.initialMatingPointResidualMeters,
    glbMatrixResidual: motion.validation.glbMatrixResidual,
    sampleProgress: motion.validation.sampleProgress,
    evidenceMates: ["Coincident10", "Tangent3"],
    gacCoffeeConnection: {
      primaryMate: "Coincident10",
      contactMate: "Tangent3",
      runtimeParent: PARENT_ID,
      motionParent: TARGET_ID,
      relation: "body-mounted-tangent-contact",
      motionRelation: "straight-body-bar-translation",
      arcEndProgress: gacArcEndProgress,
      slideAxis: gacSlideGuide.axis,
      lineBehavior: "hold-gac-straight-slide; connector-slides-on-Line1",
    },
    bodyConnection: {
      mate: motion.bodyConnection.mate,
      sourcePartId: motion.bodyConnection.sourcePartId,
      targetPartId: motion.bodyConnection.targetPartId,
      sourceDirection: motion.bodyConnection.sourceDirection,
      rotationAxis: motion.bodyConnection.rotationAxis,
      sourceSegments: motion.bodyConnection.targetPath.sourceSegments,
      pathDriverStartResidualMeters: motion.bodyConnection.validation.pathDriverStartResidualMeters,
    },
    bodyPathSamples,
    aggregateNodeCount: glb.nodes?.length ?? 0,
    laterArmStatuses,
  }, null, 2));
}

main();
