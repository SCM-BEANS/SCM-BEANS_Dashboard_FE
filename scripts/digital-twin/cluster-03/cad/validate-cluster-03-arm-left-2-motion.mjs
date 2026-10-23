import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const motionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "arm-left-2.json");
const driverPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "oc-left.json");
const wiperPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "wiper-gear.json");
const chainPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "arm-left-1.json");
const manifestPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "cluster-03.manifest.json");
const validationPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "validation.json");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-2-cad-evidence.json");
const arm3EvidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-3-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const glbPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "final.glb");

const TARGET_ID = "arm_left_2-1";
const DRIVER_ID = "oc_left-1";
const CHAIN_ID = "arm_left_1-1";
const ARM3_ID = "arm_left_3-1";
const WIPER_ID = "wiper_gear-1";
const PARENT_ID = "body_may-1";
const MOTION_URL = "/models/digital-twin/cluster-03/connections/arm-left-2.json";
const DRIVER_URL = "/models/digital-twin/cluster-03/connections/oc-left.json";
const CHAIN_URL = "/models/digital-twin/cluster-03/connections/arm-left-1.json";
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const TOLERANCE_METERS = 1e-8;

function fail(message) {
  throw new Error("[cluster-03 arm_left_2 validation] " + message);
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

function main() {
  const motion = readJson(motionPath);
  const driver = readJson(driverPath);
  const wiper = readJson(wiperPath);
  const chain = readJson(chainPath);
  const manifest = readJson(manifestPath);
  const validation = readJson(validationPath);
  const evidence = readJson(evidencePath);
  const arm3Evidence = readJson(arm3EvidencePath);
  const inventory = readJson(inventoryPath);
  const glb = readGlbJson(glbPath);

  assert(motion.schemaVersion === "cluster-03-arm-left-2-motion.v1", "motion schema changed");
  assert(motion.status === "verified" && motion.runtimeReady === true, "motion is not runtime-ready");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion ownership changed");
  assert(motion.motion?.kind === "driver-follow" && motion.motion.property === "translation" && motion.motion.preserveInitialOrientation === true, "motion kind changed");
  assert(motion.driver?.partId === DRIVER_ID && motion.driver.motionFile === DRIVER_URL, "driver relation changed");
  assert(motion.driver.dependencyPartId === CHAIN_ID && motion.driver.dependencyMotionFile === CHAIN_URL, "dependency chain changed");
  assert(motion.driver.sourceMates?.includes("Coincident3") && motion.driver.sourceMates?.includes("Concentric2"), "driver mate evidence changed");
  assert(motion.connection?.kind === "point-on-path" && motion.connection.mate === "PathMate10" && motion.connection.sourcePartId === TARGET_ID && motion.connection.targetPartId === ARM3_ID, "arm_left_3 point connection is missing");
  assert(motion.connection.targetPath?.sourceFeature === "Sketch1" && motion.connection.targetPath?.sourceSegment === "Line1", "arm_left_3 target path changed");
  assert(motion.connection.limit?.mate === "LimitDistance1" && motion.validation.connectionPathResidualMeters <= TOLERANCE_METERS && motion.validation.connectionLimitDistanceResidualMeters <= TOLERANCE_METERS, "arm_left_2 to arm_left_3 connection exceeds tolerance");
  assert(motion.wiperConnection?.kind === "point-on-path" && motion.wiperConnection.status === "verified" && motion.wiperConnection.mate === "PathMate11" && motion.wiperConnection.sourcePartId === TARGET_ID && motion.wiperConnection.targetPartId === WIPER_ID, "arm_left_2 to wiper_gear connection is missing");
  assert(motion.wiperConnection.targetPath?.sourceFeature === "Sketch1" && motion.wiperConnection.targetPath?.sourceSegment === "Line1", "wiper target path changed");
  assert(motion.wiperConnection.limit?.mate === "LimitDistance2" && motion.wiperConnection.validation.pathResidualMeters <= TOLERANCE_METERS && motion.wiperConnection.validation.limitDistanceResidualMeters <= TOLERANCE_METERS, "arm_left_2 to wiper_gear connection exceeds tolerance");
  assert(wiper.schemaVersion === "cluster-03-wiper-gear-motion.v1" && wiper.status === "verified" && wiper.runtimeReady === true, "wiper_gear motion is not runtime-ready");
  assert(wiper.gear?.sourceMate === "GearMate2" && wiper.gear.drivingComponent === "gear_motor_chinh-1" && wiper.gear.ratio === 1 && wiper.gear.reverse === true, "wiper_gear driver relation changed");
  assert(wiper.pivot?.sourceMate === "Concentric7" && wiper.connection?.dependentMates?.includes("PathMate11") && wiper.connection?.dependentMates?.includes("LimitDistance2"), "wiper_gear CAD dependency evidence changed");
  assert(motion.driver.sourcePath === driver.path.sourceFeature + ":" + driver.path.sourceSegments.join("+"), "driver path source changed");
  assert(chain.schemaVersion === "cluster-03-arm-left-1-motion.v1" && chain.status === "verified", "arm_left_1 chain is not verified");
  assert(motion.samples?.length === 3 && motion.validation?.sampleProgress?.join(",") === "0,0.5,1", "sample progress changed");
  assert(motion.validation.concentricAxisAlignmentDot >= 1 - 1e-8, "CAD concentric axes are not aligned");
  assert(motion.validation.initialMatingPointResidualMeters <= TOLERANCE_METERS, "initial mating point exceeds tolerance");
  assert(motion.validation.glbMatrixResidual <= 1e-5, "GLB matrix residual exceeds tolerance");
  assert(Number.isFinite(motion.validation.chainOffsetMeters), "chain offset evidence is missing");
  assert(motion.sourceEvidence?.deferredMates?.length === 0, "arm_left_2 still reports deferred CAD mates");
  assert(evidence.schemaVersion === "cluster-03-arm-left-2-cad-connection.v1", "CAD evidence schema changed");
  assert(arm3Evidence.schemaVersion === "cluster-03-arm-left-3-cad-connection.v1" && arm3Evidence.source?.readOnlyIntent === true, "arm_left_3 CAD evidence is missing or not read-only");
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence is not read-only");
  assert(evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision, "SolidWorks revision mismatch");
  assert((glb.nodes ?? []).some((node) => node.name === TARGET_ID && node.matrix?.length === 16), "GLB target node matrix is missing");

  for (const mateName of ["Coincident3", "Concentric2", "PathMate10", "PathMate11", "LimitDistance1", "LimitDistance2"]) {
    assert(motion.constraints?.some((mate) => mate.name === mateName), "motion is missing CAD mate " + mateName);
  }

  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part?.connectionStatus === "runtime-arm-left-2-ready", "manifest target part is not ready");
  assert(part.parent?.id === PARENT_ID && part.parent?.sourceFeature === "Coincident3+Concentric2+PathMate10" && part.pivot?.sourceFeature === "Coincident3", "manifest CAD ownership is stale");
  assert(part.render?.asset === FINAL_GLB_URL, "render owner changed");
  assert(manifest.motionFiles?.includes(MOTION_URL), "manifest motion URL is missing");
  assert(validation.phase === "phase-6" && validation.motionReady === true, "validation checkpoint is not phase 6");
  assert(validation.checks?.filter((check) => check.id.startsWith("arm-left-2-")).every((check) => check.passed === true), "arm_left_2 validation contains a failed check");
  assert(manifest.parts?.find((item) => item.id === CHAIN_ID)?.connectionStatus === "runtime-arm-left-1-ready", "arm_left_1 regressed");
  assert(manifest.parts?.find((item) => item.id === DRIVER_ID)?.connectionStatus === "runtime-oc-left-ready", "oc_left regressed");

  console.log(JSON.stringify({
    status: "verified",
    phase: "phase-6",
    part: TARGET_ID,
    parent: PARENT_ID,
    driver: DRIVER_ID,
    dependency: CHAIN_ID,
    motionKind: motion.motion.kind,
    axisAlignmentDot: motion.validation.concentricAxisAlignmentDot,
    initialMatingPointResidualMeters: motion.validation.initialMatingPointResidualMeters,
    glbMatrixResidual: motion.validation.glbMatrixResidual,
    chainOffsetMeters: motion.validation.chainOffsetMeters,
    sampleProgress: motion.validation.sampleProgress,
    evidenceMates: ["Coincident3", "Concentric2"],
    connection: { mate: "PathMate10", targetPart: ARM3_ID, targetPath: "Sketch1:Line1", pathResidualMeters: motion.validation.connectionPathResidualMeters, limitDistanceResidualMeters: motion.validation.connectionLimitDistanceResidualMeters },
    wiperConnection: { mate: "PathMate11", targetPart: WIPER_ID, targetPath: "Sketch1:Line1", pathResidualMeters: motion.wiperConnection.validation.pathResidualMeters, limitDistanceResidualMeters: motion.wiperConnection.validation.limitDistanceResidualMeters },
    deferredMates: [],
  }, null, 2));
}

main();
