import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const motionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "arm-left-1.json");
const driverPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "oc-left.json");
const manifestPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "cluster-03.manifest.json");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-6-arm-left-1-cad-evidence.json");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const glbPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "final.glb");

const TARGET_ID = "arm_left_1-1";
const DRIVER_ID = "oc_left-1";
const PARENT_ID = "body_may-1";
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

function main() {
  const motion = readJson(motionPath);
  const driver = readJson(driverPath);
  const manifest = readJson(manifestPath);
  const evidence = readJson(evidencePath);
  const inventory = readJson(inventoryPath);
  const glb = readGlbJson(glbPath);

  assert(motion.schemaVersion === "cluster-03-arm-left-1-motion.v1", "motion schema changed");
  assert(motion.status === "verified" && motion.runtimeReady === true, "motion is not runtime-ready");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion ownership changed");
  assert(motion.motion.kind === "driver-follow" && motion.motion.preserveInitialOrientation === true, "motion kind changed");
  assert(motion.driver.partId === DRIVER_ID && motion.driver.motionFile === "/models/digital-twin/cluster-03/connections/oc-left.json", "driver relation changed");
  assert(motion.driver.sourceMates.includes("Coincident1") && motion.driver.sourceMates.includes("Concentric1"), "driver mate evidence changed");
  assert(motion.driver.pathConstraint === "PathMate8", "PathMate8 evidence changed");
  assert(motion.bodyConnection?.kind === "point-on-path", "arm_left_1 body PathMate8 connection is missing");
  assert(motion.bodyConnection.mate === "PathMate8" && motion.bodyConnection.sourcePartId === TARGET_ID && motion.bodyConnection.targetPartId === PARENT_ID, "arm_left_1 body PathMate8 participants changed");
  assert(motion.bodyConnection.targetPath?.sourceFeature === "Sketch1" && JSON.stringify(motion.bodyConnection.targetPath.sourceSegments) === JSON.stringify(["Arc3", "Line1"]), "arm_left_1 body PathMate8 path changed");
  assert(motion.bodyConnection.targetPath.coordinateFrame === "solidworks-assembly", "arm_left_1 body PathMate8 frame changed");
  assert(motion.bodyConnection.validation?.pathDriverStartResidualMeters <= motion.bodyConnection.validation?.toleranceMeters && motion.bodyConnection.validation?.toleranceMeters <= TOLERANCE_METERS, "arm_left_1 body PathMate8 residual exceeds tolerance");
  assert(motion.path.sourceFeature === driver.path.sourceFeature, "driver path source changed");
  assert(motion.samples.length === 3, "expected three progress samples");
  assert(motion.validation.sampleProgress.join(",") === "0,0.5,1", "sample progress changed");
  assert(motion.validation.concentricAxisAlignmentDot >= 1 - 1e-8, "CAD concentric axes are not aligned");
  assert(motion.validation.initialMatingPointResidualMeters <= TOLERANCE_METERS, "initial mating point exceeds tolerance");
  assert(motion.validation.glbMatrixResidual <= 1e-5, "GLB matrix residual exceeds tolerance");
  assert(evidence.source.readOnlyIntent === true, "CAD evidence is not read-only");
  assert(evidence.source.solidWorksRevision === inventory.source.solidWorksRevision, "SolidWorks revision mismatch");
  assert((glb.nodes ?? []).some((node) => node.name === TARGET_ID && node.matrix?.length === 16), "GLB target node matrix is missing");

  const part = manifest.parts.find((item) => item.id === TARGET_ID);
  assert(part?.connectionStatus === "runtime-arm-left-1-ready", "manifest target part is not ready");
  assert(part.parent?.id === PARENT_ID && part.pivot?.sourceFeature === "Coincident1", "manifest CAD ownership is stale");
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
    phase: "phase-6",
    part: TARGET_ID,
    parent: PARENT_ID,
    driver: DRIVER_ID,
    motionKind: motion.motion.kind,
    axisAlignmentDot: motion.validation.concentricAxisAlignmentDot,
    initialMatingPointResidualMeters: motion.validation.initialMatingPointResidualMeters,
    glbMatrixResidual: motion.validation.glbMatrixResidual,
    sampleProgress: motion.validation.sampleProgress,
    evidenceMates: ["PathMate8", "Coincident1", "Concentric1"],
    bodyConnection: {
      mate: motion.bodyConnection.mate,
      sourcePartId: motion.bodyConnection.sourcePartId,
      targetPartId: motion.bodyConnection.targetPartId,
      sourceSegments: motion.bodyConnection.targetPath.sourceSegments,
      pathDriverStartResidualMeters: motion.bodyConnection.validation.pathDriverStartResidualMeters,
    },
    laterArmStatuses,
  }, null, 2));
}

main();
