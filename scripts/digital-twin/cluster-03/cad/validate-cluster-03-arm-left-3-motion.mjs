import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const motionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "arm-left-3.json");
const driverPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "truc-chinh.json");
const manifestPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "cluster-03.manifest.json");
const validationPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "validation.json");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-3-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const glbPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "final.glb");

const TARGET_ID = "arm_left_3-1";
const DRIVER_ID = "truc_chinh-1";
const PARENT_ID = "body_may-1";
const MOTION_URL = "/models/digital-twin/cluster-03/connections/arm-left-3.json";
const DRIVER_URL = "/models/digital-twin/cluster-03/connections/truc-chinh.json";
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;
const MATRIX_TOLERANCE = 1e-5;

function fail(message) { throw new Error("[cluster-03 arm_left_3 validation] " + message); }
function assert(condition, message) { if (!condition) fail(message); }
function readJson(filePath) { assert(fs.existsSync(filePath), "missing " + path.relative(repoRoot, filePath)); return JSON.parse(fs.readFileSync(filePath, "utf8")); }
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
  const driver = readJson(driverPath);
  const manifest = readJson(manifestPath);
  const validation = readJson(validationPath);
  const evidence = readJson(evidencePath);
  const inventory = readJson(inventoryPath);
  const glb = readGlbJson(glbPath);

  assert(motion.schemaVersion === "cluster-03-arm-left-3-motion.v1", "motion schema changed");
  assert(motion.clusterId === "cluster-03" && motion.status === "verified" && motion.runtimeReady === true, "motion is not runtime-ready");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion ownership changed");
  assert(motion.motion?.kind === "axis-rotation" && motion.motion.property === "rotation" && motion.motion.cadAngularLimit === null, "motion is not the diagnostic axis follower");
  assert(motion.pivot?.sourceMate === "Concentric6" && motion.driver?.partId === DRIVER_ID && motion.driver.motionFile === DRIVER_URL, "driver axis relation changed");
  assert(motion.upstreamDriver?.partId === "wiper_gear-1" && motion.upstreamDriver.motionFile === "/models/digital-twin/cluster-03/connections/wiper-gear.json" && motion.upstreamDriver.relation === "coincident-follow" && motion.upstreamDriver.sourceMates?.includes("Coincident7"), "wiper_gear upstream relation changed");
  assert(motion.connection?.kind === "point-on-path" && motion.connection.status === "verified" && motion.connection.mate === "PathMate10" && motion.connection.sourcePartId === "arm_left_2-1" && motion.connection.targetPartId === TARGET_ID, "arm_left_2 point connection changed");
  assert(motion.connection.targetPath?.sourceFeature === "Sketch1" && motion.connection.targetPath?.sourceSegment === "Line1" && motion.connection.limit?.mate === "LimitDistance1", "arm_left_2 target path changed");
  assert(JSON.stringify(motion.driver.sourceMates) === JSON.stringify(["Parallel1", "Concentric6"]), "driver mate evidence changed");
  assert(motion.motion.angleRangeRadians?.[0] === driver.motion.angleRangeRadians?.[0] && motion.motion.angleRangeRadians?.[1] === driver.motion.angleRangeRadians?.[1], "driver angular range changed");
  assert(motion.samples?.length === 3 && motion.validation?.sampleProgress?.join(",") === "0,0.5,1", "motion samples changed");
  assert(motion.validation.axisAlignmentDot >= 1 - 1e-8 && motion.validation.axisLineResidualMeters <= TOLERANCE_METERS, "CAD axis alignment exceeds tolerance");
  assert(motion.validation.pivotTransformResidualMeters <= TOLERANCE_METERS && motion.validation.glbMatrixResidual <= MATRIX_TOLERANCE, "arm_left_3 transform validation exceeds tolerance");
  assert(motion.sourceEvidence?.deferredMates?.length === 0, "arm_left_3 still reports deferred CAD mates");
  assert(evidence.schemaVersion === "cluster-03-arm-left-3-cad-connection.v1" && evidence.source?.readOnlyIntent === true, "CAD evidence is not read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");
  assert((glb.nodes ?? []).some((node) => node.name === TARGET_ID && node.matrix?.length === 16), "GLB target node matrix is missing");
  for (const mateName of ["Coincident5", "Parallel1", "Concentric6", "PathMate10", "Coincident7", "LimitDistance1"]) {
    assert(motion.constraints?.some((mate) => mate.name === mateName), "motion is missing CAD mate " + mateName);
  }

  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(manifest.status === "phase-6-arm-left-3-ready", "manifest is not at the arm_left_3 checkpoint");
  assert(part?.connectionStatus === "runtime-arm-left-3-ready", "manifest target part is not ready");
  assert(part.parent?.id === PARENT_ID && part.parent?.sourceFeature === "Coincident5" && part.pivot?.sourceFeature === "Concentric6", "manifest CAD ownership is stale");
  assert(part.render?.asset === FINAL_GLB_URL, "render owner changed");
  assert(manifest.motionFiles?.includes(MOTION_URL), "manifest motion URL is missing");
  assert(validation.phase === "phase-6" && validation.motionReady === true, "validation checkpoint is not phase 6");
  assert(validation.checks?.filter((check) => check.id.startsWith("arm-left-3-")).every((check) => check.passed === true), "arm_left_3 validation contains a failed check");
  assert(manifest.parts?.find((item) => item.id === "arm_left_2-1")?.connectionStatus === "runtime-arm-left-2-ready", "arm_left_2 regressed");
  assert(manifest.parts?.find((item) => item.id === DRIVER_ID)?.connectionStatus === "runtime-truc-chinh-ready", "truc_chinh regressed");

  console.log(JSON.stringify({
    status: "verified",
    phase: "phase-6",
    part: TARGET_ID,
    parent: PARENT_ID,
    driver: DRIVER_ID,
    motionKind: motion.motion.kind,
    axisAlignmentDot: motion.validation.axisAlignmentDot,
    axisLineResidualMeters: motion.validation.axisLineResidualMeters,
    pivotTransformResidualMeters: motion.validation.pivotTransformResidualMeters,
    glbMatrixResidual: motion.validation.glbMatrixResidual,
    sampleProgress: motion.validation.sampleProgress,
    evidenceMates: ["Coincident5", "Parallel1", "Concentric6", "Coincident7"],
    connection: { mate: "PathMate10", sourcePart: "arm_left_2-1", targetPath: "Sketch1:Line1", pathResidualMeters: motion.connection.validation.pathResidualMeters, limitDistanceResidualMeters: motion.connection.validation.limitDistanceResidualMeters },
    upstreamDriver: { part: "wiper_gear-1", relation: "Coincident7" },
    deferredMates: [],
  }, null, 2));
}

main();
