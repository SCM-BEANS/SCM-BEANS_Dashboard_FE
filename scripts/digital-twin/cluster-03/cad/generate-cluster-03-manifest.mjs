import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const inventoryPath = path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json");
const clusterRoot = path.join(repoRoot, "public", "models", "digital-twin", "cluster-03");
const targetGlbPath = path.join(clusterRoot, "final.glb");
const outputDir = path.join(clusterRoot, "connections");
const rootFramePath = path.join(outputDir, "root-frame.json");

const CLUSTER_ID = "cluster-03";
const CONTRACT_VERSION = "cluster-03-connections.v1";
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const ROOT_FRAME_URL = `${CONNECTIONS_URL}/root-frame.json`;

function fail(message) {
  throw new Error(`[cluster-03 manifest] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing input: ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(fileName, value) {
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function basename(filePath) {
  return path.basename(String(filePath).replaceAll("\\", "/"));
}

function normalizePath(filePath) {
  return String(filePath).replaceAll("\\", "/").toLowerCase();
}

function isTargetFinalGlb(record) {
  const normalized = normalizePath(record?.path);
  return normalized.endsWith("/public/models/digital-twin/cluster-03/final.glb");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSourceEvidence(component, inventory) {
  return {
    assemblyFile: "Final.SLDASM",
    componentId: component.id,
    sourceFile: basename(component.sourceFile),
    inventorySchema: inventory.schemaVersion,
    solidWorksRevision: inventory.source?.solidWorksRevision ?? null,
  };
}

function createPartRecord(component, inventory, nodeIndex) {
  const isRoot = component.id === "body_may-1";
  return {
    id: component.id,
    sourceFile: basename(component.sourceFile),
    gltfNode: component.gltfNodeCandidate,
    render: {
      asset: FINAL_GLB_URL,
      mode: "aggregate-node",
      meshIndex: nodeIndex,
      duplicateMeshPolicy: "final-glb-owns-mesh",
    },
    coordinateFrame: "solidworks-assembly",
    initialTransform: {
      format: "solidworks-transform-array",
      units: "meters",
      values: clone(component.transformArrayData),
    },
    parent: isRoot
      ? {
          id: null,
          status: "assembly-root",
          reason: "body_may-1 is the fixed assembly anchor recorded by SolidWorks.",
        }
      : {
          id: null,
          status: "pending-cad-mate-normalization",
          reason: "Parent/child ownership is not inferred from filenames; it will be resolved from mate entities in a later phase.",
        },
    pivot: isRoot
      ? {
          status: "root-frame",
          point: null,
          axis: null,
          sourceFeature: null,
          reason: "The fixed assembly anchor has no moving pivot.",
        }
      : {
          status: "pending-cad-reference-extraction",
          point: null,
          axis: null,
          sourceFeature: null,
          reason: "A motion pivot must be tied to a SolidWorks reference entity before runtime use.",
        },
    connectionStatus: isRoot ? "root-anchor" : "pending-mate-entity-normalization",
    sourceEvidence: createSourceEvidence(component, inventory),
  };
}

function createSketchArtifacts(inventory, componentBySourceFile) {
  const sketches = [];

  for (const part of inventory.parts ?? []) {
    const sourceFile = basename(part.sourceFile);
    const component = componentBySourceFile.get(sourceFile);
    assert(component, `sketch source has no component mapping: ${sourceFile}`);

    for (const sketch of part.sketches ?? []) {
      sketches.push({
        id: `${component.id}:${sketch.featureName}`,
        partId: component.id,
        sourceFile,
        featureName: sketch.featureName,
        segmentCount: sketch.segmentCount,
        modelToSketchTransform: clone(sketch.modelToSketchTransform),
        sketchToModelTransform: clone(sketch.sketchToModelTransform),
        segments: clone(sketch.segments),
        sourceEvidence: {
          assemblyFile: "Final.SLDASM",
          partFile: sourceFile,
          featureName: sketch.featureName,
          inventorySchema: inventory.schemaVersion,
        },
      });
    }
  }

  return {
    schemaVersion: CONTRACT_VERSION,
    clusterId: CLUSTER_ID,
    coordinateFrame: "solidworks-assembly",
    units: "meters",
    status: "inventory-captured",
    sketches,
  };
}

function createConstraintArtifacts(inventory) {
  const mateFeatures = inventory.assembly?.mateFeatures ?? [];
  return {
    schemaVersion: CONTRACT_VERSION,
    clusterId: CLUSTER_ID,
    coordinateFrame: "solidworks-assembly",
    units: "meters",
    status: "inventory-only",
    runtimeReady: false,
    extraction: {
      source: "Final.SLDASM feature tree",
      mateFeatureCount: mateFeatures.length,
      nextRequiredEvidence: [
        "resolved parent component",
        "resolved child component",
        "reference entities for both sides",
        "pivot or axis in assembly coordinates",
      ],
    },
    constraints: mateFeatures.map((mate, index) => ({
      id: `cad-mate-${String(index + 1).padStart(3, "0")}`,
      name: mate.name,
      type: mate.type,
      parentId: null,
      childId: null,
      status: "pending-mate-entity-extraction",
      requiresEntityExtraction: true,
      sourceEvidence: {
        assemblyFile: "Final.SLDASM",
        featureName: mate.name,
        featureType: mate.type,
        inventorySchema: inventory.schemaVersion,
      },
    })),
  };
}

function createValidationArtifacts(inventory, targetGlb, parts, constraints) {
  const expectedIds = inventory.components.map((component) => component.id).sort();
  const actualIds = parts.map((part) => part.id).sort();
  const targetNodes = targetGlb.nodes.filter((node) => node.meshIndex !== null).map((node) => node.name).sort();
  const expectedNodes = inventory.components.map((component) => component.gltfNodeCandidate).sort();
  const rootFrame = fs.existsSync(rootFramePath) ? readJson(rootFramePath) : null;
  const allPending = parts.every(
    (part) => part.parent.status === "assembly-root" || part.parent.status === "pending-cad-mate-normalization",
  );

  const checks = [
    {
      id: "component-id-set",
      passed: JSON.stringify(expectedIds) === JSON.stringify(actualIds),
      detail: "Every SolidWorks component has one manifest part record.",
    },
    {
      id: "final-glb-node-set",
      passed: JSON.stringify(expectedNodes) === JSON.stringify(targetNodes),
      detail: "The aggregate final.glb owns exactly the 18 mapped mesh nodes.",
    },
    {
      id: "single-render-owner",
      passed: parts.every((part) => part.render.asset === FINAL_GLB_URL),
      detail: "No separate oc_left/oc_right overlay is runtime-owned in this phase.",
    },
    {
      id: "cad-source-evidence",
      passed: parts.every((part) => part.sourceEvidence?.componentId && part.sourceEvidence?.sourceFile),
      detail: "Every part carries source evidence without exposing an absolute local path.",
    },
    {
      id: "pending-state-explicit",
      passed: allPending && constraints.every((constraint) => constraint.status === "pending-mate-entity-extraction"),
      detail: "Unresolved CAD relationships are explicit and cannot be consumed as runtime connections yet.",
    },
  ];

  if (rootFrame) {
    checks.push({
      id: "root-frame-alignment",
      passed: rootFrame.status === "verified" && rootFrame.rootFrameReady === true,
      detail: "CAD and GLB node transforms are aligned within the root-frame tolerance.",
    });
  }

  return {
    schemaVersion: CONTRACT_VERSION,
    clusterId: CLUSTER_ID,
    phase: "phase-1",
    status: "contract-ready",
    runtimeReady: false,
    checks,
    rootFrame: rootFrame
      ? {
          file: ROOT_FRAME_URL,
          status: rootFrame.status,
          maxTranslationErrorMillimeters: rootFrame.alignment?.maxTranslationErrorMillimeters ?? null,
          maxMatrixEntryError: rootFrame.alignment?.maxMatrixEntryError ?? null,
        }
      : {
          file: ROOT_FRAME_URL,
          status: "pending-phase-2",
        },
    runtimeBlockers: [
      "Parent/child relationships have not been normalized from SolidWorks mate entities.",
      "Moving pivots and reference axes have not been calibrated from SolidWorks geometry.",
    ],
  };
}

function validateArtifacts(artifacts, inventory, targetGlb) {
  const { manifest, sketches, constraints, validation } = artifacts;
  assert(manifest.schemaVersion === CONTRACT_VERSION, "manifest schema version mismatch");
  assert(manifest.clusterId === CLUSTER_ID, "manifest cluster id mismatch");
  assert(manifest.units === "meters", "manifest must declare meters");
  assert(manifest.coordinateFrame === "solidworks-assembly", "manifest frame mismatch");
  assert(manifest.runtimeReady === false, "phase 1 must not claim runtime readiness");
  assert(manifest.render.asset === FINAL_GLB_URL, "manifest render asset must be cluster-03 final.glb");
  assert(
    manifest.rollback?.trigger && manifest.rollback?.safeAsset === FINAL_GLB_URL && manifest.rollback?.action,
    "manifest is missing the cluster-03 asset rollback plan",
  );
  assert(manifest.rootFrameFile === ROOT_FRAME_URL, "manifest root-frame path mismatch");
  assert(Array.isArray(manifest.parts), "manifest parts must be an array");
  assert(manifest.loader?.contract && manifest.loader?.version, "manifest is missing the loader contract version");
  assert(fs.existsSync(targetGlbPath), "target cluster-03 final.glb is missing");

  const ids = new Set();
  const nodes = new Set(targetGlb.nodes.map((node) => node.name));
  for (const part of manifest.parts) {
    assert(part.id && !ids.has(part.id), `part id is missing or duplicated: ${part.id}`);
    ids.add(part.id);
    assert(part.sourceFile, `part ${part.id} is missing sourceFile`);
    assert(part.gltfNode && nodes.has(part.gltfNode), `part ${part.id} has no target GLB node`);
    assert(part.coordinateFrame, `part ${part.id} is missing coordinateFrame`);
    assert(part.initialTransform?.values?.length === 16, `part ${part.id} must have a 16-value transform`);
    assert(part.parent && part.parent.status && part.parent.reason, `part ${part.id} is missing parent evidence`);
    assert(part.pivot && part.pivot.status && part.pivot.reason, `part ${part.id} is missing pivot evidence`);
    assert(part.sourceEvidence?.componentId && part.sourceEvidence?.sourceFile, `part ${part.id} is missing source evidence`);
    assert(part.render?.asset === FINAL_GLB_URL, `part ${part.id} points outside cluster-03 final.glb`);
    if (part.parent.status.startsWith("pending-")) {
      assert(part.parent.id === null, `pending parent for ${part.id} must remain null`);
    }
    if (part.pivot.status.startsWith("pending-")) {
      assert(part.pivot.point === null && part.pivot.axis === null, `pending pivot for ${part.id} must remain unresolved`);
    }
  }

  assert(manifest.parts.length === inventory.components.length, "manifest part count differs from inventory");
  assert(new Set(manifest.parts.map((part) => part.render.meshIndex)).size === manifest.parts.length, "mesh indices must be unique");
  assert(sketches.clusterId === CLUSTER_ID, "sketch artifact cluster id mismatch");
  assert(sketches.schemaVersion === CONTRACT_VERSION, "sketch artifact schema version mismatch");
  assert(Array.isArray(sketches.sketches), "sketch artifact sketches must be an array");
  for (const sketch of sketches.sketches) {
    assert(sketch.id && sketch.partId && sketch.featureName, "sketch record is missing identity evidence");
    assert(sketch.sourceEvidence?.partFile && sketch.sourceEvidence?.featureName, `sketch ${sketch.id} is missing source evidence`);
  }
  assert(constraints.clusterId === CLUSTER_ID, "constraint artifact cluster id mismatch");
  assert(constraints.schemaVersion === CONTRACT_VERSION, "constraint artifact schema version mismatch");
  assert(Array.isArray(constraints.constraints), "constraint artifact constraints must be an array");
  for (const constraint of constraints.constraints) {
    assert(
      constraint.id && constraint.name && constraint.type && constraint.status,
      "constraint record is missing identity/status evidence",
    );
    assert(constraint.parentId === null && constraint.childId === null, `unresolved constraint ${constraint.id} must not guess endpoints`);
    assert(constraint.sourceEvidence?.assemblyFile && constraint.sourceEvidence?.featureName, `constraint ${constraint.id} is missing source evidence`);
  }
  assert(validation.clusterId === CLUSTER_ID, "validation artifact cluster id mismatch");
  assert(validation.schemaVersion === CONTRACT_VERSION, "validation artifact schema version mismatch");
  assert(Array.isArray(validation.checks) && validation.checks.every((check) => check.passed === true), "validation artifact has a failed check");
  if (fs.existsSync(rootFramePath)) {
    assert(validation.rootFrame?.file === ROOT_FRAME_URL && validation.rootFrame.status === "verified", "validation root-frame evidence is stale");
  }
  assert(constraints.runtimeReady === false, "constraint artifact must not be runtime-ready");
  assert(validation.runtimeReady === false, "validation artifact must not be runtime-ready");

  if (fs.existsSync(rootFramePath)) {
    const rootFrame = readJson(rootFramePath);
    assert(rootFrame.clusterId === CLUSTER_ID, "root-frame cluster id mismatch");
    assert(rootFrame.status === "verified" && rootFrame.rootFrameReady === true, "root-frame artifact is not verified");
    assert(rootFrame.rootTransform?.values?.length === 16, "root-frame transform must have 16 values");
    assert(manifest.rootFrameStatus === "verified", "manifest root-frame status is stale");
  }

  const serialized = JSON.stringify({ manifest, sketches, constraints, validation }).toLowerCase();
  assert(!serialized.includes("cluster-01") && !serialized.includes("cluster-02"), "cross-cluster reference detected");

  for (const file of [
    manifest.connectionFile,
    manifest.sketchFile,
    manifest.validationFile,
    ...(manifest.rollback?.generatedFiles ?? []),
    ...(manifest.loader?.requiredFiles ?? []),
  ]) {
    assert(file.startsWith(`${CONNECTIONS_URL}/`), `connection path escapes cluster-03: ${file}`);
  }
}

function readGeneratedArtifacts(inventory) {
  const manifest = readJson(path.join(outputDir, "cluster-03.manifest.json"));
  const sketches = readJson(path.join(outputDir, "sketches.json"));
  const constraints = readJson(path.join(outputDir, "constraints.json"));
  const validation = readJson(path.join(outputDir, "validation.json"));
  const targetGlb = inventory.glbFiles.find(isTargetFinalGlb);
  assert(targetGlb, "Phase 0 inventory has no target cluster-03 final.glb record");
  return { manifest, sketches, constraints, validation, targetGlb };
}

function buildArtifacts(inventory) {
  assert(inventory.schemaVersion === "cluster-03-cad-inventory.v1", "unexpected Phase 0 inventory schema");
  assert(Array.isArray(inventory.components) && inventory.components.length > 0, "inventory has no components");
  assert(fs.existsSync(targetGlbPath), "missing cluster-03 final.glb");

  const targetGlb = readJson(path.join(repoRoot, "plans", "cluster-03-phase-0-inventory.json")).glbFiles.find(isTargetFinalGlb);
  assert(targetGlb, "Phase 0 inventory has no target cluster-03 final.glb record");
  assert(targetGlb.meshCount === 18, "target final.glb mesh count must be 18");
  const targetMeshNodes = targetGlb.nodes?.filter((node) => node.meshIndex !== null) ?? [];
  assert(targetMeshNodes.length === inventory.components.length, "target final.glb mesh-node count mismatch");

  const componentBySourceFile = new Map(inventory.components.map((component) => [basename(component.sourceFile), component]));
  const nodeIndexByName = new Map(targetMeshNodes.map((node) => [node.name, node.meshIndex]));
  const parts = inventory.components.map((component) => {
    const nodeIndex = nodeIndexByName.get(component.gltfNodeCandidate);
    assert(nodeIndex !== undefined, `component has no target node: ${component.id}`);
    return createPartRecord(component, inventory, nodeIndex);
  });
  const sketches = createSketchArtifacts(inventory, componentBySourceFile);
  const constraints = createConstraintArtifacts(inventory);
  const validation = createValidationArtifacts(inventory, targetGlb, parts, constraints.constraints);
  const manifest = {
    schemaVersion: CONTRACT_VERSION,
    clusterId: CLUSTER_ID,
    status: "phase-1-contract-ready",
    runtimeReady: false,
    units: "meters",
    coordinateFrame: "solidworks-assembly",
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      solidWorksRevision: inventory.source?.solidWorksRevision ?? null,
      componentCount: inventory.components.length,
    },
    loader: {
      contract: "cluster-03-connection-loader",
      version: "1.0.0",
      entry: "deferred-to-phase-9",
      requiredFiles: [
        `${CONNECTIONS_URL}/cluster-03.manifest.json`,
        `${CONNECTIONS_URL}/constraints.json`,
        `${CONNECTIONS_URL}/sketches.json`,
        `${CONNECTIONS_URL}/validation.json`,
        ROOT_FRAME_URL,
      ],
    },
    artifactMatrix: [
      {
        kind: "cad-source",
        file: "Final.SLDASM",
        runtimeServed: false,
        status: "read-only-evidence",
      },
      {
        kind: "aggregate-glb",
        file: FINAL_GLB_URL,
        runtimeServed: true,
        owner: "cluster-03",
        status: "active-render-owner",
      },
      {
        kind: "derived-json",
        file: `${CONNECTIONS_URL}/cluster-03.manifest.json`,
        runtimeServed: true,
        status: "phase-1-contract",
      },
      {
        kind: "derived-json",
        file: `${CONNECTIONS_URL}/sketches.json`,
        runtimeServed: true,
        status: "phase-1-contract",
      },
      {
        kind: "derived-json",
        file: `${CONNECTIONS_URL}/constraints.json`,
        runtimeServed: true,
        status: "inventory-only",
      },
      {
        kind: "derived-json",
        file: `${CONNECTIONS_URL}/validation.json`,
        runtimeServed: true,
        status: "phase-1-contract",
      },
      {
        kind: "derived-json",
        file: ROOT_FRAME_URL,
        runtimeServed: true,
        status: fs.existsSync(rootFramePath) ? "phase-2-verified" : "pending-phase-2",
      },
      {
        kind: "detail-glb",
        file: "/models/digital-twin/cluster-03/oc_left.glb",
        runtimeServed: false,
        owner: "deferred-until-overlay-ownership-is-proven",
        status: "not-loaded-by-default",
      },
    ],
    render: {
      asset: FINAL_GLB_URL,
      meshOwnership: "aggregate-final-glb",
      duplicateMeshPolicy: "never-load-a-separate-part-overlay-when-the-node-is-already-in-final-glb",
    },
    rollback: {
      trigger: "manifest-or-asset-load-failure",
      action: "disable-cluster-03-motion-and-report-the-error-while-retaining-the-aggregate-model",
      safeAsset: FINAL_GLB_URL,
      generatedFiles: [
        `${CONNECTIONS_URL}/cluster-03.manifest.json`,
        `${CONNECTIONS_URL}/sketches.json`,
        `${CONNECTIONS_URL}/constraints.json`,
        `${CONNECTIONS_URL}/validation.json`,
      ],
    },
    parts,
    connectionFile: `${CONNECTIONS_URL}/constraints.json`,
    sketchFile: `${CONNECTIONS_URL}/sketches.json`,
    validationFile: `${CONNECTIONS_URL}/validation.json`,
    rootFrameFile: ROOT_FRAME_URL,
    rootFrameStatus: fs.existsSync(rootFramePath) ? "verified" : "pending-phase-2",
  };

  return { manifest, sketches, constraints, validation, targetGlb };
}

function main() {
  const inventory = readJson(inventoryPath);

  if (process.argv.includes("--check")) {
    const artifacts = readGeneratedArtifacts(inventory);
    validateArtifacts(artifacts, inventory, artifacts.targetGlb);
    console.log(JSON.stringify({ status: "verified", phase: "phase-1", mode: "check", runtimeReady: false }, null, 2));
    return;
  }

  const artifacts = buildArtifacts(inventory);
  validateArtifacts(artifacts, inventory, artifacts.targetGlb);

  fs.mkdirSync(outputDir, { recursive: true });
  writeJson("cluster-03.manifest.json", artifacts.manifest);
  writeJson("sketches.json", artifacts.sketches);
  writeJson("constraints.json", artifacts.constraints);
  writeJson("validation.json", artifacts.validation);

  console.log(
    JSON.stringify(
      {
        status: "verified",
        phase: "phase-1",
        outputDir: path.relative(repoRoot, outputDir),
        parts: artifacts.manifest.parts.length,
        sketches: artifacts.sketches.sketches.length,
        constraints: artifacts.constraints.constraints.length,
        runtimeReady: false,
      },
      null,
      2,
    ),
  );
}

main();
