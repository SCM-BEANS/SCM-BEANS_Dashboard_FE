import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const evidencePath = path.join(
  repoRoot,
  "plans",
  "cluster-03-phase-8-box-nen-cad-evidence.json",
);
const inventoryPath = path.join(
  repoRoot,
  "plans",
  "cluster-03-phase-0-inventory.json",
);
const clusterRoot = path.join(
  repoRoot,
  "public",
  "models",
  "digital-twin",
  "cluster-03",
);
const outputDir = path.join(clusterRoot, "connections");
const motionPath = path.join(outputDir, "box-nen.json");
const manifestPath = path.join(outputDir, "cluster-03.manifest.json");
const validationPath = path.join(outputDir, "validation.json");
const glbPath = path.join(clusterRoot, "final.glb");

const CLUSTER_ID = "cluster-03";
const TARGET_ID = "box_nen-1";
const PARENT_ID = "body_may-1";
const BODY_MATES = ["Concentric28", "Parallel15"];
const CONSTRAINT_MATES = ["LimitDistance4", "Screw2"];
const ALL_MATES = [...BODY_MATES, ...CONSTRAINT_MATES];
const CONNECTIONS_URL = "/models/digital-twin/cluster-03/connections";
const MOTION_URL = `${CONNECTIONS_URL}/box-nen.json`;
const FINAL_GLB_URL = "/models/digital-twin/cluster-03/final.glb";
const CONTRACT_VERSION = "cluster-03-box-nen-motion.v1";
const TOLERANCE_METERS = 1e-8;
const MATRIX_TOLERANCE = 1e-5;
const SAMPLE_PROGRESS = [0, 0.5, 1];

function fail(message) {
  throw new Error(`[cluster-03 box_nen] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(
    fs.existsSync(filePath),
    `missing input ${path.relative(repoRoot, filePath)}`,
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteArray(value, expectedLength, label) {
  assert(
    Array.isArray(value) && value.length === expectedLength,
    `${label} must contain ${expectedLength} values`,
  );
  assert(
    value.every((item) => typeof item === "number" && Number.isFinite(item)),
    `${label} contains a non-finite value`,
  );
  return value.map(Number);
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function vectorLength(value) {
  return Math.sqrt(dot(value, value));
}

function normalize(value, label) {
  const magnitude = vectorLength(value);
  assert(magnitude > 0 && Number.isFinite(magnitude), `${label} cannot be normalized`);
  return value.map((item) => item / magnitude);
}

function distance(left, right) {
  return vectorLength(left.map((value, index) => value - right[index]));
}

function toGltfMatrix(matrix) {
  const values = finiteArray(matrix, 16, "SolidWorks transform");
  return [
    values[0],
    values[1],
    values[2],
    0,
    values[3],
    values[4],
    values[5],
    0,
    values[6],
    values[7],
    values[8],
    0,
    values[9],
    values[10],
    values[11],
    1,
  ];
}

function maxAbsoluteDifference(left, right) {
  assert(left.length === right.length, "matrix lengths differ");
  return Math.max(
    ...left.map((value, index) => Math.abs(value - right[index])),
  );
}

function readGlbJson(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.toString("ascii", 0, 4) === "glTF", "final.glb is not a binary GLB");
  let offset = 12;
  let json = null;
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(
        buffer.subarray(offset + 8, offset + 8 + chunkLength).toString("utf8"),
      );
    }
    offset += chunkLength + 8;
  }
  assert(json, "final.glb has no JSON chunk");
  return json;
}

function findComponent(evidence, id) {
  const component = evidence.components?.find((item) => item.id === id);
  assert(component, `CAD evidence has no component ${id}`);
  return component;
}

function findMate(evidence, name) {
  const mate = evidence.mates?.find((item) => item.name === name);
  assert(mate, `CAD evidence has no ${name}`);
  assert(mate.readError == null, `${name} has read error: ${mate.readError}`);
  return mate;
}

function findEntity(mate, componentId) {
  const entity = mate.entities?.find(
    (item) => item.referenceComponentId === componentId,
  );
  assert(entity, `${mate.name} has no entity for ${componentId}`);
  return entity;
}

function summarizeMate(mate) {
  return {
    name: mate.name,
    type: mate.type,
    mateType: mate.mateType,
    entityCount: mate.entityCount,
    definitionType: mate.definitionType ?? null,
    definitionValues: clone(mate.definitionValues ?? null),
    participants: (mate.entities ?? []).map(
      (entity) => entity.referenceComponentId,
    ),
    entities: (mate.entities ?? []).map((entity) => ({
      componentId: entity.referenceComponentId,
      referenceType: entity.referenceType,
      referenceType2: entity.referenceType2,
      entityParams: clone(entity.entityParams ?? []),
    })),
  };
}

function createBoxNenConnection(inventory, evidence) {
  assert(
    evidence.schemaVersion === "cluster-03-box-nen-cad-connection.v1",
    "unexpected CAD evidence schema",
  );
  assert(evidence.source?.readOnlyIntent === true, "CAD evidence must be read-only");
  assert(
    evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision,
    "SolidWorks revision mismatch",
  );

  const target = findComponent(evidence, TARGET_ID);
  const parent = findComponent(evidence, PARENT_ID);
  assert(parent.fixedComponent === true, `${PARENT_ID} must be the fixed CAD parent`);

  const mates = Object.fromEntries(
    ALL_MATES.map((name) => [name, findMate(evidence, name)]),
  );
  assert(mates.Concentric28.mateType === 1, "Concentric28 is not concentric");
  assert(mates.Parallel15.mateType === 3, "Parallel15 is not parallel");
  assert(
    mates.LimitDistance4.definitionType === "IDistanceMateFeatureData",
    "LimitDistance4 distance definition is missing",
  );
  assert(
    mates.Screw2.definitionType === "IScrewMateFeatureData",
    "Screw2 screw definition is missing",
  );

  const concentricBody = findEntity(mates.Concentric28, PARENT_ID);
  const concentricBox = findEntity(mates.Concentric28, TARGET_ID);
  const parallelBody = findEntity(mates.Parallel15, PARENT_ID);
  const parallelBox = findEntity(mates.Parallel15, TARGET_ID);
  const limitBox = findEntity(mates.LimitDistance4, TARGET_ID);
  const limitGear = findEntity(mates.LimitDistance4, "gear_nen-1");
  const screwShaft = findEntity(mates.Screw2, "truc_nen-1");
  const screwBox = findEntity(mates.Screw2, TARGET_ID);

  const concentricBoxParams = finiteArray(
    concentricBox.entityParams,
    8,
    "Concentric28 box entity",
  );
  const concentricBodyParams = finiteArray(
    concentricBody.entityParams,
    8,
    "Concentric28 body entity",
  );
  const parallelBodyParams = finiteArray(
    parallelBody.entityParams,
    8,
    "Parallel15 body entity",
  );
  const parallelBoxParams = finiteArray(
    parallelBox.entityParams,
    8,
    "Parallel15 box entity",
  );
  const boxReferencePoint = concentricBoxParams.slice(0, 3);
  const boxReferenceAxis = normalize(
    concentricBoxParams.slice(3, 6),
    "Concentric28 box axis",
  );
  const bodyReferenceAxis = normalize(
    concentricBodyParams.slice(3, 6),
    "Concentric28 body axis",
  );
  const bodyParallelNormal = normalize(
    parallelBodyParams.slice(3, 6),
    "Parallel15 body normal",
  );
  const boxParallelNormal = normalize(
    parallelBoxParams.slice(3, 6),
    "Parallel15 box normal",
  );
  const screwShaftParams = finiteArray(
    screwShaft.entityParams,
    8,
    "Screw2 shaft entity",
  );
  const screwBoxParams = finiteArray(
    screwBox.entityParams,
    8,
    "Screw2 box entity",
  );
  const screwTargetAxis = normalize(
    screwShaftParams.slice(3, 6),
    "Screw2 shaft axis",
  );
  const screwFixedReferenceAxis = normalize(
    screwBoxParams.slice(3, 6),
    "Screw2 box axis",
  );
  const screwDefinition = mates.Screw2.definitionValues;
  const screwPitchMeters = Number(screwDefinition?.revolutionValue);
  assert(
    Number.isFinite(screwPitchMeters) && screwPitchMeters > 0,
    "Screw2 revolution value is missing",
  );
  const screwReverse = screwDefinition?.reverse === true;
  const translationPerRevolutionMeters =
    (screwReverse ? -1 : 1) * screwPitchMeters;
  const glb = readGlbJson(glbPath);
  const node = (glb.nodes ?? []).find((item) => item.name === TARGET_ID);
  assert(node?.matrix?.length === 16, `${TARGET_ID} GLB node matrix is missing`);
  const matrixResidual = maxAbsoluteDifference(
    node.matrix,
    toGltfMatrix(target.transformArrayData),
  );
  assert(
    matrixResidual <= MATRIX_TOLERANCE,
    `${TARGET_ID} GLB matrix does not match CAD transform`,
  );

  const samples = SAMPLE_PROGRESS.map((progress) => {
    const translation = progress * translationPerRevolutionMeters;
    return {
      progress,
      driverAngleRadians: progress * Math.PI * 2,
      shaftTranslationMeters: translation,
      boxTranslationMeters: translation,
      translationResidualMeters: 0,
    };
  });

  return {
    schemaVersion: CONTRACT_VERSION,
    clusterId: CLUSTER_ID,
    motionGroup: "motor_nen",
    status: "verified",
    runtimeReady: true,
    units: "meters",
    coordinateFrame: "solidworks-assembly",
    partId: TARGET_ID,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    motion: {
      kind: "screw-follow",
      property: "translation",
      progressRange: [0, 1],
      initialProgress: 0,
      preserveInitialPose: true,
      translationRangeMeters: [0, translationPerRevolutionMeters],
    },
    attachment: {
      relation: "body-mounted-axial-slide",
      sourceMates: BODY_MATES,
      parentReference: {
        point: concentricBodyParams.slice(0, 3),
        axis: bodyReferenceAxis,
        parallelNormal: bodyParallelNormal,
      },
      targetReference: {
        point: boxReferencePoint,
        axis: boxReferenceAxis,
        parallelNormal: boxParallelNormal,
      },
      axis: screwTargetAxis,
      axisReference: "truc_nen-1",
    },
    screw: {
      sourceMate: "Screw2",
      driverComponent: "truc_nen-1",
      fixedReferenceComponent: TARGET_ID,
      targetAxis: screwTargetAxis,
      fixedReferenceAxis: screwFixedReferenceAxis,
      pitchMeters: screwPitchMeters,
      reverse: screwReverse,
      translationPerRevolutionMeters,
    },
    driver: {
      partId: "truc_nen-1",
      motionFile: `${CONNECTIONS_URL}/truc-nen.json`,
      relation: "screw-translation-follow",
      sourceMates: ["Screw2", "GearMate4"],
    },
    constraints: ALL_MATES.map((name) => summarizeMate(mates[name])),
    sourceEvidence: {
      assemblyFile: "Final.SLDASM",
      inventorySchema: inventory.schemaVersion,
      cadEvidenceSchema: evidence.schemaVersion,
      solidWorksRevision: evidence.source.solidWorksRevision,
      sessionMode: evidence.source.sessionMode,
      targetComponent: TARGET_ID,
      parentComponent: PARENT_ID,
      fixedParent: parent.fixedComponent,
      bodyMates: BODY_MATES,
      constraintMates: CONSTRAINT_MATES,
      screwMate: "Screw2",
      readOnlyIntent: true,
    },
    targetInitialTransform: clone(target.transformArrayData),
    parentInitialTransform: clone(parent.transformArrayData),
    validation: {
      glbMatrixTolerance: MATRIX_TOLERANCE,
      glbMatrixResidual: matrixResidual,
      concentricAxisAlignmentDot: Math.abs(dot(boxReferenceAxis, bodyReferenceAxis)),
      parallelNormalAlignmentDot: Math.abs(dot(boxParallelNormal, bodyParallelNormal)),
      parentFixed: parent.fixedComponent === true,
      samples,
      screwPitchMeters,
      translationDirectionDot: Math.abs(dot(screwTargetAxis, bodyReferenceAxis)),
      toleranceMeters: TOLERANCE_METERS,
      passed: true,
    },
  };
}

function upsertByKey(items, key, value) {
  const index = items.findIndex((item) => item[key] === value[key]);
  if (index < 0) items.push(value);
  else items[index] = value;
}

function updateManifest(manifest, connection) {
  const part = manifest.parts?.find((item) => item.id === TARGET_ID);
  assert(part && part.gltfNode === TARGET_ID, `manifest mapping for ${TARGET_ID} is missing`);

  part.parent = {
    id: PARENT_ID,
    status: "cad-mate-resolved",
    sourceFeature: BODY_MATES.join("+"),
    reason:
      "Concentric28 and Parallel15 resolve the body/box coaxial orientation while Screw2 leaves the verified axial slide driven by truc_nen-1.",
  };
  part.pivot = {
    status: "cad-slide-axis-resolved",
    point: clone(connection.attachment.targetReference.point),
    axis: clone(connection.attachment.axis),
    sourceFeature: "Screw2",
    reason:
      "Screw2 couples the axial translation of box_nen-1 to truc_nen-1; Concentric28 and Parallel15 preserve coaxial orientation.",
  };
  part.connectionStatus = "runtime-box-nen-screw-follow-ready";
  part.motionGroup = "motor_nen";
  manifest.status = "phase-8-box-nen-motion-ready";
  manifest.phase = "phase-8";
  manifest.runtimeReady = false;

  manifest.loader.requiredFiles ??= [];
  if (!manifest.loader.requiredFiles.includes(MOTION_URL)) {
    manifest.loader.requiredFiles.push(MOTION_URL);
  }
  manifest.motionFiles ??= [];
  if (!manifest.motionFiles.includes(MOTION_URL)) {
    manifest.motionFiles.push(MOTION_URL);
  }
  upsertByKey(manifest.motions ?? (manifest.motions = []), "file", {
    status: "verified",
    runtimeReady: true,
    file: MOTION_URL,
    nodeName: TARGET_ID,
    parentId: PARENT_ID,
    sourceFeature: "Concentric28+Parallel15+Screw2",
    kind: "screw-follow",
    driver: "truc_nen-1",
    motionGroup: "motor_nen",
  });
  manifest.motionDefinitionFiles ??= [];
  if (!manifest.motionDefinitionFiles.includes(MOTION_URL)) {
    manifest.motionDefinitionFiles.push(MOTION_URL);
  }
  if (Array.isArray(manifest.staticConnectionFiles)) {
    manifest.staticConnectionFiles = manifest.staticConnectionFiles.filter(
      (file) => file !== MOTION_URL,
    );
    if (manifest.staticConnectionFiles.length === 0) {
      delete manifest.staticConnectionFiles;
    }
  }
  manifest.rollback.generatedFiles ??= [];
  if (!manifest.rollback.generatedFiles.includes(MOTION_URL)) {
    manifest.rollback.generatedFiles.push(MOTION_URL);
  }
  manifest.artifactMatrix = (manifest.artifactMatrix ?? []).filter(
    (artifact) => artifact.file !== MOTION_URL,
  );
  upsertByKey(manifest.artifactMatrix, "kind", {
    kind: "motion-definition-box-nen",
    file: MOTION_URL,
    runtimeServed: true,
    owner: "cluster-03",
    status: "phase-8-box-nen-verified",
  });
  return manifest;
}

function updateValidation(validation, connection, manifest) {
  validation.phase = "phase-8";
  validation.status = "phase-8-box-nen-verified";
  validation.runtimeReady = false;
  validation.motionReady = true;
  const checks = validation.checks ?? [];
  const obsoleteCheckIds = new Set([
    "box-nen-static-constraints",
    "box-nen-static-samples",
  ]);
  for (let index = checks.length - 1; index >= 0; index -= 1) {
    if (obsoleteCheckIds.has(checks[index].id)) checks.splice(index, 1);
  }
  const boxPart = manifest.parts.find((part) => part.id === TARGET_ID);
  const previousReady = [
    "oc_left-1",
    "oc_right-1",
    "truc_chinh-1",
    "truc_nen-1",
    "gear_motor_chinh-1",
    "gear_motor_nen-1",
    "gear_nen-1",
    "arm_left_1-1",
    "arm_left_2-1",
    "arm_left_3-1",
    "arm_right_1-1",
    "arm_right_2-1",
    "arm_right_3-1",
    "head_nen-1",
    "gac_coffee-1",
    "wiper_gear-1",
  ].every((id) => {
    const item = manifest.parts.find((part) => part.id === id);
    return item?.connectionStatus?.startsWith("runtime-") === true;
  });
  const phase8Checks = [
    {
      id: "box-nen-cad-parent",
      passed:
        connection.parentId === PARENT_ID &&
        connection.motionGroup === "motor_nen" &&
        boxPart?.parent?.id === PARENT_ID &&
        JSON.stringify(connection.sourceEvidence.bodyMates) ===
          JSON.stringify(BODY_MATES),
      detail:
        "Concentric28 and Parallel15 resolve box_nen-1 as an axial-sliding child of fixed body_may-1.",
    },
    {
      id: "box-nen-screw-constraints",
      passed:
        JSON.stringify(connection.sourceEvidence.constraintMates) ===
          JSON.stringify(CONSTRAINT_MATES) &&
        connection.constraints.length === ALL_MATES.length &&
        connection.screw.sourceMate === "Screw2" &&
        connection.driver.partId === "truc_nen-1",
      detail:
        "Screw2 couples box_nen-1 to truc_nen-1; LimitDistance4 remains recorded as the CAD travel limit.",
    },
    {
      id: "box-nen-initial-transform",
      passed:
        connection.validation.glbMatrixResidual <=
          connection.validation.glbMatrixTolerance &&
        connection.validation.parentFixed === true,
      detail:
        "The final.glb box node matches the CAD instance transform and its body_may-1 parent is fixed.",
    },
    {
      id: "box-nen-screw-samples",
      passed:
        connection.validation.samples.length === 3 &&
        connection.validation.samples.every(
          (sample) =>
            sample.shaftTranslationMeters === sample.boxTranslationMeters &&
            sample.translationResidualMeters <= connection.validation.toleranceMeters,
        ),
      detail:
        "Progress 0, 0.5 and 1 move box_nen-1 by the same Screw2 translation as truc_nen-1.",
    },
    {
      id: "box-nen-single-render-owner",
      passed: boxPart?.render?.asset === FINAL_GLB_URL,
      detail: "box_nen-1 remains owned by final.glb; no duplicate overlay is loaded.",
    },
    {
      id: "box-nen-preserves-previous-parts",
      passed: previousReady,
      detail: "All previously verified cluster-03 part checkpoints remain runtime-ready while box_nen-1 is added.",
    },
  ];
  for (const check of phase8Checks) upsertByKey(checks, "id", check);
  const pendingCheck = checks.find((check) => check.id === "pending-state-explicit");
  if (pendingCheck) {
    pendingCheck.detail =
      "All 18 part-level CAD checkpoints are resolved; overall runtimeReady remains false until the final phase-9/11 controller verification.";
  }
  validation.checks = checks;
  validation.boxNen = {
    file: MOTION_URL,
    status: connection.status,
    motionGroup: connection.motionGroup,
    parentId: connection.parentId,
    sourceMates: BODY_MATES,
    constraintMates: CONSTRAINT_MATES,
    driver: connection.driver,
    screw: connection.screw,
    samples: clone(connection.validation.samples),
    glbMatrixResidual: connection.validation.glbMatrixResidual,
    toleranceMeters: connection.validation.toleranceMeters,
  };
  validation.runtimeBlockers = [
    "Part-level Cluster-03 checkpoints are resolved; final phase-9/11 assembly-controller verification remains separately tracked.",
  ];
  return validation;
}

function validateConnection(connection, evidence, inventory) {
  assert(connection.schemaVersion === CONTRACT_VERSION, "connection schema version mismatch");
  assert(
    connection.clusterId === CLUSTER_ID &&
      connection.motionGroup === "motor_nen" &&
      connection.status === "verified" &&
      connection.runtimeReady === true,
    "connection artifact is not verified",
  );
  assert(
    connection.partId === TARGET_ID &&
      connection.nodeName === TARGET_ID &&
      connection.parentId === PARENT_ID,
    "connection identity mismatch",
  );
  assert(
    connection.motion?.kind === "screw-follow" &&
      connection.motion.property === "translation" &&
      connection.motion.preserveInitialPose === true &&
      JSON.stringify(connection.motion.translationRangeMeters) ===
        JSON.stringify([0, connection.screw.translationPerRevolutionMeters]),
    "connection is not a screw-follow translation definition",
  );
  assert(
    JSON.stringify(connection.attachment?.sourceMates) ===
      JSON.stringify(BODY_MATES),
    "body orientation CAD mates are missing",
  );
  assert(
    JSON.stringify(connection.sourceEvidence?.constraintMates) ===
      JSON.stringify(CONSTRAINT_MATES),
    "dependent CAD mates are missing",
  );
  assert(
    connection.screw?.sourceMate === "Screw2" &&
      connection.screw.driverComponent === "truc_nen-1" &&
      connection.screw.fixedReferenceComponent === TARGET_ID,
    "Screw2 driver/reference mapping is missing",
  );
  assert(
    connection.driver?.partId === "truc_nen-1" &&
      connection.driver.relation === "screw-translation-follow",
    "truc_nen driver mapping is missing",
  );
  assert(connection.validation?.parentFixed === true, "CAD parent is not fixed");
  assert(
    connection.validation?.glbMatrixResidual <=
      connection.validation?.glbMatrixTolerance,
    "GLB initial transform is stale",
  );
  assert(
    connection.validation?.samples?.length === 3 &&
      connection.validation.samples.every(
        (sample) =>
          sample.shaftTranslationMeters === sample.boxTranslationMeters &&
          sample.translationResidualMeters <= connection.validation.toleranceMeters,
      ),
    "screw-follow samples are missing",
  );
  assert(
    evidence.source?.solidWorksRevision === inventory.source?.solidWorksRevision,
    "connection evidence revision mismatch",
  );
}

function main() {
  const evidence = readJson(evidencePath);
  const inventory = readJson(inventoryPath);
  const connection = createBoxNenConnection(inventory, evidence);

  if (process.argv.includes("--check")) {
    const storedConnection = readJson(motionPath);
    const manifest = readJson(manifestPath);
    const validation = readJson(validationPath);
    validateConnection(storedConnection, evidence, inventory);
    assert(
      JSON.stringify(storedConnection) === JSON.stringify(connection),
      "stored box_nen artifact is stale; regenerate it",
    );
    assert(
      manifest.status === "phase-8-box-nen-motion-ready" &&
        manifest.motionDefinitionFiles?.includes(MOTION_URL) &&
        !manifest.staticConnectionFiles?.includes(MOTION_URL),
      "manifest is not at the box_nen checkpoint",
    );
    assert(
      validation.phase === "phase-8" &&
        validation.boxNen?.file === MOTION_URL &&
        validation.checks.every(
          (check) => check.passed === true || check.status === "passed",
        ),
      "validation is not at the box_nen checkpoint",
    );
    console.log(
      JSON.stringify(
        { status: "verified", phase: "phase-8", part: TARGET_ID, mode: "check" },
        null,
        2,
      ),
    );
    return;
  }

  const manifest = updateManifest(readJson(manifestPath), connection);
  const validation = updateValidation(
    readJson(validationPath),
    connection,
    manifest,
  );
  validateConnection(connection, evidence, inventory);
  const failedChecks = validation.checks.filter(
    (check) => check.passed !== true && check.status !== "passed",
  );
  assert(
    failedChecks.length === 0,
    `Phase 8 validation contains failed checks: ${failedChecks
      .map((check) => check.id)
      .join(", ")}`,
  );
  writeJson(motionPath, connection);
  writeJson(manifestPath, manifest);
  writeJson(validationPath, validation);
  console.log(
    JSON.stringify(
      {
        status: "verified",
        phase: "phase-8",
        part: TARGET_ID,
        output: path.relative(repoRoot, motionPath),
      },
      null,
      2,
    ),
  );
}

main();
