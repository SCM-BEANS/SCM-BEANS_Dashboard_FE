import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const motionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "gear-motor-chinh.json");
const manifestPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "cluster-03.manifest.json");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-5-gear-motor-chinh-cad-evidence.json");
const glbPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "final.glb");
const TARGET_ID = "gear_motor_chinh-1";
const PARENT_ID = "body_may-1";
const AXIS_MATE = "Concentric12";
const GEAR_MATE = "GearMate2";
const TOLERANCE_METERS = 1e-8;

function fail(message) { throw new Error(`[cluster-03 gear_motor_chinh validation] ${message}`); }
function assert(condition, message) { if (!condition) fail(message); }
function readJson(filePath) { assert(fs.existsSync(filePath), `missing ${path.relative(repoRoot, filePath)}`); return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function length(value) { return Math.sqrt(value.reduce((sum, item) => sum + item * item, 0)); }
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
function main() {
  const motion = readJson(motionPath);
  const manifest = readJson(manifestPath);
  const evidence = readJson(evidencePath);
  const glb = readGlbJson(glbPath);
  assert(motion.status === "verified" && motion.runtimeReady === true, "motion is not runtime-ready");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion ownership changed");
  assert(motion.motion.kind === "axis-rotation" && motion.motion.cadAngularLimit === null, "motion kind changed");
  assert(motion.pivot.sourceMate === AXIS_MATE, "axis source mate changed");
  assert(motion.gear.sourceMate === GEAR_MATE && motion.gear.drivenComponent === "wiper_gear-1", "gear relation changed");
  assert(motion.gear.ratioNumerator === 0.008 && motion.gear.ratioDenominator === 0.008 && motion.gear.ratio === 1 && motion.gear.reverse === true, "GearMate2 ratio evidence changed");
  const calibration = motion.gear.driveCalibration;
  assert(calibration?.kind === "cam-path-master" && calibration.camPathPartId === "oc_left-1", "main drive calibration is missing");
  assert(calibration.distanceMode === "LimitDistance-range", "main drive calibration does not preserve LimitDistance ranges");
  assert(calibration.camProgressRange?.[0] === 0 && calibration.camProgressRange?.[1] === 1, "main drive calibration does not cover the full oc_left path");
  assert(calibration.motorAngleRangeRadians?.[0] === 0 && Math.abs(calibration.motorAngleRangeRadians?.[1] - 1.66818569905618) <= 1e-12, "main drive motor angle envelope changed");
  assert(calibration.wiperAngleRangeRadians?.[1] === -calibration.motorAngleRangeRadians?.[1], "wiper angle is not reversed 1:1 with the main motor");
  assert(["GearMate2", "PathMate11", "LimitDistance2", "PathMate10", "LimitDistance1"].every((mate) => calibration.sourceMates?.includes(mate)), "main drive calibration mate graph is incomplete");
  assert(calibration.samples?.[0]?.camProgress === 0 && calibration.samples?.at(-1)?.camProgress === 1, "main drive calibration sample endpoints changed");
  assert(motion.samples.length === 3, "expected three diagnostic samples");
  assert(motion.validation.axisAlignmentDot >= 1 - 1e-8 && motion.validation.gearTargetAxisAlignmentDot >= 1 - 1e-8, "CAD axes are not aligned");
  assert(motion.validation.pivotTransformResidualMeters <= TOLERANCE_METERS, "CAD pivot round-trip exceeds tolerance");
  const axisMate = evidence.mates.find((item) => item.name === AXIS_MATE);
  const gearMate = evidence.mates.find((item) => item.name === GEAR_MATE);
  assert(axisMate?.entities?.some((entity) => entity.referenceComponentId === TARGET_ID), "CAD evidence lost target concentric entity");
  assert(gearMate?.definitionValues?.gearRatioNumerator === 0.008, "CAD evidence lost GearMate2 ratio");
  const node = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(node?.matrix?.length === 16, "GLB target node matrix is missing");
  const part = manifest.parts.find((item) => item.id === TARGET_ID);
  assert(part?.connectionStatus === "runtime-gear-motor-chinh-ready", "manifest target part is not ready");
  assert(part.parent?.id === PARENT_ID && part.pivot?.sourceFeature === AXIS_MATE, "manifest CAD ownership is stale");
  assert(manifest.parts.find((item) => item.id === "truc_nen-1")?.connectionStatus === "runtime-truc-nen-ready", "truc_nen regressed");
  console.log(JSON.stringify({
    status: "verified",
    phase: "phase-5",
    part: TARGET_ID,
    parent: PARENT_ID,
    axis: motion.pivot.axis,
    axisMagnitude: length(motion.pivot.axis),
    gearRatio: motion.gear.ratio,
    reverse: motion.gear.reverse,
    diagnosticAnglesRadians: motion.samples.map((sample) => sample.angleRadians),
    driveCalibration: {
      camPathPartId: calibration.camPathPartId,
      motorAngleRangeRadians: calibration.motorAngleRangeRadians,
      wiperAngleRangeRadians: calibration.wiperAngleRangeRadians,
      sampleCount: calibration.samples.length,
    },
    drivenCoupling: motion.gear.couplingStatus,
  }, null, 2));
}
main();
