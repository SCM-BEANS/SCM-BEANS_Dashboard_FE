import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const motionPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "truc-nen.json");
const manifestPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "connections", "cluster-03.manifest.json");
const evidencePath = path.join(repoRoot, "plans", "cluster-03-phase-5-truc-nen-cad-evidence.json");
const glbPath = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03", "final.glb");
const TARGET_ID = "truc_nen-1";
const PARENT_ID = "body_may-1";
const AXIS_MATE = "Concentric23";
const SCREW_MATE = "Screw2";
const TOLERANCE_METERS = 1e-8;

function fail(message) {
  throw new Error(`[cluster-03 truc_nen validation] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function length(value) {
  return Math.sqrt(value.reduce((sum, item) => sum + item * item, 0));
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
  const manifest = readJson(manifestPath);
  const evidence = readJson(evidencePath);
  const glb = readGlbJson(glbPath);
  assert(motion.status === "verified" && motion.runtimeReady === true, "motion is not runtime-ready");
  assert(motion.partId === TARGET_ID && motion.nodeName === TARGET_ID && motion.parentId === PARENT_ID, "motion ownership changed");
  assert(motion.motion.kind === "screw-axis" && motion.motion.property === "rotation+translation", "motion kind changed");
  assert(motion.motion.cadAngularLimit === null && motion.motion.cadTranslationLimitMeters === null, "motion limits are not explicit");
  assert(motion.pivot.sourceMate === AXIS_MATE, "axis source mate changed");
  assert(motion.screw.sourceMate === SCREW_MATE && motion.screw.pitchMeters === 0.004, "Screw2 pitch evidence changed");
  assert(motion.screw.reverse === true && motion.screw.translationPerRevolutionMeters === -0.004, "Screw2 reverse translation relation changed");
  assert(motion.samples.length === 3, "expected three diagnostic samples");
  assert(motion.samples[0].translationMeters === 0 && motion.samples[2].translationMeters === -0.004, "sample translation range changed");
  assert(motion.validation.axisAlignmentDot >= 1 - 1e-8 && motion.validation.screwAxisAlignmentDot >= 1 - 1e-8, "CAD axes are not aligned");
  assert(motion.validation.pivotTransformResidualMeters <= TOLERANCE_METERS, "CAD pivot round-trip exceeds tolerance");
  const axisMate = evidence.mates.find((item) => item.name === AXIS_MATE);
  const screwMate = evidence.mates.find((item) => item.name === SCREW_MATE);
  assert(axisMate?.entities?.some((entity) => entity.referenceComponentId === TARGET_ID), "CAD evidence lost target concentric entity");
  assert(screwMate?.definitionValues?.revolutionValue === 0.004, "CAD evidence lost Screw2 pitch");
  const node = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(node?.matrix?.length === 16, "GLB target node matrix is missing");
  const part = manifest.parts.find((item) => item.id === TARGET_ID);
  assert(part?.connectionStatus === "runtime-truc-nen-ready", "manifest target part is not ready");
  assert(part.parent?.id === PARENT_ID && part.pivot?.sourceFeature === AXIS_MATE, "manifest CAD ownership is stale");
  assert(manifest.parts.find((item) => item.id === "truc_chinh-1")?.connectionStatus === "runtime-truc-chinh-ready", "truc_chinh regressed");
  console.log(JSON.stringify({
    status: "verified",
    phase: "phase-5",
    part: TARGET_ID,
    parent: PARENT_ID,
    axis: motion.pivot.axis,
    axisMagnitude: length(motion.pivot.axis),
    pitchMeters: motion.screw.pitchMeters,
    translationPerRevolutionMeters: motion.screw.translationPerRevolutionMeters,
    diagnosticAnglesRadians: motion.samples.map((sample) => sample.angleRadians),
    cadAngularLimit: motion.motion.cadAngularLimit,
    cadTranslationLimitMeters: motion.motion.cadTranslationLimitMeters,
  }, null, 2));
}

main();
