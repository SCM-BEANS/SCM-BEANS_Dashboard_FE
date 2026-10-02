import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const motionPath = path.join(clusterRoot, "connections", "oc-right.json");
const rootFramePath = path.join(clusterRoot, "connections", "root-frame.json");
const glbPath = path.join(clusterRoot, "final.glb");
const TOLERANCE_METERS = 1e-6;

function fail(message) {
  throw new Error(`[cluster-03 oc_right validation] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readGlbJson(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.toString("ascii", 0, 4) === "glTF", "final.glb is not a binary GLB");
  let offset = 12;
  let json = null;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) json = JSON.parse(buffer.subarray(offset + 8, offset + 8 + length).toString("utf8"));
    offset += length + 8;
  }
  assert(json, "final.glb has no JSON chunk");
  return json;
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function length(value) {
  return Math.sqrt(value.reduce((sum, item) => sum + item * item, 0));
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
  return value.map((item) => item / length(value));
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function scale(value, factor) {
  return value.map((item) => item * factor);
}

function applyGltfMatrix(matrix, point) {
  return [
    matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
    matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
    matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14],
  ];
}

function pointAt(motion, progress) {
  const [arc, line] = motion.path.segments;
  const arcLength = arc.lengthMeters;
  const lineLength = line.lengthMeters;
  const totalLength = arcLength + lineLength;
  const distanceAlongPath = Math.max(0, Math.min(1, progress)) * totalLength;
  if (distanceAlongPath <= arcLength) {
    const basisX = normalize(subtract(arc.start, arc.center));
    const basisY = normalize(cross(arc.normal, basisX));
    const angle = arc.sweepRadians * (distanceAlongPath / arcLength);
    return add(
      arc.center,
      add(
        scale(basisX, arc.radius * Math.cos(angle)),
        scale(basisY, arc.radius * Math.sin(angle)),
      ),
    );
  }
  return add(
    line.start,
    scale(subtract(line.end, line.start), (distanceAlongPath - arcLength) / lineLength),
  );
}

function main() {
  const motion = readJson(motionPath);
  const rootFrame = readJson(rootFramePath);
  const glb = readGlbJson(glbPath);
  assert(motion.status === "verified" && motion.runtimeReady === true, "oc-right motion is not verified");
  assert(rootFrame.status === "verified" && rootFrame.rootFrameReady === true, "root frame is not verified");
  assert(motion.partId === "oc_right-1" && motion.parentId === "body_may-1", "oc-right ownership changed");
  assert(motion.path.sourceFeature === "Sketch2", "oc-right path source changed");
  assert(JSON.stringify(motion.path.sourceSegments) === JSON.stringify(["Arc1", "Line2"]), "oc-right path segments changed");
  assert(JSON.stringify(motion.path.segmentDirections) === JSON.stringify(["reverse", "reverse"]), "oc-right CAD path direction evidence changed");
  const node = (glb.nodes ?? []).find((item) => item.name === motion.nodeName);
  assert(node?.matrix?.length === 16, "oc_right-1 GLB node matrix is missing");

  const reconstructedAnchor = applyGltfMatrix(node.matrix, motion.anchor.localPoint);
  const startResidual = length(subtract(reconstructedAnchor, motion.path.start));
  assert(startResidual <= TOLERANCE_METERS, `GLB initial anchor residual is ${startResidual}`);

  const sampleResiduals = motion.samples.map((sample) => {
    const expected = pointAt(motion, sample.progress);
    return length(subtract(expected, sample.point));
  });
  assert(sampleResiduals.every((residual) => residual <= TOLERANCE_METERS), "stored motion samples are stale");

  console.log(JSON.stringify({
    status: "verified",
    part: motion.partId,
    parent: motion.parentId,
    samples: motion.samples.map((sample, index) => ({ progress: sample.progress, residualMeters: sampleResiduals[index] })),
    initialAnchorResidualMeters: startResidual,
    sourceSegments: motion.path.sourceSegments,
    segmentDirections: motion.path.segmentDirections,
  }, null, 2));
}

main();
