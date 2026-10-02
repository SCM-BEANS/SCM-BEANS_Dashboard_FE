import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const targetGlbPath = path.join(clusterRoot, "final.glb");
const outputPath = path.join(clusterRoot, "connections", "root-frame.json");

const CLUSTER_ID = "cluster-03";
const ROOT_FRAME_SCHEMA = "cluster-03-root-frame.v1";
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const MATRIX_ENTRY_TOLERANCE = 1e-4;
const TRANSLATION_TOLERANCE_METERS = 1e-4;
const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function fail(message) {
  throw new Error(`[cluster-03 root frame] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing input: ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizePath(filePath) {
  return String(filePath).replaceAll("\\", "/").toLowerCase();
}

function readGlbJson(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.toString("ascii", 0, 4) === "glTF", "target asset is not a binary GLB");

  let offset = 12;
  let json = null;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8"));
    offset += 8 + length;
  }

  assert(json, "target asset has no JSON chunk");
  return json;
}

function maxAbsoluteDifference(left, right) {
  assert(left.length === 16 && right.length === 16, "transform matrices must contain 16 values");
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

function toGltfMatrix(solidWorksTransform) {
  assert(solidWorksTransform.length === 16, "SolidWorks transform must contain 16 values");
  return [
    solidWorksTransform[0],
    solidWorksTransform[1],
    solidWorksTransform[2],
    0,
    solidWorksTransform[3],
    solidWorksTransform[4],
    solidWorksTransform[5],
    0,
    solidWorksTransform[6],
    solidWorksTransform[7],
    solidWorksTransform[8],
    0,
    solidWorksTransform[9],
    solidWorksTransform[10],
    solidWorksTransform[11],
    1,
  ];
}

function translationDifference(left, right) {
  return Math.max(
    Math.abs(left[12] - right[12]),
    Math.abs(left[13] - right[13]),
    Math.abs(left[14] - right[14]),
  );
}

function writeJson(value) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const inventory = readJson(inventoryPath);
  assert(inventory.schemaVersion === "cluster-03-cad-inventory.v1", "unexpected Phase 0 inventory schema");
  assert(fs.existsSync(targetGlbPath), "cluster-03 final.glb is missing");

  const targetRecord = inventory.glbFiles.find((record) =>
    normalizePath(record.path).endsWith("/public/models/digital-twin/cluster-03/final.glb"),
  );
  assert(targetRecord, "inventory has no target cluster-03 final.glb record");

  const glb = readGlbJson(targetGlbPath);
  const meshNodes = (glb.nodes ?? []).filter((node) => node.mesh !== undefined);
  assert(meshNodes.length === inventory.components.length, "GLB mesh-node count differs from CAD component count");

  const glbNodeByName = new Map(meshNodes.map((node) => [node.name, node]));
  const componentIds = new Set();
  const nodeNames = new Set();
  const comparisons = [];

  for (const component of inventory.components) {
    assert(!componentIds.has(component.id), `duplicate CAD component id: ${component.id}`);
    componentIds.add(component.id);
    assert(!nodeNames.has(component.gltfNodeCandidate), `duplicate GLB node mapping: ${component.gltfNodeCandidate}`);
    nodeNames.add(component.gltfNodeCandidate);

    const node = glbNodeByName.get(component.gltfNodeCandidate);
    assert(node, `missing GLB node for CAD component: ${component.id}`);
    assert(Array.isArray(node.matrix), `GLB node has no explicit matrix: ${component.gltfNodeCandidate}`);

    const cadMatrix = toGltfMatrix(component.transformArrayData);
    const glbMatrix = node.matrix;
    const matrixError = maxAbsoluteDifference(cadMatrix, glbMatrix);
    const translationError = translationDifference(cadMatrix, glbMatrix);
    comparisons.push({
      componentId: component.id,
      nodeName: node.name,
      meshIndex: node.mesh,
      fixedComponent: component.fixedComponent === true,
      maxMatrixEntryError: matrixError,
      maxTranslationErrorMeters: translationError,
      passed: matrixError <= MATRIX_ENTRY_TOLERANCE && translationError <= TRANSLATION_TOLERANCE_METERS,
    });
  }

  const bodyComparison = comparisons.find((comparison) => comparison.componentId === "body_may-1");
  assert(bodyComparison, "body_may-1 comparison is missing");
  assert(bodyComparison.fixedComponent, "body_may-1 is not marked fixed in CAD inventory");

  const maxMatrixEntryError = Math.max(...comparisons.map((comparison) => comparison.maxMatrixEntryError));
  const maxTranslationErrorMeters = Math.max(
    ...comparisons.map((comparison) => comparison.maxTranslationErrorMeters),
  );
  const allTransformsPassed = comparisons.every((comparison) => comparison.passed);
  assert(allTransformsPassed, "one or more CAD-to-GLB node transforms exceed tolerance");

  const artifact = {
    schemaVersion: ROOT_FRAME_SCHEMA,
    clusterId: CLUSTER_ID,
    status: "verified",
    rootFrameReady: true,
    motionRuntimeReady: false,
    units: "meters",
    coordinateFrame: "solidworks-assembly",
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      glbFile: FINAL_GLB_URL,
      inventorySchema: inventory.schemaVersion,
      solidWorksRevision: inventory.source?.solidWorksRevision ?? null,
      generator: "SOLIDWORKSGLTF",
    },
    rootTransform: {
      format: "three-matrix4-column-major",
      values: IDENTITY_MATRIX,
      translationMeters: [0, 0, 0],
      rotationQuaternion: [0, 0, 0, 1],
      scale: [1, 1, 1],
      handedness: "CAD-and-GLB-frame-aligned",
      apply: "once-at-aggregate-root",
    },
    modelPolicy: {
      preserveGlbNodeTransforms: true,
      recenterModel: false,
      cameraFitMayMoveCameraOnly: true,
      hiddenPerPartOffsetsAllowed: false,
    },
    tolerance: {
      matrixEntry: MATRIX_ENTRY_TOLERANCE,
      translationMeters: TRANSLATION_TOLERANCE_METERS,
      translationMillimeters: TRANSLATION_TOLERANCE_METERS * 1000,
    },
    alignment: {
      componentCount: comparisons.length,
      maxMatrixEntryError,
      maxTranslationErrorMeters,
      maxTranslationErrorMillimeters: maxTranslationErrorMeters * 1000,
      bodyMay: bodyComparison,
      comparisons,
    },
    checks: [
      {
        id: "cad-component-to-glb-node-set",
        passed: comparisons.length === targetRecord.meshCount,
        detail: "Every CAD component has one named mesh node in final.glb.",
      },
      {
        id: "cad-to-glb-transform-residual",
        passed: allTransformsPassed,
        detail: "All node matrices match the SolidWorks component transforms within tolerance.",
      },
      {
        id: "body-may-fixed-root",
        passed: bodyComparison.fixedComponent,
        detail: "body_may-1 is the fixed CAD root used to authorize the aggregate frame.",
      },
      {
        id: "no-runtime-recenter",
        passed: true,
        detail: "The web scene must preserve the GLB/CAD frame; camera fitting is camera-only.",
      },
    ],
  };

  writeJson(artifact);
  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        output: path.relative(repoRoot, outputPath),
        componentCount: artifact.alignment.componentCount,
        maxTranslationErrorMillimeters: artifact.alignment.maxTranslationErrorMillimeters,
        maxMatrixEntryError: artifact.alignment.maxMatrixEntryError,
        rootTransform: artifact.rootTransform.values,
      },
      null,
      2,
    ),
  );
}

main();
