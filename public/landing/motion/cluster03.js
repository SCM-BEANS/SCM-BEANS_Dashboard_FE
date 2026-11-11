import * as THREE from "three";
import { interpolateCalibration, pointOnCadPath } from "./kinematics-math.js";

const CONNECTION_BASE = "/models/digital-twin/cluster-03/connections/";
const CONNECTION_FILES = [
  "oc-left.json", "oc-right.json", "arm-left-1.json", "arm-left-2.json",
  "arm-left-3.json", "arm-right-1.json", "arm-right-2.json", "arm-right-3.json",
  "truc-chinh.json", "gear-motor-chinh.json", "wiper-gear.json", "truc-nen.json",
  "gear-motor-nen.json", "gear-nen.json", "box-nen.json"
];
const AXIS_SCHEMAS = new Set([
  "cluster-03-truc-chinh-motion.v1", "cluster-03-truc-nen-motion.v1",
  "cluster-03-gear-motor-chinh-motion.v1", "cluster-03-gear-motor-nen-motion.v1",
  "cluster-03-gear-nen-motion.v1", "cluster-03-arm-left-3-motion.v1",
  "cluster-03-arm-right-3-motion.v1", "cluster-03-wiper-gear-motion.v1"
]);
const LOWER_NODES = new Set(["gear_motor_nen-1", "gear_nen-1", "truc_nen-1"]);
const ENDPOINT_TOLERANCE_METERS = 5e-5;
const MAIN_HIGHLIGHT_NODES = [
  "truc_chinh-1", "gear_motor_chinh-1", "wiper_gear-1", "oc_left-1", "oc_right-1",
  "arm_left_1-1", "arm_left_2-1", "arm_left_3-1", "arm_right_1-1", "arm_right_2-1",
  "arm_right_3-1", "gac_coffee-1", "head_nen-1"
];
const LOWER_HIGHLIGHT_NODES = ["truc_nen-1", "gear_motor_nen-1", "gear_nen-1", "box_nen-1"];
const V3 = values => Array.isArray(values) && values.length === 3 && values.every(Number.isFinite);
const MATRIX16 = values => Array.isArray(values) && values.length === 16 && values.every(Number.isFinite);
const vec = values => new THREE.Vector3(values[0], values[1], values[2]);
const clamp = (value, min = 0, max = 1) => THREE.MathUtils.clamp(value, min, max);
const lerp = (from, to, amount) => THREE.MathUtils.lerp(from, to, amount);
const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const angularDistance = (left, right) => Math.abs(wrapAngle(left - right));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertVector(value, label) {
  assert(V3(value), `${label} is not a finite 3D vector.`);
}

function assertSamples(samples, label, minimum = 2) {
  assert(Array.isArray(samples) && samples.length >= minimum, `${label} has no verified samples.`);
  assert(samples.every((sample, index) => Number.isFinite(sample.progress) && (index === 0 || sample.progress > samples[index - 1].progress)), `${label} samples are not ordered.`);
}

function maxMatrixError(left, right) {
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

// Connection transforms are SOLIDWORKS ArrayData: 9 rotation values (three.js column order), 3 translation values, then scale.
function cadMatrix(values) {
  const scale = values[12] || 1, r = values.slice(0, 9).map(value => value * scale);
  return [r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, values[9], values[10], values[11], 1];
}

function identityMatrix(values) {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return MATRIX16(values) && maxMatrixError(values, identity) <= 1e-8;
}

function validateConnection(definition) {
  assert(definition && definition.clusterId === "cluster-03", "Connection cluster id is invalid.");
  assert(definition.status === "verified" && definition.runtimeReady === true, `${definition.nodeName || definition.schemaVersion} is not verified for runtime use.`);
  assert(definition.units === "meters" && definition.coordinateFrame === "solidworks-assembly", `${definition.nodeName || definition.schemaVersion} uses an unsupported coordinate frame.`);
  assert(typeof definition.schemaVersion === "string" && typeof definition.nodeName === "string", "Connection schema or node name is missing.");
  if (definition.targetInitialTransform) assert(MATRIX16(definition.targetInitialTransform), `${definition.nodeName} has an invalid initial transform.`);
  if (definition.parentInitialTransform) assert(MATRIX16(definition.parentInitialTransform), `${definition.nodeName} has an invalid parent transform.`);

  if (definition.schemaVersion === "cluster-03-box-nen-motion.v1") {
    assert(definition.nodeName === "box_nen-1" && definition.parentId === "body_may-1", "box_nen connection target is invalid.");
    assert(definition.motion?.kind === "screw-follow" && definition.motion.preserveInitialPose === true, "box_nen screw contract is invalid.");
    assert(definition.motion.property === "translation" && definition.motion.progressRange?.[0] === 0 && definition.motion.progressRange?.[1] === 1, "box_nen progress contract is invalid.");
    assert(definition.attachment?.relation === "body-mounted-axial-slide" && definition.attachment.axisReference === "truc_nen-1", "box_nen attachment contract is invalid.");
    assertVector(definition.attachment.axis, "box_nen slide axis");
    assertVector(definition.attachment.targetReference?.point, "box_nen target point");
    assert(Number.isFinite(definition.screw?.pitchMeters) && Number.isFinite(definition.screw?.translationPerRevolutionMeters), "box_nen screw pitch is invalid.");
    assert(definition.validation?.passed === true && definition.validation?.parentFixed === true, "box_nen validation did not pass.");
    assert(Array.isArray(definition.validation.samples) && definition.validation.samples.length >= 3, "box_nen has no screw samples.");
    return;
  }

  assert(definition.parentId === "body_may-1", `${definition.nodeName} has an unexpected parent.`);
  assert(definition.motion && definition.motion.progressRange?.length === 2 && definition.motion.progressRange.every(Number.isFinite), `${definition.nodeName} has an invalid progress range.`);
  assert(definition.motion.progressRange[0] === 0 && definition.motion.progressRange[1] === 1, `${definition.nodeName} has an unsupported progress range.`);
  if (definition.validation?.glbMatrixResidual !== undefined) assert(Number.isFinite(definition.validation.glbMatrixResidual), `${definition.nodeName} has invalid GLB transform validation.`);

  if (AXIS_SCHEMAS.has(definition.schemaVersion)) {
    assert(definition.pivot?.kind === "axis", `${definition.nodeName} has no axis pivot.`);
    assertVector(definition.pivot.point, `${definition.nodeName} pivot point`);
    assertVector(definition.pivot.axis, `${definition.nodeName} pivot axis`);
    assert(definition.motion.angleRangeRadians?.length === 2 && definition.motion.angleRangeRadians.every(Number.isFinite), `${definition.nodeName} angle range is invalid.`);
    assert(definition.motion.translationRangeMeters === undefined || (definition.motion.translationRangeMeters.length === 2 && definition.motion.translationRangeMeters.every(Number.isFinite)), `${definition.nodeName} translation range is invalid.`);
    assertSamples(definition.samples, definition.nodeName);
    if (definition.gear) assert(Number.isFinite(definition.gear.ratio) && typeof definition.gear.reverse === "boolean", `${definition.nodeName} gear ratio is invalid.`);
    if (definition.nodeName === "gear_motor_chinh-1") {
      const calibration = definition.gear?.driveCalibration;
      assert(calibration?.kind === "cam-path-master" && calibration.camProgressRange?.[0] === 0 && calibration.camProgressRange?.[1] === 1, "Main drive calibration is invalid.");
      assertSamples(calibration.samples.map(sample => ({ progress: sample.camProgress })), "Main drive calibration");
      assert(calibration.samples[0].camProgress === 0 && calibration.samples.at(-1).camProgress === 1, "Main drive calibration does not span the full path.");
      assert(calibration.samples.every(sample => Number.isFinite(sample.motorAngleRadians)), "Main drive calibration has invalid angles.");
    }
    return;
  }

  assert(definition.motion.kind === "path-follow" || definition.motion.kind === "driver-follow", `${definition.nodeName} path motion kind is invalid.`);
  assert(definition.motion.property === "translation" && definition.motion.preserveInitialOrientation === true, `${definition.nodeName} path motion contract is invalid.`);
  assert(definition.anchor?.space === "solidworks-assembly", `${definition.nodeName} anchor frame is invalid.`);
  assertVector(definition.anchor.point, `${definition.nodeName} anchor point`);
  assertVector(definition.anchor.localPoint, `${definition.nodeName} local anchor`);
  assert(definition.path?.coordinateFrame === "solidworks-assembly" && definition.path.segments?.length === 2, `${definition.nodeName} path is invalid.`);
  const [arc, line] = definition.path.segments;
  assert(arc.kind === "arc" && line.kind === "line", `${definition.nodeName} path must be Arc + Line.`);
  for (const field of ["center", "start", "end", "normal"]) assertVector(arc[field], `${definition.nodeName} arc ${field}`);
  for (const field of ["start", "end"]) assertVector(line[field], `${definition.nodeName} line ${field}`);
  assert(Number.isFinite(arc.radius) && arc.radius > 0 && Number.isFinite(arc.sweepRadians) && Number.isFinite(definition.path.lengthMeters) && definition.path.lengthMeters > 0, `${definition.nodeName} path dimensions are invalid.`);
  assertSamples(definition.samples, definition.nodeName);
  if (definition.schemaVersion === "cluster-03-arm-left-1-motion.v1" || definition.schemaVersion === "cluster-03-arm-right-1-motion.v1") {
    assert(definition.bodyConnection?.status === "verified", `${definition.nodeName} body path is not verified.`);
    assertVector(definition.bodyConnection.sourcePoint, `${definition.nodeName} body source point`);
    assertVector(definition.bodyConnection.sourceDirection, `${definition.nodeName} body direction`);
    assertVector(definition.bodyConnection.targetReferencePoint, `${definition.nodeName} body target point`);
    assertVector(definition.bodyConnection.rotationAxis?.point, `${definition.nodeName} body axis point`);
    assertVector(definition.bodyConnection.rotationAxis?.axis, `${definition.nodeName} body axis`);
  }
  if (definition.schemaVersion === "cluster-03-arm-left-2-motion.v1") {
    assertVector(definition.connection?.sourcePoint, "arm_left_2 source point");
    assertVector(definition.connection?.driverAxis?.localPoint, "arm_left_2 local driver point");
    assertVector(definition.connection?.driverAxis?.localAxis, "arm_left_2 local driver axis");
    assert(definition.connection?.targetPath && definition.wiperConnection?.status === "verified", "arm_left_2 followers are invalid.");
  }
  if (definition.schemaVersion === "cluster-03-arm-right-2-motion.v1") {
    assertVector(definition.connection?.sourceLocalPoint, "arm_right_2 local source point");
    assertVector(definition.connection?.driverAxis?.localPoint, "arm_right_2 local driver point");
    assertVector(definition.connection?.driverAxis?.localAxis, "arm_right_2 local driver axis");
    assert(definition.connection?.targetPath && definition.connection.validation?.pathResidualMeters <= definition.connection.validation?.toleranceMeters, "arm_right_2 follower is invalid.");
  }
}

export async function loadCluster03Connections() {
  const names = ["root-frame.json", ...CONNECTION_FILES];
  const payloads = await Promise.all(names.map(async name => {
    const response = await fetch(CONNECTION_BASE + name, { cache: "no-store" });
    if (!response.ok) throw new Error(`${name} returned HTTP ${response.status}.`);
    return response.json();
  }));
  const rootFrame = payloads[0];
  const rootValues = rootFrame?.rootTransform?.values;
  assert(rootFrame?.clusterId === "cluster-03" && rootFrame.status === "verified" && rootFrame.rootFrameReady === true && identityMatrix(rootValues), "Cluster root frame is invalid or not identity aligned.");
  const definitions = payloads.slice(1);
  definitions.forEach(validateConnection);
  assert(definitions.length === CONNECTION_FILES.length, "The cluster motion definition set is incomplete.");
  return { rootFrame, definitions };
}

function validateGlbFrame(model, definitions) {
  for (const definition of definitions) {
    const actual = model.initialMatrices.get(definition.nodeName);
    assert(model.nodeMap.has(definition.nodeName), `GLB node "${definition.nodeName}" was not found.`);
    assert(MATRIX16(actual), `GLB node "${definition.nodeName}" has no captured initial transform.`);
    const tolerance = Math.max(1e-5, definition.validation?.glbMatrixTolerance || 0);
    if (definition.targetInitialTransform) assert(maxMatrixError(actual, cadMatrix(definition.targetInitialTransform)) <= tolerance, `${definition.nodeName} initial transform does not match the verified CAD frame.`);
    if (definition.parentInitialTransform) {
      const parent = model.initialMatrices.get(definition.parentId);
      assert(parent && maxMatrixError(parent, cadMatrix(definition.parentInitialTransform)) <= tolerance, `${definition.nodeName} parent transform does not match the verified CAD frame.`);
    }
    if (definition.driverInitialTransform && definition.driver?.partId) {
      const driver = model.initialMatrices.get(definition.driver.partId);
      assert(driver && maxMatrixError(driver, cadMatrix(definition.driverInitialTransform)) <= 1e-5, `${definition.nodeName} driver transform does not match the verified CAD frame.`);
    }
  }
}

function rotatePoint(point, pivot, axis, angle) {
  return point.clone().sub(pivot).applyAxisAngle(axis, angle).add(pivot);
}

function rotateVector(vector, axis, angle) {
  return vector.clone().applyAxisAngle(axis, angle);
}

function unwrapAngleNear(angle, reference) {
  let result = angle;
  while (result - reference > Math.PI) result -= Math.PI * 2;
  while (result - reference < -Math.PI) result += Math.PI * 2;
  return result;
}

function solveMovingPointOnLine({ sourcePoint, driverAxisPoint, driverAxis, linePoint, lineDirection, previousAngle }) {
  const rotationAxis = driverAxis.clone().normalize();
  const line = lineDirection.clone().normalize();
  const normal = rotationAxis.clone().cross(line);
  if (normal.lengthSq() <= 1e-20) return null;
  normal.normalize();
  const sourceRelative = sourcePoint.clone().sub(driverAxisPoint);
  const sourceParallel = rotationAxis.clone().multiplyScalar(sourceRelative.dot(rotationAxis));
  const sourcePerpendicular = sourceRelative.clone().sub(sourceParallel);
  const cosine = sourcePerpendicular.dot(normal);
  const sine = rotationAxis.clone().cross(sourcePerpendicular).dot(normal);
  const constant = driverAxisPoint.clone().add(sourceParallel).sub(linePoint).dot(normal);
  const amplitude = Math.hypot(cosine, sine);
  if (amplitude <= 1e-12 || Math.abs(-constant) > amplitude + 1e-10) return null;
  const phase = Math.atan2(sine, cosine);
  const offset = Math.acos(clamp(-constant / amplitude, -1, 1));
  const candidates = [phase - offset, phase + offset].map(angle => unwrapAngleNear(angle, previousAngle)).map(angle => {
    const resolved = rotatePoint(sourcePoint, driverAxisPoint, rotationAxis, angle);
    return { angle, residual: Math.abs(resolved.clone().sub(linePoint).dot(normal)) };
  }).sort((left, right) => angularDistance(left.angle, previousAngle) - angularDistance(right.angle, previousAngle) || left.residual - right.residual);
  const solution = candidates[0];
  return solution?.residual <= 1e-7 ? { arm2Angle: solution.angle, residualMeters: solution.residual } : null;
}

function solveBodyPathAngle({ sourcePoint, sourceDirection, targetPoint, rotationAxisPoint, rotationAxis, pathDelta, previousAngle }) {
  const axis = rotationAxis.clone().normalize();
  const direction = sourceDirection.clone().normalize();
  const movedAxisPoint = rotationAxisPoint.clone().add(pathDelta);
  const sourceRelative = sourcePoint.clone().sub(rotationAxisPoint);
  const targetRelative = targetPoint.clone().sub(movedAxisPoint);
  const quarterTurn = axis.clone().cross(direction);
  const cosine = targetRelative.clone().cross(direction).dot(axis);
  const sine = targetRelative.clone().cross(quarterTurn).dot(axis);
  const constant = sourceRelative.clone().cross(direction).dot(axis);
  const amplitude = Math.hypot(cosine, sine);
  if (amplitude <= 1e-12 || Math.abs(constant) > amplitude + 1e-10) return null;
  const phase = Math.atan2(sine, cosine);
  const offset = Math.acos(clamp(-constant / amplitude, -1, 1));
  const candidates = [phase - offset, phase + offset].map(angle => unwrapAngleNear(angle, previousAngle)).map(angle => {
    const rotatedPoint = rotatePoint(sourcePoint.clone().add(pathDelta), movedAxisPoint, axis, angle);
    const resolvedDirection = rotateVector(direction, axis, angle).normalize();
    const targetOffset = targetPoint.clone().sub(rotatedPoint);
    const projection = targetOffset.dot(resolvedDirection);
    return { angle, projection, residual: targetOffset.clone().cross(resolvedDirection).length() };
  }).sort((left, right) => Math.abs(left.angle - previousAngle) - Math.abs(right.angle - previousAngle) || left.residual - right.residual);
  const solution = candidates[0];
  return solution?.residual <= 1e-7 ? { angleRadians: solution.angle, lineProjectionMeters: solution.projection, residualMeters: solution.residual } : null;
}

function withinRange(value, minimum, maximum, tolerance = 1e-8) {
  return value >= minimum - tolerance && value <= maximum + tolerance;
}

function solveCalibratedArmLeft({
  motorAngle, gearRatio, gearReverse, wiperSourcePoint, arm3SourcePoint, driverAxisPoint, driverAxis,
  wiperPathPoint, wiperPathDirection, wiperLimitPoint, wiperPivot, wiperAxis, wiperDistanceMinimum,
  wiperDistanceMaximum, arm3LineStart, arm3LineEnd, arm3LimitPoint, arm3Pivot, arm3Axis,
  arm3DistanceMinimum, arm3DistanceMaximum, worldPath, pathStart, camProgress, previousArm2Angle
}) {
  const signedRatio = (gearReverse ? -1 : 1) * gearRatio;
  if (Math.abs(signedRatio) <= 1e-12) return null;
  const driver = driverAxis.clone().normalize();
  const wiper = wiperAxis.clone().normalize();
  const arm3 = arm3Axis.clone().normalize();
  const wiperDirection = wiperPathDirection.clone().normalize();
  const wiperAngle = signedRatio * motorAngle;
  const pathPoint = rotatePoint(wiperPathPoint, wiperPivot, wiper, wiperAngle);
  const pathDirection = rotateVector(wiperDirection, wiper, wiperAngle).normalize();
  const limitPoint = rotatePoint(wiperLimitPoint, wiperPivot, wiper, wiperAngle);
  const initialOffset = wiperPathPoint.clone().sub(wiperLimitPoint).dot(wiperDirection);
  const branchSign = Math.sign(initialOffset) || -1;
  const pathDelta = worldPath.getPointAt(clamp(camProgress)).sub(pathStart);
  const axisPoint = driverAxisPoint.clone().add(pathDelta);
  const movedWiper = wiperSourcePoint.clone().add(pathDelta);
  const movedArm3 = arm3SourcePoint.clone().add(pathDelta);
  const lineNormal = driver.clone().cross(pathDirection);
  if (lineNormal.lengthSq() <= 1e-20) return null;
  lineNormal.normalize();
  const relative = movedWiper.clone().sub(axisPoint);
  const sineVector = driver.clone().cross(relative);
  const constant = axisPoint.clone().sub(pathPoint).dot(lineNormal);
  const cosineTerm = relative.dot(lineNormal);
  const sineTerm = sineVector.dot(lineNormal);
  const amplitude = Math.hypot(cosineTerm, sineTerm);
  if (amplitude <= 1e-12 || Math.abs(-constant) > amplitude + 1e-10) return null;
  const phase = Math.atan2(sineTerm, cosineTerm);
  const offset = Math.acos(clamp(-constant / amplitude, -1, 1));
  const arm2Angles = [unwrapAngleNear(phase - offset, previousArm2Angle), unwrapAngleNear(phase + offset, previousArm2Angle)];
  const lineStart = rotatePoint(arm3LineStart, arm3Pivot, arm3, wiperAngle);
  const lineEnd = rotatePoint(arm3LineEnd, arm3Pivot, arm3, wiperAngle);
  const arm3Line = lineEnd.clone().sub(lineStart);
  const arm3LineLength = arm3Line.length();
  if (arm3LineLength <= 1e-12) return null;
  arm3Line.normalize();
  const arm3Limit = rotatePoint(arm3LimitPoint, arm3Pivot, arm3, wiperAngle);
  const candidates = arm2Angles.map(arm2Angle => {
    const resolvedWiper = rotatePoint(movedWiper, axisPoint, driver, arm2Angle);
    const path11Residual = resolvedWiper.clone().sub(pathPoint).cross(pathDirection).length();
    const lineProjection = resolvedWiper.clone().sub(pathPoint).dot(pathDirection);
    const targetProjection = limitPoint.clone().sub(pathPoint).dot(pathDirection);
    const signedDistance = lineProjection - targetProjection;
    const limitDistance = resolvedWiper.distanceTo(limitPoint);
    const resolvedArm3 = rotatePoint(movedArm3, axisPoint, driver, arm2Angle);
    const path10Residual = resolvedArm3.clone().sub(lineStart).cross(arm3Line).length();
    const line10Projection = resolvedArm3.clone().sub(lineStart).dot(arm3Line);
    const limitDistance1 = resolvedArm3.distanceTo(arm3Limit);
    return {
      motorAngle, wiperAngle, camProgress, arm2Angle, residualMeters: path11Residual,
      limitDistanceMeters: limitDistance, lineProjectionMeters: signedDistance,
      path10ResidualMeters: path10Residual, limitDistance1Meters: limitDistance1,
      line10ProjectionMeters: line10Projection,
      valid: path11Residual <= 1e-7 && signedDistance * branchSign >= -1e-8 &&
        withinRange(limitDistance, wiperDistanceMinimum, wiperDistanceMaximum) &&
        path10Residual <= 1e-7 && line10Projection >= -ENDPOINT_TOLERANCE_METERS && line10Projection <= arm3LineLength + ENDPOINT_TOLERANCE_METERS &&
        withinRange(limitDistance1, arm3DistanceMinimum, arm3DistanceMaximum, ENDPOINT_TOLERANCE_METERS)
    };
  }).filter(candidate => candidate.valid).sort((left, right) =>
    Math.abs(left.arm2Angle - previousArm2Angle) - Math.abs(right.arm2Angle - previousArm2Angle) ||
    left.residualMeters - right.residualMeters || left.path10ResidualMeters - right.path10ResidualMeters
  );
  if (!candidates.length) return null;
  const { valid, ...solution } = candidates[0];
  return solution;
}

function applyWorldAxisRotation(part, axisPointWorld, axisWorld, angle) {
  const parent = part.parent;
  if (!parent) return;
  parent.updateWorldMatrix(true, false);
  part.updateWorldMatrix(true, false);
  const axis = axisWorld.clone().normalize();
  const positionWorld = part.getWorldPosition(new THREE.Vector3());
  const quaternionWorld = part.getWorldQuaternion(new THREE.Quaternion());
  const delta = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  const targetPosition = positionWorld.sub(axisPointWorld).applyQuaternion(delta).add(axisPointWorld);
  const targetQuaternion = delta.clone().multiply(quaternionWorld);
  const parentQuaternion = parent.getWorldQuaternion(new THREE.Quaternion());
  part.position.copy(parent.worldToLocal(targetPosition));
  part.quaternion.copy(parentQuaternion.invert().multiply(targetQuaternion));
  part.updateMatrixWorld(true);
}

export function createCluster03Motion(model, definitions) {
  validateGlbFrame(model, definitions);
  const definition = partId => definitions.find(item => item.partId === partId || item.nodeName === partId);
  const node = name => {
    const object = model.nodeMap.get(name);
    if (!object) throw new Error(`GLB node "${name}" was not found.`);
    return object;
  };
  const arm1Definition = definition("arm_left_1-1");
  const boxDefinition = definitions.find(item => item.schemaVersion === "cluster-03-box-nen-motion.v1");
  if (!boxDefinition) throw new Error("box_nen connection is missing.");
  const boxPart = node(boxDefinition.nodeName), boxBody = node(boxDefinition.parentId);
  model.holder.updateMatrixWorld(true);

  const states = [];
  for (const item of definitions) {
    if (item.schemaVersion === "cluster-03-box-nen-motion.v1") continue;
    const part = node(item.nodeName), parent = part.parent || model.holder;
    parent.updateWorldMatrix(true, false);
    part.updateWorldMatrix(true, false);
    if (AXIS_SCHEMAS.has(item.schemaVersion)) {
      const pivotWorld = vec(item.pivot.point), axisWorld = vec(item.pivot.axis).normalize();
      const pivotParent = parent.worldToLocal(pivotWorld.clone());
      const axisParent = parent.worldToLocal(pivotWorld.clone().add(axisWorld)).sub(pivotParent).normalize();
      states.push({ kind: "axis", definition: item, nodeName: item.nodeName, part, parent,
        basePosition: part.position.clone(), baseQuaternion: part.quaternion.clone(), baseScale: part.scale.clone(),
        pivotParent, axisParent, angleRangeRadians: item.motion.angleRangeRadians,
        translationRangeMeters: item.motion.translationRangeMeters || [0, 0], progress: 0,
        direction: 1, coupledAngleRadians: undefined, screwFollowerTranslationMeters: undefined });
      continue;
    }
    const path = item.path, pathPoint = progress => new THREE.Vector3(...pointOnCadPath(path, progress));
    const localAnchor = vec(item.anchor.localPoint);
    const initialAnchorParent = parent.worldToLocal(part.localToWorld(localAnchor.clone()));
    const expectedAnchorParent = parent.worldToLocal(pathPoint(0));
    if (item.motion.kind !== "driver-follow" && initialAnchorParent.distanceTo(expectedAnchorParent) > 1e-6) {
      throw new Error(`${item.partId} initial GLB anchor does not match its CAD path.`);
    }
    states.push({ kind: "path", definition: item, nodeName: item.nodeName, part, parent,
      basePosition: part.position.clone(), baseQuaternion: part.quaternion.clone(), baseScale: part.scale.clone(),
      initialAnchorParent: item.motion.kind === "driver-follow" ? expectedAnchorParent : initialAnchorParent,
      worldPath: { getPointAt: pathPoint }, progress: 0, direction: 1,
      coupledAngleRadians: undefined, bodyPathAngleRadians: undefined });
  }

  const boxParent = boxPart.parent || model.holder;
  const boxParentInverse = boxParent.matrixWorld.clone().invert();
  const boxAxisWorld = vec(boxDefinition.attachment.axis).normalize();
  const boxAxisPoint = vec(boxDefinition.attachment.targetReference.point);
  const boxAxisParent = boxAxisPoint.clone().add(boxAxisWorld).applyMatrix4(boxParentInverse)
    .sub(boxAxisPoint.clone().applyMatrix4(boxParentInverse)).normalize();
  const boxState = { part: boxPart, parent: boxParent, basePosition: boxPart.position.clone(),
    baseQuaternion: boxPart.quaternion.clone(), axisParent: boxAxisParent,
    translationRangeMeters: boxDefinition.motion.translationRangeMeters, currentTranslationMeters: 0 };

  const gacAttachment = arm1Definition.attachments.find(item => item.nodeName === "gac_coffee-1" && item.motionParentId === "arm_left_1-1");
  const motionParent = node(gacAttachment.motionParentId), gacPart = node(gacAttachment.nodeName);
  model.holder.updateMatrixWorld(true);
  const gacFollower = {
    motionParent, part: gacPart, bodyConnection: arm1Definition.bodyConnection,
    slideGuide: gacAttachment.slideGuide,
    motionParentBaseWorldMatrix: motionParent.matrixWorld.clone(),
    partBaseWorldMatrix: gacPart.matrixWorld.clone(),
    arcEndProgress: arm1Definition.path.segments[0].lengthMeters / arm1Definition.path.lengthMeters,
    arcEndSlideDistanceMeters: null
  };
  const headPart = node("head_nen-1"), arm1Part = node("arm_left_1-1");
  const headFollower = {
    part: headPart,
    baseWorldMatrix: headPart.matrixWorld.clone(),
    armBaseWorldMatrix: arm1Part.matrixWorld.clone()
  };

  function applyAxisMotionAtAngle(state, angle, axialTranslationOverride) {
    const axial = axialTranslationOverride ?? lerp(state.translationRangeMeters[0], state.translationRangeMeters[1], clamp(state.progress));
    state.currentAxialTranslationMeters = axial;
    const delta = new THREE.Quaternion().setFromAxisAngle(state.axisParent, angle);
    state.part.position.copy(state.basePosition).sub(state.pivotParent).applyQuaternion(delta)
      .add(state.pivotParent).addScaledVector(state.axisParent, axial);
    state.part.quaternion.copy(state.baseQuaternion).premultiply(delta);
    state.part.updateMatrixWorld(true);
  }

  function applyState(state, progress) {
    state.progress = clamp(progress);
    if (state.kind === "axis") {
      applyAxisMotionAtAngle(state, lerp(state.angleRangeRadians[0], state.angleRangeRadians[1], state.progress));
      return;
    }
    const target = state.parent.worldToLocal(state.worldPath.getPointAt(state.progress));
    state.part.position.copy(state.basePosition).add(target.sub(state.initialAnchorParent));
    state.part.quaternion.copy(state.baseQuaternion);
    state.part.updateMatrixWorld(true);
  }

  function applyLowerGearMotorConnection() {
    const motorDefinition = definition("gear_motor_nen-1"), motorState = states.find(state => state.nodeName === "gear_motor_nen-1");
    if (!motorDefinition?.gear || !motorState) return;
    const lowerDriveRevolutions = 6;
    const motorAngle = lerp(motorDefinition.motion.angleRangeRadians[0], motorDefinition.motion.angleRangeRadians[1], clamp(motorState.progress)) * lowerDriveRevolutions;
    applyAxisMotionAtAngle(motorState, motorAngle);
    motorState.coupledAngleRadians = motorAngle;
    const gearDefinition = definition("gear_nen-1"), gearState = states.find(state => state.nodeName === "gear_nen-1");
    const signedRatio = (motorDefinition.gear.reverse ? -1 : 1) * motorDefinition.gear.ratio;
    const drivenAngle = signedRatio * motorAngle;
    if (gearState && gearDefinition) {
      gearState.coupledAngleRadians = drivenAngle;
      applyAxisMotionAtAngle(gearState, drivenAngle);
    }
    const shaftState = states.find(state => state.nodeName === "truc_nen-1");
    if (shaftState) {
      const shaftAngle = -drivenAngle;
      const revolutions = Math.abs(shaftAngle) / (Math.PI * 2);
      shaftState.screwFollowerTranslationMeters = lerp(shaftState.translationRangeMeters[0], shaftState.translationRangeMeters[1], revolutions);
      shaftState.coupledAngleRadians = shaftAngle;
      applyAxisMotionAtAngle(shaftState, shaftAngle, 0);
    }
  }

  function solveMainGearMotorConnection(mainProgress) {
    const arm1 = definition("arm_left_1-1"), arm2 = definition("arm_left_2-1");
    const arm3 = definition("arm_left_3-1"), wiperDef = definition("wiper_gear-1");
    const motorDef = definition("gear_motor_chinh-1");
    const arm1State = states.find(state => state.nodeName === "arm_left_1-1");
    const arm2State = states.find(state => state.nodeName === "arm_left_2-1");
    const arm3State = states.find(state => state.nodeName === "arm_left_3-1");
    const wiperState = states.find(state => state.nodeName === "wiper_gear-1");
    const shaftState = states.find(state => state.nodeName === "truc_chinh-1");
    const motorState = states.find(state => state.nodeName === "gear_motor_chinh-1");
    const ocLeft = states.find(state => state.nodeName === "oc_left-1");
    if (!arm1?.bodyConnection || !arm2?.connection || !arm2?.wiperConnection || !arm3 || !wiperDef || !motorDef?.gear?.driveCalibration || !arm1State || !arm2State || !arm3State || !wiperState || !motorState || !ocLeft) return;
    const c = arm2.connection, wc = arm2.wiperConnection, axis = c.driverAxis;
    const main = clamp(mainProgress), pathStart = ocLeft.worldPath.getPointAt(0);
    const pathDelta = ocLeft.worldPath.getPointAt(main).sub(pathStart);
    const body = arm1.bodyConnection;
    const bodySolution = solveBodyPathAngle({ sourcePoint: vec(body.sourcePoint), sourceDirection: vec(body.sourceDirection),
      targetPoint: vec(body.targetReferencePoint), rotationAxisPoint: vec(body.rotationAxis.point),
      rotationAxis: vec(body.rotationAxis.axis), pathDelta, previousAngle: arm1State.bodyPathAngleRadians ?? 0 });
    if (!bodySolution || bodySolution.residualMeters > 1e-7) return;
    const motorAngle = interpolateCalibration(motorDef.gear.driveCalibration.samples, main);
    const solution = solveCalibratedArmLeft({
      motorAngle, gearRatio: motorDef.gear.ratio, gearReverse: motorDef.gear.reverse,
      wiperSourcePoint: vec(wc.sourcePoint), arm3SourcePoint: vec(c.sourcePoint),
      driverAxisPoint: vec(axis.point), driverAxis: vec(axis.axis),
      wiperPathPoint: vec(wc.targetPath.point), wiperPathDirection: vec(wc.targetPath.direction),
      wiperLimitPoint: vec(wc.limit.targetPoint), wiperPivot: vec(wiperDef.pivot.point), wiperAxis: vec(wiperDef.pivot.axis),
      wiperDistanceMinimum: wc.limit.minimumDistanceMeters, wiperDistanceMaximum: wc.limit.maximumDistanceMeters,
      arm3LineStart: vec(c.targetPath.start), arm3LineEnd: vec(c.targetPath.end), arm3LimitPoint: vec(c.limit.targetPoint),
      arm3Pivot: vec(arm3.pivot.point), arm3Axis: vec(arm3.pivot.axis),
      arm3DistanceMinimum: c.limit.minimumDistanceMeters, arm3DistanceMaximum: c.limit.maximumDistanceMeters,
      worldPath: ocLeft.worldPath, pathStart, camProgress: main,
      previousArm2Angle: arm2State.coupledAngleRadians ?? 0
    });
    if (!solution || solution.residualMeters > 1e-7 || solution.path10ResidualMeters > 1e-7) return;
    motorState.coupledAngleRadians = solution.motorAngle;
    applyAxisMotionAtAngle(motorState, solution.motorAngle);
    wiperState.coupledAngleRadians = solution.wiperAngle;
    applyAxisMotionAtAngle(wiperState, solution.wiperAngle);
    arm3State.coupledAngleRadians = solution.wiperAngle;
    applyAxisMotionAtAngle(arm3State, solution.wiperAngle);
    if (shaftState) {
      shaftState.coupledAngleRadians = solution.wiperAngle;
      applyAxisMotionAtAngle(shaftState, solution.wiperAngle);
    }
    for (const state of states) if (state.kind === "path" && ["oc_left-1", "arm_left_1-1", "arm_left_2-1"].includes(state.nodeName)) applyState(state, main);
    model.holder.updateMatrixWorld(true);
    const bodyAxisPoint = vec(body.rotationAxis.point).add(pathDelta);
    applyWorldAxisRotation(arm1State.part, bodyAxisPoint, vec(body.rotationAxis.axis), bodySolution.angleRadians);
    arm1State.bodyPathAngleRadians = bodySolution.angleRadians;
    model.holder.updateMatrixWorld(true);
    const driverPoint = node("oc_left-1").localToWorld(vec(axis.localPoint));
    const driverEnd = node("oc_left-1").localToWorld(vec(axis.localPoint).add(vec(axis.localAxis)));
    arm2State.coupledAngleRadians = solution.arm2Angle;
    applyWorldAxisRotation(arm2State.part, driverPoint, driverEnd.sub(driverPoint).normalize(), solution.arm2Angle);
  }

  function solveMainRightArmConnection(mainProgress) {
    const right1 = definition("arm_right_1-1"), right2 = definition("arm_right_2-1"), right3 = definition("arm_right_3-1");
    const oc = states.find(state => state.nodeName === "oc_right-1");
    const r1 = states.find(state => state.nodeName === "arm_right_1-1");
    const r2 = states.find(state => state.nodeName === "arm_right_2-1");
    const r3 = states.find(state => state.nodeName === "arm_right_3-1");
    const shaft = states.find(state => state.nodeName === "truc_chinh-1");
    if (!right1?.bodyConnection || !right2?.connection || !right3 || !oc || !r1 || !r2 || !r3) return;
    const progress = clamp(mainProgress);
    applyState(r1, progress); applyState(r2, progress);
    const shaftAngle = shaft?.coupledAngleRadians ?? (shaft ? lerp(shaft.angleRangeRadians[0], shaft.angleRangeRadians[1], progress) : lerp(r3.angleRangeRadians[0], r3.angleRangeRadians[1], progress));
    r3.coupledAngleRadians = shaftAngle;
    applyAxisMotionAtAngle(r3, shaftAngle);
    model.holder.updateMatrixWorld(true);
    const pathStart = oc.worldPath.getPointAt(0), pathDelta = oc.worldPath.getPointAt(progress).sub(pathStart);
    const body = right1.bodyConnection;
    const bodySolution = solveBodyPathAngle({ sourcePoint: vec(body.sourcePoint), sourceDirection: vec(body.sourceDirection),
      targetPoint: vec(body.targetReferencePoint), rotationAxisPoint: vec(body.rotationAxis.point),
      rotationAxis: vec(body.rotationAxis.axis), pathDelta, previousAngle: r1.bodyPathAngleRadians ?? 0 });
    if (!bodySolution || bodySolution.residualMeters > 1e-7) return;
    applyWorldAxisRotation(r1.part, vec(body.rotationAxis.point).add(pathDelta), vec(body.rotationAxis.axis), bodySolution.angleRadians);
    r1.bodyPathAngleRadians = bodySolution.angleRadians;
    model.holder.updateMatrixWorld(true);
    const connection = right2.connection;
    const driverPoint = node("oc_right-1").localToWorld(vec(connection.driverAxis.localPoint));
    const driverEnd = node("oc_right-1").localToWorld(vec(connection.driverAxis.localPoint).add(vec(connection.driverAxis.localAxis)));
    const sourcePoint = r2.part.localToWorld(vec(connection.sourceLocalPoint));
    const targetStart = rotatePoint(vec(connection.targetPath.start), vec(right3.pivot.point), vec(right3.pivot.axis).normalize(), shaftAngle);
    const targetDirection = rotateVector(vec(connection.targetPath.direction), vec(right3.pivot.axis).normalize(), shaftAngle).normalize();
    const solution = solveMovingPointOnLine({ sourcePoint, driverAxisPoint: driverPoint, driverAxis: driverEnd.sub(driverPoint).normalize(),
      linePoint: targetStart, lineDirection: targetDirection, previousAngle: r2.coupledAngleRadians ?? 0 });
    if (!solution || solution.residualMeters > 1e-7) return;
    r2.coupledAngleRadians = solution.arm2Angle;
    applyWorldAxisRotation(r2.part, driverPoint, driverEnd.sub(driverPoint).normalize(), solution.arm2Angle);
  }

  function applyGacFollower(mainProgress) {
    const guide = gacFollower.slideGuide;
    model.holder.updateMatrixWorld(true);
    const arcPush = mainProgress <= gacFollower.arcEndProgress;
    const slideAxis = vec(guide.axis).normalize();
    const drivenNormal = vec(guide.contact.drivenNormal).normalize();
    const driverPoint = vec(guide.contact.driverPoint);
    const denominator = drivenNormal.dot(slideAxis);
    if (Math.abs(denominator) <= 1e-8) return;
    const resolveDistance = armMatrix => {
      const delta = armMatrix.clone().multiply(gacFollower.motionParentBaseWorldMatrix.clone().invert());
      const moved = driverPoint.clone().applyMatrix4(delta);
      return drivenNormal.dot(moved.sub(driverPoint)) / denominator;
    };
    let distance;
    if (arcPush) distance = resolveDistance(gacFollower.motionParent.matrixWorld);
    else {
      if (gacFollower.arcEndSlideDistanceMeters === null) {
        const arcEnd = resolveArmLeft1WorldMatrixAtProgress(gacFollower.arcEndProgress);
        if (!arcEnd) return;
        gacFollower.arcEndSlideDistanceMeters = resolveDistance(arcEnd);
      }
      distance = gacFollower.arcEndSlideDistanceMeters;
    }
    const targetMatrix = gacFollower.partBaseWorldMatrix.clone();
    const targetPosition = new THREE.Vector3().setFromMatrixPosition(gacFollower.partBaseWorldMatrix).addScaledVector(slideAxis, distance);
    if (gacFollower.part.parent?.parent === model.holder) targetPosition.add(gacFollower.part.parent.position);
    targetMatrix.setPosition(targetPosition);
    const parent = gacFollower.part.parent || model.holder;
    const local = parent.matrixWorld.clone().invert().multiply(targetMatrix);
    local.decompose(gacFollower.part.position, gacFollower.part.quaternion, gacFollower.part.scale);
    gacFollower.part.updateMatrixWorld(true);
  }

  function applyHeadFollower() {
    const arm = states.find(state => state.nodeName === "arm_left_1-1");
    if (!arm) return;
    model.holder.updateMatrixWorld(true);
    const delta = arm.part.matrixWorld.clone().multiply(headFollower.armBaseWorldMatrix.clone().invert());
    const parent = headFollower.part.parent || model.holder;
    const offset = parent.parent === model.holder ? parent.position : new THREE.Vector3();
    const target = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z)
      .multiply(delta).multiply(headFollower.baseWorldMatrix);
    const local = parent.matrixWorld.clone().invert().multiply(target);
    local.decompose(headFollower.part.position, headFollower.part.quaternion, headFollower.part.scale);
    headFollower.part.updateMatrixWorld(true);
  }

  function resolveArmLeft1WorldMatrixAtProgress(progress) {
    const arm = states.find(state => state.kind === "path" && state.nodeName === "arm_left_1-1");
    const driver = states.find(state => state.kind === "path" && state.nodeName === "oc_left-1");
    if (!arm || !driver) return null;
    const saved = { position: arm.part.position.clone(), quaternion: arm.part.quaternion.clone(), scale: arm.part.scale.clone(), angle: arm.bodyPathAngleRadians };
    const pathDelta = driver.worldPath.getPointAt(clamp(progress)).sub(driver.worldPath.getPointAt(0));
    const body = arm.definition.bodyConnection;
    const solution = solveBodyPathAngle({ sourcePoint: vec(body.sourcePoint), sourceDirection: vec(body.sourceDirection),
      targetPoint: vec(body.targetReferencePoint), rotationAxisPoint: vec(body.rotationAxis.point),
      rotationAxis: vec(body.rotationAxis.axis), pathDelta, previousAngle: saved.angle ?? 0 });
    if (!solution) return null;
    applyState(arm, progress);
    model.holder.updateMatrixWorld(true);
    applyWorldAxisRotation(arm.part, vec(body.rotationAxis.point).add(pathDelta), vec(body.rotationAxis.axis), solution.angleRadians);
    arm.bodyPathAngleRadians = solution.angleRadians;
    model.holder.updateMatrixWorld(true);
    const result = arm.part.matrixWorld.clone();
    arm.part.position.copy(saved.position); arm.part.quaternion.copy(saved.quaternion); arm.part.scale.copy(saved.scale);
    arm.bodyPathAngleRadians = saved.angle;
    arm.part.updateMatrixWorld(true); model.holder.updateMatrixWorld(true);
    return result;
  }

  function apply(mainProgress, lowerProgress) {
    const main = clamp(mainProgress), lower = clamp(lowerProgress);
    for (const state of states) applyState(state, LOWER_NODES.has(state.nodeName) ? lower : main);
    const shaft = states.find(state => state.nodeName === "truc_nen-1");
    if (shaft) shaft.screwFollowerTranslationMeters = undefined;
    applyLowerGearMotorConnection();
    const resolvedShaft = states.find(state => state.nodeName === "truc_nen-1");
    boxState.part.position.copy(boxState.basePosition).addScaledVector(boxState.axisParent,
      resolvedShaft?.screwFollowerTranslationMeters ?? resolvedShaft?.currentAxialTranslationMeters ?? 0);
    boxState.part.quaternion.copy(boxState.baseQuaternion);
    boxState.part.updateMatrixWorld(true);
    solveMainGearMotorConnection(main);
    solveMainRightArmConnection(main);
    applyHeadFollower();
    applyGacFollower(main);
    model.holder.updateMatrixWorld(true);
  }

  apply(0, 0);
  return {
    apply,
    reset() {
      for (const state of states) {
        state.coupledAngleRadians = undefined;
        state.bodyPathAngleRadians = undefined;
        state.direction = 1;
      }
      gacFollower.arcEndSlideDistanceMeters = null;
      apply(0, 0);
    },
    highlights(phase) {
      if (["closing", "opening", "scraping"].includes(phase)) return MAIN_HIGHLIGHT_NODES.map(name => model.nodeMap.get(name)).filter(Boolean);
      if (["tamping", "ejecting"].includes(phase)) return LOWER_HIGHLIGHT_NODES.map(name => model.nodeMap.get(name)).filter(Boolean);
      return [];
    }
  };
}
