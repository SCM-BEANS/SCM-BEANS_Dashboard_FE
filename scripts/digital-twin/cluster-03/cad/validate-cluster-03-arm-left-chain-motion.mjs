import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const connectionsRoot = path.join(clusterRoot, "connections");
const TOLERANCE_METERS = 1e-8;

function fail(message) {
  throw new Error("[cluster-03 arm-left chain validation] " + message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(fileName) {
  const filePath = path.join(connectionsRoot, fileName);
  assert(fs.existsSync(filePath), "missing " + path.relative(repoRoot, filePath));
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readGlbJson() {
  const filePath = path.join(clusterRoot, "final.glb");
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

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
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

function vectorLength(value) {
  return Math.sqrt(dot(value, value));
}

function assertFiniteLine(line, label) {
  assert(Array.isArray(line?.start) && Array.isArray(line?.end), `${label} endpoints are missing`);
  assert(line.parameterRange?.[0] === 0 && line.parameterRange?.[1] === 1, `${label} parameter range changed`);
  const length = vectorLength(subtract(line.end, line.start));
  assert(Math.abs(length - line.lengthMeters) <= TOLERANCE_METERS, `${label} length changed`);
  assert(length > 0, `${label} is degenerate`);
}

function assertPointOnLine(point, line, label) {
  const direction = subtract(line.end, line.start);
  const residual = vectorLength(cross(subtract(point, line.start), direction)) / vectorLength(direction);
  assert(residual <= TOLERANCE_METERS, `${label} leaves its CAD line by ${residual} m`);
}

function main() {
  const arm2 = readJson("arm-left-2.json");
  const arm3 = readJson("arm-left-3.json");
  const wiper = readJson("wiper-gear.json");
  const gearMotor = readJson("gear-motor-chinh.json");
  const trucChinh = readJson("truc-chinh.json");
  const ocLeft = readJson("oc-left.json");
  const manifest = readJson("cluster-03.manifest.json");
  const glb = readGlbJson();

  assert(arm2.status === "verified" && arm2.runtimeReady === true, "arm_left_2 is not runtime-ready");
  assert(arm3.status === "verified" && arm3.runtimeReady === true, "arm_left_3 is not runtime-ready");
  assert(wiper.status === "verified" && wiper.runtimeReady === true, "wiper_gear is not runtime-ready");
  assert(arm2.sourceEvidence?.deferredMates?.length === 0, "arm_left_2 still has deferred mates");
  assert(arm3.sourceEvidence?.deferredMates?.length === 0, "arm_left_3 still has deferred mates");

  assert(gearMotor.gear?.sourceMate === "GearMate2", "main motor is not driven by GearMate2");
  assert(gearMotor.gear.drivenComponent === "wiper_gear-1", "main motor driven component changed");
  assert(gearMotor.gear.ratio === 1 && gearMotor.gear.reverse === true, "main GearMate2 ratio/reverse changed");
  const driveCalibration = gearMotor.gear.driveCalibration;
  assert(driveCalibration?.kind === "cam-path-master", "main motor cam-path calibration is missing");
  assert(driveCalibration.camPathPartId === "oc_left-1", "main motor calibration cam authority changed");
  assert(driveCalibration.distanceMode === "LimitDistance-range", "main motor calibration must preserve LimitDistance ranges");
  assert(driveCalibration.camProgressRange?.[0] === 0 && driveCalibration.camProgressRange?.[1] === 1, "main motor calibration does not cover the complete oc_left path");
  assert(driveCalibration.motorAngleRangeRadians?.[0] === 0 && Math.abs(driveCalibration.motorAngleRangeRadians?.[1] - 1.66818569905618) <= 1e-12, "main motor calibrated angle envelope changed");
  assert(driveCalibration.wiperAngleRangeRadians?.[0] === 0 && Math.abs(driveCalibration.wiperAngleRangeRadians?.[1] + driveCalibration.motorAngleRangeRadians?.[1]) <= 1e-12, "wiper calibration is not the reversed 1:1 GearMate2 relation");
  assert(Array.isArray(driveCalibration.samples) && driveCalibration.samples.length >= 2, "main motor calibration samples are missing");
  assert(driveCalibration.samples[0].camProgress === 0 && driveCalibration.samples.at(-1).camProgress === 1, "main motor calibration sample endpoints changed");
  for (const mateName of ["GearMate2", "PathMate11", "LimitDistance2", "PathMate10", "LimitDistance1"]) {
    assert(driveCalibration.sourceMates?.includes(mateName), `main motor calibration is missing ${mateName}`);
  }
  assert(wiper.gear?.sourceMate === "GearMate2" && wiper.gear.drivingComponent === "gear_motor_chinh-1", "wiper_gear main driver changed");
  assert(wiper.pivot?.sourceMate === "Concentric7", "wiper_gear pivot mate changed");
  assert(wiper.connection?.sourceMate === "GearMate2", "wiper_gear connection source changed");
  for (const mateName of ["Concentric7", "PathMate11", "LimitDistance2", "Coincident7"]) {
    assert(wiper.connection.dependentMates?.includes(mateName), `wiper_gear is missing dependent mate ${mateName}`);
  }

  assert(arm2.wiperConnection?.mate === "PathMate11", "arm_left_2 PathMate11 relation is missing");
  assert(arm2.wiperConnection.targetPartId === "wiper_gear-1", "PathMate11 target changed");
  assert(arm2.wiperConnection.targetPath?.sourceFeature === "Sketch1" && arm2.wiperConnection.targetPath?.sourceSegment === "Line1", "PathMate11 target sketch changed");
  assert(arm2.wiperConnection.limit?.mate === "LimitDistance2", "LimitDistance2 relation is missing");
  assert(arm2.wiperConnection.validation?.pathResidualMeters <= TOLERANCE_METERS && arm2.wiperConnection.validation?.limitDistanceResidualMeters <= TOLERANCE_METERS, "PathMate11/LimitDistance2 residual exceeds tolerance");
  assertPointOnLine(arm2.wiperConnection.sourcePoint, {
    start: arm2.wiperConnection.targetPath.point,
    end: arm2.wiperConnection.targetPath.point.map((value, index) => value + arm2.wiperConnection.targetPath.direction[index]),
    lengthMeters: vectorLength(arm2.wiperConnection.targetPath.direction),
    parameterRange: [0, 1],
  }, "arm_left_2 PathMate11 point");

  assert(arm3.upstreamDriver?.partId === "wiper_gear-1", "arm_left_3 is not downstream of wiper_gear");
  assert(arm3.upstreamDriver.motionFile === "/models/digital-twin/cluster-03/connections/wiper-gear.json", "arm_left_3 wiper motion file changed");
  assert(arm3.upstreamDriver.sourceMates?.includes("Coincident7"), "arm_left_3 Coincident7 relation is missing");
  assert(arm3.driver?.partId === "truc_chinh-1" && arm3.driver.sourceMates?.includes("Parallel1") && arm3.driver.sourceMates?.includes("Concentric6"), "truc_chinh arm driver relation changed");
  assert(trucChinh.sourceEvidence?.dependentMates?.includes("Concentric7"), "truc_chinh no longer records the wiper_gear concentric dependency");

  assert(arm2.connection?.mate === "PathMate10" && arm2.connection.targetPartId === "arm_left_3-1", "PathMate10 target changed");
  assert(arm2.connection.targetPath?.sourceFeature === "Sketch1" && arm2.connection.targetPath?.sourceSegment === "Line1", "PathMate10 target sketch changed");
  assertFiniteLine(arm2.connection.targetPath, "arm_left_2 PathMate10 target line");
  assert(arm2.connection.validation?.pathResidualMeters <= TOLERANCE_METERS && arm2.connection.validation?.limitDistanceResidualMeters <= TOLERANCE_METERS, "PathMate10 residual exceeds tolerance");
  assert(arm3.connection?.mate === "PathMate10" && arm3.connection.targetPartId === "arm_left_3-1", "arm_left_3 PathMate10 mirror changed");
  assertFiniteLine(arm3.connection.targetPath, "arm_left_3 PathMate10 target line");

  assert(arm2.path?.sourcePartId === ocLeft.path?.sourcePartId, "arm_left_2 no longer uses the oc_left body path");
  assert(arm2.path.sourceFeature === ocLeft.path.sourceFeature && JSON.stringify(arm2.path.sourceSegments) === JSON.stringify(ocLeft.path.sourceSegments), "oc_left path source changed");
  assert(Math.abs(arm2.path.lengthMeters - ocLeft.path.lengthMeters) <= TOLERANCE_METERS, "oc_left path length changed through arm_left_2");
  assert(arm2.driver?.partId === "oc_left-1" && arm2.driver.sourcePath === "Sketch1:Arc3+Line1", "oc_left path authority changed");

  const requiredNodes = ["gear_motor_chinh-1", "wiper_gear-1", "arm_left_2-1", "arm_left_3-1", "truc_chinh-1", "oc_left-1", "arm_left_1-1"];
  for (const nodeName of requiredNodes) {
    assert(glb.nodes?.some((node) => node.name === nodeName && node.matrix?.length === 16), `GLB node ${nodeName} is missing`);
  }
  for (const motionUrl of [
    "/models/digital-twin/cluster-03/connections/gear-motor-chinh.json",
    "/models/digital-twin/cluster-03/connections/wiper-gear.json",
    "/models/digital-twin/cluster-03/connections/arm-left-2.json",
    "/models/digital-twin/cluster-03/connections/arm-left-3.json",
  ]) {
    assert(manifest.motionFiles?.includes(motionUrl), `manifest is missing ${motionUrl}`);
  }

  console.log(JSON.stringify({
    status: "verified",
    phase: "phase-6",
    graph: "gear_motor_chinh-1 -> GearMate2 -> wiper_gear-1 -> PathMate11 -> arm_left_2-1 -> PathMate10/Coincident7 -> arm_left_3-1 -> truc_chinh-1 -> oc_left-1/arm_left_1-1",
    finitePathMates: ["PathMate10", "PathMate11"],
    resolvedMates: ["Concentric7", "LimitDistance1", "LimitDistance2", "Coincident7"],
    deferredMates: [],
    driveCalibration: {
      camPathPartId: driveCalibration.camPathPartId,
      camProgressRange: driveCalibration.camProgressRange,
      motorAngleRangeRadians: driveCalibration.motorAngleRangeRadians,
      wiperAngleRangeRadians: driveCalibration.wiperAngleRangeRadians,
      sourceMates: driveCalibration.sourceMates,
    },
    ocLeftPathPreserved: true,
  }, null, 2));
}

main();
