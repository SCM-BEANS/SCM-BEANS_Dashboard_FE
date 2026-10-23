import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const connections = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections");
const read = (name) => JSON.parse(fs.readFileSync(path.join(connections, name), "utf8"));

const arm2 = read("arm-left-2.json");
const arm3 = read("arm-left-3.json");
const wiper = read("wiper-gear.json");
const ocLeft = read("oc-left.json");
const gearMotor = read("gear-motor-chinh.json");
const driveCalibration = gearMotor.gear?.driveCalibration;
if (!driveCalibration) throw new Error("gear_motor_chinh drive calibration is missing");

const vector = (value) => new THREE.Vector3(...value);
const rotateAround = (point, pivot, axis, angle) => point.clone().sub(pivot).applyAxisAngle(axis, angle).add(pivot);

const arc = ocLeft.path.segments[0];
const line = ocLeft.path.segments[1];
const center = vector(arc.center);
const arcStart = vector(arc.start);
const normal = vector(arc.normal).normalize();
const basisX = arcStart.clone().sub(center).normalize();
const basisY = normal.clone().cross(basisX).normalize();
class CadArc extends THREE.Curve {
  getPoint(progress, target = new THREE.Vector3()) {
    return target.copy(center)
      .addScaledVector(basisX, arc.radius * Math.cos(arc.sweepRadians * progress))
      .addScaledVector(basisY, arc.radius * Math.sin(arc.sweepRadians * progress));
  }
}
const pathCurve = new THREE.CurvePath();
pathCurve.add(new CadArc());
pathCurve.add(new THREE.LineCurve3(vector(line.start), vector(line.end)));
const pathStart = pathCurve.getPointAt(0);

const sourcePoint = vector(arm2.wiperConnection.sourcePoint);
const driverAxisPoint = vector(arm2.connection.driverAxis.point);
const driverAxis = vector(arm2.connection.driverAxis.axis).normalize();
const wiperPathPoint = vector(arm2.wiperConnection.targetPath.point);
const wiperPathDirection = vector(arm2.wiperConnection.targetPath.direction).normalize();
const wiperLimitPoint = vector(arm2.wiperConnection.limit.targetPoint);
const wiperPivot = vector(wiper.pivot.point);
const wiperAxis = vector(wiper.pivot.axis).normalize();
const distanceLimit = arm2.wiperConnection.limit;
const arm3Pivot = vector(arm3.pivot.point);
const arm3Axis = vector(arm3.pivot.axis).normalize();
const arm3LineStart = vector(arm3.connection.targetPath.start);
const arm3LineEnd = vector(arm3.connection.targetPath.end);
const arm2Path10SourcePoint = vector(arm2.connection.sourcePoint);
const arm2Path10LimitPoint = vector(arm2.connection.limit.targetPoint);
const arm3LineLength = arm3LineEnd.distanceTo(arm3LineStart);
const pathBranchSign = Math.sign(wiperPathPoint.clone().sub(wiperLimitPoint).dot(wiperPathDirection)) || -1;

function lineRootForMotorAndCam(motorAngle, camProgress, previousArm2Angle) {
  const wiperAngle = -motorAngle;
  const wiperLinePoint = rotateAround(wiperPathPoint, wiperPivot, wiperAxis, wiperAngle);
  const wiperLineDirection = wiperPathDirection.clone().applyAxisAngle(wiperAxis, wiperAngle).normalize();
  const lineNormal = driverAxis.clone().cross(wiperLineDirection).normalize();
  const pathDelta = pathCurve.getPointAt(camProgress).sub(pathStart);
  const arm2AxisPoint = driverAxisPoint.clone().add(pathDelta);
  const arm2SourcePoint = sourcePoint.clone().add(pathDelta);
  const residual = (angle) => rotateAround(arm2SourcePoint, arm2AxisPoint, driverAxis, angle).sub(wiperLinePoint).dot(lineNormal);
  const roots = [];
  let previousAngle = previousArm2Angle - Math.PI;
  let previousResidual = residual(previousAngle);
  for (let index = 1; index <= 512; index += 1) {
    const angle = previousArm2Angle - Math.PI + (Math.PI * 2 * index) / 512;
    const currentResidual = residual(angle);
    if (previousResidual * currentResidual < 0) {
      let low = previousAngle;
      let high = angle;
      let lowResidual = previousResidual;
      for (let iteration = 0; iteration < 48; iteration += 1) {
        const middle = (low + high) * 0.5;
        const middleResidual = residual(middle);
        if (lowResidual * middleResidual <= 0) {
          high = middle;
        } else {
          low = middle;
          lowResidual = middleResidual;
        }
      }
      roots.push((low + high) * 0.5);
    }
    previousAngle = angle;
    previousResidual = currentResidual;
  }
  return roots.map((arm2Angle) => {
    const point = rotateAround(arm2SourcePoint, arm2AxisPoint, driverAxis, arm2Angle);
    const path10Point = rotateAround(arm2Path10SourcePoint.clone().add(pathDelta), arm2AxisPoint, driverAxis, arm2Angle);
    const path10Start = rotateAround(arm3LineStart, arm3Pivot, arm3Axis, wiperAngle);
    const path10End = rotateAround(arm3LineEnd, arm3Pivot, arm3Axis, wiperAngle);
    const path10Direction = path10End.clone().sub(path10Start).normalize();
    const path10Normal = driverAxis.clone().cross(path10Direction).normalize();
    const path10ResidualMeters = Math.abs(path10Point.clone().sub(path10Start).dot(path10Normal));
    const path10Limit = rotateAround(arm2Path10LimitPoint, arm3Pivot, arm3Axis, wiperAngle);
    const projectionMeters = point.clone().sub(wiperLinePoint).dot(wiperLineDirection);
    const targetPoint = rotateAround(wiperLimitPoint, wiperPivot, wiperAxis, wiperAngle);
    const targetProjectionMeters = targetPoint.clone().sub(wiperLinePoint).dot(wiperLineDirection);
    return {
      motorAngle,
      wiperAngle,
      camProgress,
      arm2Angle,
      distanceMeters: point.distanceTo(targetPoint),
      projectionMeters,
      signedDistanceAlongLineMeters: projectionMeters - targetProjectionMeters,
      residualMeters: Math.abs(residual(arm2Angle)),
    };
  }).sort((left, right) => Math.abs(left.arm2Angle - previousArm2Angle) - Math.abs(right.arm2Angle - previousArm2Angle));
}

function lineCandidatesAnalytic(motorAngle, camProgress) {
  const wiperAngle = -motorAngle;
  const wiperLinePoint = rotateAround(wiperPathPoint, wiperPivot, wiperAxis, wiperAngle);
  const wiperLineDirection = wiperPathDirection.clone().applyAxisAngle(wiperAxis, wiperAngle).normalize();
  const lineNormal = driverAxis.clone().cross(wiperLineDirection).normalize();
  const pathDelta = pathCurve.getPointAt(camProgress).sub(pathStart);
  const arm2AxisPoint = driverAxisPoint.clone().add(pathDelta);
  const arm2SourcePoint = sourcePoint.clone().add(pathDelta);
  const relative = arm2SourcePoint.clone().sub(arm2AxisPoint);
  const sineVector = driverAxis.clone().cross(relative);
  const constant = arm2AxisPoint.clone().sub(wiperLinePoint).dot(lineNormal);
  const cosineTerm = relative.dot(lineNormal);
  const sineTerm = sineVector.dot(lineNormal);
  const amplitude = Math.hypot(cosineTerm, sineTerm);
  if (amplitude <= 1e-12 || Math.abs(-constant) > amplitude) return [];
  const phase = Math.atan2(sineTerm, cosineTerm);
  const offset = Math.acos(THREE.MathUtils.clamp(-constant / amplitude, -1, 1));
  const targetPoint = rotateAround(wiperLimitPoint, wiperPivot, wiperAxis, wiperAngle);
  const targetProjectionMeters = targetPoint.clone().sub(wiperLinePoint).dot(wiperLineDirection);
  return [phase - offset, phase + offset].map((arm2Angle) => {
    const point = rotateAround(arm2SourcePoint, arm2AxisPoint, driverAxis, arm2Angle);
    const path10Point = rotateAround(arm2Path10SourcePoint.clone().add(pathDelta), arm2AxisPoint, driverAxis, arm2Angle);
    const path10Start = rotateAround(arm3LineStart, arm3Pivot, arm3Axis, wiperAngle);
    const path10End = rotateAround(arm3LineEnd, arm3Pivot, arm3Axis, wiperAngle);
    const path10Direction = path10End.clone().sub(path10Start).normalize();
    const path10ResidualMeters = path10Point.clone().sub(path10Start).cross(path10Direction).length();
    const path10ProjectionMeters = path10Point.clone().sub(path10Start).dot(path10Direction);
    const path10Limit = rotateAround(arm2Path10LimitPoint, arm3Pivot, arm3Axis, wiperAngle);
    const projectionMeters = point.clone().sub(wiperLinePoint).dot(wiperLineDirection);
    return {
      motorAngle,
      wiperAngle,
      camProgress,
      arm2Angle,
      distanceMeters: point.distanceTo(targetPoint),
      projectionMeters,
      signedDistanceAlongLineMeters: projectionMeters - targetProjectionMeters,
      residualMeters: Math.abs(point.clone().sub(wiperLinePoint).dot(lineNormal)),
      path10ResidualMeters,
      path10ProjectionMeters,
      path10DistanceMeters: path10Point.distanceTo(path10Limit),
    };
  });
}

function unwrapAngleNear(angle, reference) {
  let unwrapped = angle;
  while (unwrapped - reference > Math.PI) unwrapped -= Math.PI * 2;
  while (unwrapped - reference < -Math.PI) unwrapped += Math.PI * 2;
  return unwrapped;
}

function interpolateMotorAngle(progress) {
  const samples = driveCalibration.samples;
  if (progress <= samples[0].camProgress) return samples[0].motorAngleRadians;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (progress > current.camProgress) continue;
    const segmentProgress = (progress - previous.camProgress) / (current.camProgress - previous.camProgress);
    return THREE.MathUtils.lerp(previous.motorAngleRadians, current.motorAngleRadians, segmentProgress);
  }
  return samples.at(-1).motorAngleRadians;
}

function main() {
  const nominal = distanceLimit.distanceMeters;
  const endpointCandidates = [];
  for (let index = 0; index <= 2000; index += 1) {
    const motorAngle = (Math.PI * 2 * index) / 2000;
    for (const candidate of lineRootForMotorAndCam(motorAngle, 1, 0)) {
      if (
        candidate.distanceMeters >= distanceLimit.minimumDistanceMeters - 1e-8 &&
        candidate.distanceMeters <= distanceLimit.maximumDistanceMeters + 1e-8
      ) {
        endpointCandidates.push(candidate);
      }
    }
  }
  const closestNominal = endpointCandidates.reduce((best, candidate) =>
    Math.abs(candidate.distanceMeters - nominal) < Math.abs(best.distanceMeters - nominal) ? candidate : best,
    endpointCandidates[0]);
  const negativeBranchCandidates = endpointCandidates.filter((candidate) => candidate.signedDistanceAlongLineMeters < 0);
  const linearEndpointAngle = negativeBranchCandidates[0]?.motorAngle ?? 0;
  const linearSamples = [];
  let previousArm2Angle = 0;
  for (let index = 0; index <= 10; index += 1) {
    const camProgress = index / 10;
    const motorAngle = linearEndpointAngle * camProgress;
    const candidate = lineRootForMotorAndCam(motorAngle, camProgress, previousArm2Angle)
      .find((item) => item.signedDistanceAlongLineMeters < 0);
    if (candidate) previousArm2Angle = candidate.arm2Angle;
    linearSamples.push(candidate ?? null);
  }
  const plannedSamples = [];
  let previousMotorAngle = 0;
  let previousPlannedArm2Angle = 0;
  for (let index = 0; index <= 1000; index += 1) {
    const camProgress = index / 1000;
    const candidates = [];
    for (let motorIndex = 0; motorIndex <= 2000; motorIndex += 1) {
      const motorAngle = (Math.PI * 2 * motorIndex) / 2000;
      for (const candidate of lineCandidatesAnalytic(motorAngle, camProgress)) {
        if (
          candidate.signedDistanceAlongLineMeters < 0 &&
          candidate.distanceMeters >= distanceLimit.minimumDistanceMeters - 1e-8 &&
          candidate.distanceMeters <= distanceLimit.maximumDistanceMeters + 1e-8 &&
          candidate.path10ResidualMeters <= 1e-7 &&
          candidate.path10ProjectionMeters >= -1e-7 &&
          candidate.path10ProjectionMeters <= arm3LineLength + 1e-7 &&
          candidate.path10DistanceMeters >= arm2.connection.limit.minimumDistanceMeters - 1e-8 &&
          candidate.path10DistanceMeters <= arm2.connection.limit.maximumDistanceMeters + 1e-8
        ) {
          candidates.push(candidate);
        }
      }
    }
    candidates.sort((left, right) =>
      (Math.abs(left.distanceMeters - nominal) * 1000 + Math.abs(left.motorAngle - previousMotorAngle)) -
        (Math.abs(right.distanceMeters - nominal) * 1000 + Math.abs(right.motorAngle - previousMotorAngle)) ||
      Math.abs(left.arm2Angle - previousPlannedArm2Angle) - Math.abs(right.arm2Angle - previousPlannedArm2Angle),
    );
    const selected = candidates[0] ?? null;
    plannedSamples.push(selected);
    if (selected) {
      previousMotorAngle = selected.motorAngle;
      previousPlannedArm2Angle = selected.arm2Angle;
    }
  }
  const runtimeSamples = [];
  const distance2Samples = [];
  const distance1Samples = [];
  let previousRuntimeArm2Angle = 0;
  for (let index = 0; index <= 100; index += 1) {
    const camProgress = index / 100;
    const motorAngle = interpolateMotorAngle(camProgress);
    const candidates = lineCandidatesAnalytic(motorAngle, camProgress)
      .map((candidate) => ({
        ...candidate,
        arm2Angle: unwrapAngleNear(candidate.arm2Angle, previousRuntimeArm2Angle),
      }))
      .filter((candidate) =>
        candidate.signedDistanceAlongLineMeters * pathBranchSign >= -1e-8 &&
        candidate.distanceMeters >= distanceLimit.minimumDistanceMeters - 1e-8 &&
        candidate.distanceMeters <= distanceLimit.maximumDistanceMeters + 1e-8 &&
        candidate.path10ResidualMeters <= 1e-7 &&
        candidate.path10ProjectionMeters >= -1e-8 &&
        candidate.path10ProjectionMeters <= arm3LineLength + 1e-8 &&
        candidate.path10DistanceMeters >= arm2.connection.limit.minimumDistanceMeters - 1e-8 &&
        candidate.path10DistanceMeters <= arm2.connection.limit.maximumDistanceMeters + 1e-8,
      )
      .sort((left, right) => Math.abs(left.arm2Angle - previousRuntimeArm2Angle) - Math.abs(right.arm2Angle - previousRuntimeArm2Angle));
    const selected = candidates[0];
    if (!selected) throw new Error(`No valid main-drive solution at camProgress ${camProgress}`);
    previousRuntimeArm2Angle = selected.arm2Angle;
    distance2Samples.push(selected.distanceMeters);
    distance1Samples.push(selected.path10DistanceMeters);
    if (index % 100 === 0 || index === 1000) runtimeSamples.push(selected);
  }
  console.log(JSON.stringify({
    status: "diagnostic",
    camPath: { start: 0, end: 1, lengthMeters: ocLeft.path.lengthMeters },
    limitDistance2: distanceLimit,
    endpointCandidateCount: endpointCandidates.length,
    endpointMotorAngleRangeRadians: [
      endpointCandidates[0]?.motorAngle ?? null,
      endpointCandidates.at(-1)?.motorAngle ?? null,
    ],
    closestNominalEndpoint: closestNominal ?? null,
    negativeBranchEndpointRange: negativeBranchCandidates.length > 0
      ? [negativeBranchCandidates[0], negativeBranchCandidates.at(-1)]
      : [],
    linearEndpointAngleRadians: linearEndpointAngle,
    linearSamples,
    plannedSamples: plannedSamples.filter((_, index) => index % 10 === 0 || index === plannedSamples.length - 1),
    runtimeInterpolationSamples: runtimeSamples,
    runtimeInterpolationRangeCheck: {
      sampleCount: 1001,
      distance2RangeMeters: [Math.min(...distance2Samples), Math.max(...distance2Samples)],
      distance1RangeMeters: [Math.min(...distance1Samples), Math.max(...distance1Samples)],
      motorAngleRangeRadians: [interpolateMotorAngle(0), interpolateMotorAngle(1)],
      wiperAngleRangeRadians: [-interpolateMotorAngle(0), -interpolateMotorAngle(1)],
    },
    arm3LineLengthMeters: arm3.connection.targetPath.lengthMeters,
    note: "PathMate11 is solved as a point-on-line relation; LimitDistance2 is treated as a range, not a fixed nominal distance.",
  }, null, 2));
}

main();
