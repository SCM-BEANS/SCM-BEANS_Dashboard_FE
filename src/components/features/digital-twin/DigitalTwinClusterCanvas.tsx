"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const DRACO_DECODER_PATH = "/draco-gltf/";
// The exported CAD constraints carry a sub-0.05 mm endpoint mismatch around
// the arm transition. Keeping this tolerance local to the kinematic solver
// avoids dropping a valid-looking pose back to the unconstrained fallback.
const CLUSTER_KINEMATIC_ENDPOINT_TOLERANCE_METERS = 5e-5;
const CLUSTER_MAX_AUTO_MOTOR_STEP_RADIANS = 0.01;

export interface DigitalTwinClusterCanvasProps {
  modelUrls: readonly string[];
  attachedModelDefinitions?: readonly ClusterAttachmentDefinition[];
  rootFrameUrl?: string;
  motionDefinitionUrl?: string;
  motionDefinitionUrls?: readonly string[];
  isolateNodeName?: string;
  motionNodeName?: string;
  onLoadStart: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
  canvasLabel: string;
  cameraResetVersion: number;
  zoomLevel: number;
  mainDriveProgress: number;
  lowerDriveProgress: number;
  ocLeftCamVisible: boolean;
  mainAutoMotion: boolean;
  lowerAutoMotion: boolean;
}

export interface ClusterAttachmentDefinition {
  modelUrl: string;
  sourceNodeName: string;
  parentNodeName: string;
}

function disposeModel(root: THREE.Object3D) {
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (disposedMaterials.has(material)) continue;
      disposedMaterials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      }
      material.dispose();
    }
  });
}

export function prepareClusterPart(root: THREE.Group, isolateNodeName?: string) {
  const target = isolateNodeName
    ? root.getObjectByName(isolateNodeName)
    : root;
  if (!target) {
    throw new Error(`GLB node "${isolateNodeName}" was not found.`);
  }

  target.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(target);
  if (bounds.isEmpty()) {
    throw new Error(
      isolateNodeName
        ? `GLB node "${isolateNodeName}" has no visible geometry.`
        : "GLB scene has no visible geometry.",
    );
  }

  if (isolateNodeName) {
    const worldTransform = target.matrixWorld.clone();
    target.removeFromParent();
    target.matrix.copy(worldTransform);
    target.matrixAutoUpdate = false;
  }

  return target;
}

function findUniqueClusterSourceNode(
  root: THREE.Object3D,
  sourceNodeName: string,
) {
  const matches: THREE.Object3D[] = [];
  root.traverse((candidate) => {
    if (
      candidate.userData.name === sourceNodeName ||
      candidate.name === sourceNodeName
    ) {
      matches.push(candidate);
    }
  });

  if (matches.length === 0) {
    throw new Error(`GLB node "${sourceNodeName}" was not found.`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple GLB nodes found for ${sourceNodeName}.`);
  }
  return matches[0];
}

export function attachClusterModelToParent(
  model: THREE.Group,
  attachmentRoot: THREE.Group,
  definition: ClusterAttachmentDefinition,
) {
  const parent = model.getObjectByName(definition.parentNodeName);
  if (!parent) {
    throw new Error(
      `GLB attachment parent "${definition.parentNodeName}" was not found.`,
    );
  }

  const attachedNode = findUniqueClusterSourceNode(
    attachmentRoot,
    definition.sourceNodeName,
  );
  attachedNode.updateWorldMatrix(true, true);

  const parentBounds = new THREE.Box3().setFromObject(parent);
  const attachedBounds = new THREE.Box3().setFromObject(attachedNode);
  if (parentBounds.isEmpty() || attachedBounds.isEmpty()) {
    throw new Error(
      `GLB attachment bounds are empty for ${definition.sourceNodeName}.`,
    );
  }

  // The pipe is exported as a standalone part without the assembly placement.
  // Align its connector-side Z edge to the head and center it on X/Y once;
  // after that, parenting makes every verified head pose carry the pipe along.
  const parentCenter = parentBounds.getCenter(new THREE.Vector3());
  const attachedCenter = attachedBounds.getCenter(new THREE.Vector3());
  const placementOffset = new THREE.Vector3(
    parentCenter.x - attachedCenter.x,
    parentCenter.y - attachedCenter.y,
    parentBounds.min.z - attachedBounds.min.z,
  );
  const attachedWorldPosition = attachedNode.getWorldPosition(
    new THREE.Vector3(),
  );
  const attachedWorldMatrix = attachedNode.matrixWorld.clone();
  attachedWorldMatrix.setPosition(
    attachedWorldPosition.add(placementOffset),
  );

  attachedNode.removeFromParent();
  model.add(attachedNode);
  model.updateMatrixWorld(true);
  attachedNode.matrix.copy(
    model.matrixWorld.clone().invert().multiply(attachedWorldMatrix),
  );
  attachedNode.matrixAutoUpdate = false;
  attachedNode.updateMatrixWorld(true);

  parent.attach(attachedNode);
  attachedNode.matrixAutoUpdate = false;
  attachedNode.userData.clusterAttachment = definition.sourceNodeName;
  attachedNode.updateMatrixWorld(true);
}

interface ClusterRootFramePayload {
  clusterId?: unknown;
  status?: unknown;
  rootFrameReady?: unknown;
  rootTransform?: {
    values?: unknown;
  };
}

type MotionVector = [number, number, number];

type ClusterPathMotionNodeName =
  | "oc_left-1"
  | "oc_right-1"
  | "arm_left_1-1"
  | "arm_left_2-1"
  | "arm_right_1-1"
  | "arm_right_2-1";
type ClusterAxisMotionNodeName =
  | "truc_chinh-1"
  | "truc_nen-1"
  | "gear_motor_chinh-1"
  | "gear_motor_nen-1"
  | "gear_nen-1"
  | "arm_left_3-1"
  | "arm_right_3-1"
  | "wiper_gear-1";

interface ClusterMotionConstraintEntity {
  componentId: string;
  entityParams: readonly number[];
}

interface ClusterMotionConstraint {
  name: string;
  participants: readonly string[];
  entities: readonly ClusterMotionConstraintEntity[];
}

interface ClusterBodyPathConnection {
  kind: "point-on-path";
  status: "verified";
  mate: "PathMate8" | "PathMate13";
  sourcePartId: "arm_left_1-1" | "arm_right_1-1";
  targetPartId: "body_may-1";
  sourcePoint: MotionVector;
  sourceDirection: MotionVector;
  targetReferencePoint: MotionVector;
  rotationAxis: {
    point: MotionVector;
    axis: MotionVector;
  };
  targetPath: {
    sourceFeature: "Sketch1" | "Sketch2";
    sourceSegments: readonly [string, string];
    coordinateFrame: "solidworks-assembly";
  };
  validation: {
    pathDriverStartResidualMeters: number;
    toleranceMeters: number;
  };
}

interface ClusterGacCoffeeSlideGuide {
  kind: "straight-translation";
  coordinateFrame: "solidworks-assembly";
  axis: MotionVector;
  axisSource: string;
  sourceMates: readonly ["Coincident10", "Tangent3"];
  pushProgressRange: readonly [number, number];
  holdAfterSegment: "Line1";
  contact: {
    driverPoint: MotionVector;
    driverAxis: MotionVector;
    driverRadiusMeters: number;
    drivenPoint: MotionVector;
    drivenNormal: MotionVector;
    coincidentNormal: MotionVector;
  };
  guide: {
    sourceSketches: readonly ["Sketch3:Line1", "Sketch4:Line1"];
    axis: MotionVector;
    coordinateFrame: "solidworks-assembly";
    sketchDirections: readonly [MotionVector, MotionVector];
  };
}

interface ClusterArmLeft1Attachment {
  partId: "head_nen-1" | "gac_coffee-1";
  nodeName: "head_nen-1" | "gac_coffee-1";
  parentId: "arm_left_1-1" | "body_may-1";
  relation: "rigid-follow" | "body-mounted-tangent-contact";
  motionParentId?: "arm_left_1-1";
  motionRelation?: "tangent-contact-follow" | "straight-body-bar-translation";
  slideGuide?: ClusterGacCoffeeSlideGuide;
  sourceMates: readonly string[];
}

interface MainDriveCalibrationSample {
  camProgress: number;
  motorAngleRadians: number;
}

interface MainDriveCalibration {
  kind: "cam-path-master";
  camPathPartId: "oc_left-1";
  camProgressRange: readonly [number, number];
  motorAngleRangeRadians: readonly [number, number];
  wiperAngleRangeRadians: readonly [number, number];
  distanceMode: "LimitDistance-range";
  sourceMates: readonly string[];
  samples: readonly MainDriveCalibrationSample[];
}

interface ClusterPathMotionDefinition {
  schemaVersion:
    | "cluster-03-oc-left-motion.v1"
    | "cluster-03-oc-right-motion.v1"
    | "cluster-03-arm-left-1-motion.v1"
    | "cluster-03-arm-left-2-motion.v1"
    | "cluster-03-arm-right-1-motion.v1"
    | "cluster-03-arm-right-2-motion.v1";
  clusterId: "cluster-03";
  status: "verified";
  runtimeReady: true;
  partId: ClusterPathMotionNodeName;
  nodeName: ClusterPathMotionNodeName;
  parentId: "body_may-1";
  motion: {
    kind: "path-follow" | "driver-follow";
    property: "translation";
    progressRange: readonly [number, number];
    initialProgress: number;
    preserveInitialOrientation: true;
    showGuide?: boolean;
  };
  driver?: {
    partId: "oc_left-1" | "oc_right-1";
    motionFile: string;
    relation: "rigid-translation" | "rigid-translation-with-path-roll";
    sourceMates: readonly string[];
    pathConstraint?: string;
    dependencyPartId?: string;
    dependencyMotionFile?: string;
    sourcePath: string;
  };
  bodyConnection?: ClusterBodyPathConnection;
  attachments?: readonly ClusterArmLeft1Attachment[];
  anchor: {
    point: MotionVector;
    localPoint: MotionVector;
  };
  path: {
    sourceFeature: "Sketch1" | "Sketch2";
    sourceSegments: readonly [string, string];
    segments: [
      {
        kind: "arc";
        center: MotionVector;
        start: MotionVector;
        end: MotionVector;
        radius: number;
        normal: MotionVector;
        sweepRadians: number;
        lengthMeters: number;
      },
      {
        kind: "line";
        start: MotionVector;
        end: MotionVector;
        lengthMeters: number;
      },
    ];
    lengthMeters: number;
    segmentDirections?: readonly ["forward" | "reverse", "forward" | "reverse"];
  };
  connection?: {
    kind: "point-on-path";
    status: "verified";
    mate: "PathMate10" | "PathMate14";
    sourcePartId: "arm_left_2-1" | "arm_right_2-1";
    targetPartId: "arm_left_3-1" | "arm_right_3-1";
    sourcePoint: MotionVector;
    sourceLocalPoint: MotionVector;
    targetPath: {
      sourceFeature: "Sketch1";
      sourceSegment: "Line1";
      point: MotionVector;
      direction: MotionVector;
      start: MotionVector;
      end: MotionVector;
      localPoint: MotionVector;
      localDirection: MotionVector;
      localStart: MotionVector;
      localEnd: MotionVector;
      parameterRange: readonly [number, number];
      initialParameter?: number;
      lengthMeters: number;
      coordinateFrame: "solidworks-assembly";
    };
    driverAxis: {
      sourceMate: "Concentric2" | "Concentric21";
      partId: "oc_left-1" | "oc_right-1";
      point: MotionVector;
      axis: MotionVector;
      localPoint: MotionVector;
      localAxis: MotionVector;
    };
    initialLineProgress?: number;
    limit?: {
      mate: "LimitDistance1";
      sourcePoint: MotionVector;
      targetPoint: MotionVector;
      distanceMeters: number;
      minimumDistanceMeters: number;
      maximumDistanceMeters: number;
    };
    validation: {
      pathResidualMeters: number;
      limitDistanceResidualMeters: number;
      lineProjectionMeters: number;
      toleranceMeters: number;
    };
  };
  wiperConnection?: {
    kind: "point-on-path";
    status: "verified";
    mate: "PathMate11";
    sourcePartId: "arm_left_2-1";
    targetPartId: "wiper_gear-1";
    sourcePoint: MotionVector;
    targetPath: {
      sourceFeature: "Sketch1";
      sourceSegment: "Line1";
      point: MotionVector;
      direction: MotionVector;
      coordinateFrame: "solidworks-assembly";
    };
    limit: {
      mate: "LimitDistance2";
      targetPoint: MotionVector;
      distanceMeters: number;
      minimumDistanceMeters: number;
      maximumDistanceMeters: number;
    };
    validation: {
      pathResidualMeters: number;
      limitDistanceResidualMeters: number;
      lineProjectionMeters: number;
      toleranceMeters: number;
    };
  };
}

interface ClusterAxisMotionDefinition {
  schemaVersion:
    | "cluster-03-truc-chinh-motion.v1"
    | "cluster-03-truc-nen-motion.v1"
    | "cluster-03-gear-motor-chinh-motion.v1"
    | "cluster-03-gear-motor-nen-motion.v1"
    | "cluster-03-gear-nen-motion.v1"
    | "cluster-03-arm-left-3-motion.v1"
    | "cluster-03-arm-right-3-motion.v1"
    | "cluster-03-wiper-gear-motion.v1";
  clusterId: "cluster-03";
  status: "verified";
  runtimeReady: true;
  partId: ClusterAxisMotionNodeName;
  nodeName: ClusterAxisMotionNodeName;
  parentId: "body_may-1";
  motion: {
    kind: "axis-rotation" | "screw-axis";
    property: "rotation" | "rotation+translation";
    progressRange: readonly [number, number];
    initialProgress: number;
    angleRangeRadians: readonly [number, number];
    angleRangeKind: "diagnostic-test-envelope";
    cadAngularLimit: null;
    translationRangeMeters?: readonly [number, number];
  };
  pivot: {
    kind: "axis";
    point: MotionVector;
    localPoint: MotionVector;
    axis: MotionVector;
    localAxis: MotionVector;
  };
  gear?: {
    sourceMate: "GearMate2" | "GearMate4";
    drivenComponent: string;
    ratioNumerator: number;
    ratioDenominator: number;
    ratio: number;
    reverse: boolean;
    targetAxis: MotionVector;
    drivenAxis: MotionVector;
    driveCalibration?: MainDriveCalibration;
  };
  constraints?: readonly ClusterMotionConstraint[];
  driver?: {
    partId: "truc_chinh-1" | "gear_motor_chinh-1";
    motionFile: string;
    relation: "rigid-rotation" | "gear-follow";
    sourceMates: readonly string[];
  };
}

interface ClusterBoxNenMotionDefinition {
  schemaVersion: "cluster-03-box-nen-motion.v1";
  clusterId: "cluster-03";
  motionGroup: "motor_nen";
  status: "verified";
  runtimeReady: true;
  units: "meters";
  coordinateFrame: "solidworks-assembly";
  partId: "box_nen-1";
  nodeName: "box_nen-1";
  parentId: "body_may-1";
  motion: {
    kind: "screw-follow";
    property: "translation";
    progressRange: readonly [number, number];
    initialProgress: number;
    preserveInitialPose: true;
    translationRangeMeters: readonly [number, number];
  };
  attachment: {
    relation: "body-mounted-axial-slide";
    sourceMates: readonly ["Concentric28", "Parallel15"];
    parentReference: {
      point: MotionVector;
      axis: MotionVector;
      parallelNormal: MotionVector;
    };
    targetReference: {
      point: MotionVector;
      axis: MotionVector;
      parallelNormal: MotionVector;
    };
    axis: MotionVector;
    axisReference: "truc_nen-1";
  };
  screw: {
    sourceMate: "Screw2";
    driverComponent: "truc_nen-1";
    fixedReferenceComponent: "box_nen-1";
    targetAxis: MotionVector;
    fixedReferenceAxis: MotionVector;
    pitchMeters: number;
    reverse: boolean;
    translationPerRevolutionMeters: number;
  };
  driver: {
    partId: "truc_nen-1";
    motionFile: string;
    relation: "screw-translation-follow";
    sourceMates: readonly ["Screw2", "GearMate4"];
  };
  constraints: readonly ClusterMotionConstraint[];
  targetInitialTransform: readonly number[];
  parentInitialTransform: readonly number[];
  validation: {
    glbMatrixTolerance: number;
    glbMatrixResidual: number;
    concentricAxisAlignmentDot: number;
    parallelNormalAlignmentDot: number;
    parentFixed: true;
    samples: readonly {
      progress: number;
      driverAngleRadians: number;
      shaftTranslationMeters: number;
      boxTranslationMeters: number;
      translationResidualMeters: number;
    }[];
    screwPitchMeters: number;
    translationDirectionDot: number;
    toleranceMeters: number;
    passed: true;
  };
}

export type ClusterMotionDefinition =
  | ClusterPathMotionDefinition
  | ClusterAxisMotionDefinition
  | ClusterBoxNenMotionDefinition;

function parseClusterRootTransform(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Cluster root-frame response is not an object.");
  }

  const rootFrame = payload as ClusterRootFramePayload;
  const values = rootFrame.rootTransform?.values;
  if (
    rootFrame.clusterId !== "cluster-03" ||
    rootFrame.status !== "verified" ||
    rootFrame.rootFrameReady !== true ||
    !Array.isArray(values) ||
    values.length !== 16 ||
    values.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error("Cluster root-frame contract is invalid or not verified.");
  }

  return new THREE.Matrix4().fromArray(values);
}

export async function loadClusterRootTransform(
  rootFrameUrl: string | undefined,
  signal: AbortSignal,
) {
  if (!rootFrameUrl) return new THREE.Matrix4();

  const response = await fetch(rootFrameUrl, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Cluster root-frame request failed with status ${response.status}.`,
    );
  }

  return parseClusterRootTransform(await response.json());
}

function isMotionVector(value: unknown): value is MotionVector {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidMainDriveCalibration(
  value: unknown,
): value is MainDriveCalibration {
  if (!value || typeof value !== "object") return false;

  const calibration = value as Partial<MainDriveCalibration>;
  const samples = calibration.samples;
  const sourceMates = calibration.sourceMates;
  const ranges = [
    calibration.camProgressRange,
    calibration.motorAngleRangeRadians,
    calibration.wiperAngleRangeRadians,
  ];
  const requiredMates = [
    "GearMate2",
    "PathMate11",
    "LimitDistance2",
    "PathMate10",
    "LimitDistance1",
  ];

  return (
    calibration.kind === "cam-path-master" &&
    calibration.camPathPartId === "oc_left-1" &&
    calibration.distanceMode === "LimitDistance-range" &&
    ranges.every(
      (range) =>
        Array.isArray(range) &&
        range.length === 2 &&
        range.every(isFiniteNumber),
    ) &&
    calibration.camProgressRange?.[0] === 0 &&
    calibration.camProgressRange?.[1] === 1 &&
    calibration.motorAngleRangeRadians?.[1] !== undefined &&
    calibration.motorAngleRangeRadians[1] >
      calibration.motorAngleRangeRadians[0] &&
    calibration.wiperAngleRangeRadians?.[0] === 0 &&
    calibration.wiperAngleRangeRadians?.[1] !== undefined &&
    calibration.wiperAngleRangeRadians[1] <
      calibration.wiperAngleRangeRadians[0] &&
    Array.isArray(sourceMates) &&
    requiredMates.every((mate) => sourceMates.includes(mate)) &&
    Array.isArray(samples) &&
    samples.length >= 2 &&
    samples.every(
      (sample, index) =>
        sample &&
        isFiniteNumber(sample.camProgress) &&
        isFiniteNumber(sample.motorAngleRadians) &&
        (index === 0 ||
          sample.camProgress > (samples[index - 1]?.camProgress ?? -Infinity)),
    ) &&
    samples[0]?.camProgress === 0 &&
    samples.at(-1)?.camProgress === 1 &&
    samples[0]?.motorAngleRadians === calibration.motorAngleRangeRadians?.[0] &&
    samples.at(-1)?.motorAngleRadians ===
      calibration.motorAngleRangeRadians?.[1]
  );
}

function isValidArmLeft1BodyConnection(
  value: unknown,
): value is ClusterBodyPathConnection {
  if (!value || typeof value !== "object") return false;

  const connection = value as {
    kind?: unknown;
    status?: unknown;
    mate?: unknown;
    sourcePartId?: unknown;
    targetPartId?: unknown;
    sourcePoint?: unknown;
    sourceDirection?: unknown;
    targetReferencePoint?: unknown;
    rotationAxis?: {
      point?: unknown;
      axis?: unknown;
    };
    targetPath?: {
      sourceFeature?: unknown;
      sourceSegments?: unknown;
      coordinateFrame?: unknown;
    };
    validation?: {
      pathDriverStartResidualMeters?: unknown;
      toleranceMeters?: unknown;
    };
  };
  const validation = connection.validation;

  return (
    connection.kind === "point-on-path" &&
    connection.status === "verified" &&
    connection.mate === "PathMate8" &&
    connection.sourcePartId === "arm_left_1-1" &&
    connection.targetPartId === "body_may-1" &&
    isMotionVector(connection.sourcePoint) &&
    isMotionVector(connection.sourceDirection) &&
    isMotionVector(connection.targetReferencePoint) &&
    isMotionVector(connection.rotationAxis?.point) &&
    isMotionVector(connection.rotationAxis?.axis) &&
    connection.targetPath?.sourceFeature === "Sketch1" &&
    JSON.stringify(connection.targetPath.sourceSegments) ===
      JSON.stringify(["Arc3", "Line1"]) &&
    connection.targetPath.coordinateFrame === "solidworks-assembly" &&
    isFiniteNumber(validation?.pathDriverStartResidualMeters) &&
    isFiniteNumber(validation?.toleranceMeters) &&
    validation.pathDriverStartResidualMeters <= validation.toleranceMeters
  );
}

function isValidArmRight1BodyConnection(
  value: unknown,
): value is ClusterBodyPathConnection {
  if (!value || typeof value !== "object") return false;

  const connection = value as {
    kind?: unknown;
    status?: unknown;
    mate?: unknown;
    sourcePartId?: unknown;
    targetPartId?: unknown;
    sourcePoint?: unknown;
    sourceDirection?: unknown;
    targetReferencePoint?: unknown;
    rotationAxis?: {
      point?: unknown;
      axis?: unknown;
    };
    targetPath?: {
      sourceFeature?: unknown;
      sourceSegments?: unknown;
      coordinateFrame?: unknown;
    };
    validation?: {
      pathDriverStartResidualMeters?: unknown;
      toleranceMeters?: unknown;
    };
  };
  const validation = connection.validation;

  return (
    connection.kind === "point-on-path" &&
    connection.status === "verified" &&
    connection.mate === "PathMate13" &&
    connection.sourcePartId === "arm_right_1-1" &&
    connection.targetPartId === "body_may-1" &&
    isMotionVector(connection.sourcePoint) &&
    isMotionVector(connection.sourceDirection) &&
    isMotionVector(connection.targetReferencePoint) &&
    isMotionVector(connection.rotationAxis?.point) &&
    isMotionVector(connection.rotationAxis?.axis) &&
    connection.targetPath?.sourceFeature === "Sketch2" &&
    JSON.stringify(connection.targetPath.sourceSegments) ===
      JSON.stringify(["Arc1", "Line2"]) &&
    connection.targetPath.coordinateFrame === "solidworks-assembly" &&
    isFiniteNumber(validation?.pathDriverStartResidualMeters) &&
    isFiniteNumber(validation?.toleranceMeters) &&
    validation.pathDriverStartResidualMeters <= validation.toleranceMeters
  );
}

function isValidArmLeft1Attachments(
  value: unknown,
): value is readonly ClusterArmLeft1Attachment[] {
  if (!Array.isArray(value) || value.length !== 2) return false;

  const expected = new Map([
    ["head_nen-1", ["Concentric13", "Concentric14", "Coincident8"]],
    ["gac_coffee-1", ["Coincident10", "Tangent3"]],
  ] as const);

  return value.every((attachment) => {
    if (!attachment || typeof attachment !== "object") return false;
    const candidate = attachment as Partial<ClusterArmLeft1Attachment>;
    const mates = expected.get(candidate.partId as "head_nen-1" | "gac_coffee-1");
    return (
      (candidate.partId === "head_nen-1" || candidate.partId === "gac_coffee-1") &&
      candidate.nodeName === candidate.partId &&
      candidate.parentId ===
        (candidate.partId === "gac_coffee-1"
          ? "body_may-1"
          : "arm_left_1-1") &&
      (candidate.relation === "rigid-follow" ||
        candidate.relation === "body-mounted-tangent-contact") &&
      (candidate.partId !== "gac_coffee-1" ||
        (candidate.motionParentId === "arm_left_1-1" &&
          candidate.motionRelation === "straight-body-bar-translation" &&
          candidate.slideGuide?.kind === "straight-translation" &&
          candidate.slideGuide.coordinateFrame === "solidworks-assembly" &&
          isMotionVector(candidate.slideGuide.axis) &&
          candidate.slideGuide.pushProgressRange?.length === 2 &&
          candidate.slideGuide.pushProgressRange.every(isFiniteNumber) &&
          isMotionVector(candidate.slideGuide.contact?.driverPoint) &&
          isMotionVector(candidate.slideGuide.contact?.drivenPoint) &&
          isMotionVector(candidate.slideGuide.contact?.drivenNormal) &&
          isMotionVector(candidate.slideGuide.guide?.axis))) &&
      Array.isArray(candidate.sourceMates) &&
      mates !== undefined &&
      JSON.stringify(candidate.sourceMates) === JSON.stringify(mates)
    );
  });
}

function parseClusterMotionDefinition(payload: unknown): ClusterMotionDefinition {
  if (!payload || typeof payload !== "object") {
    throw new Error("cluster motion response is not an object.");
  }

  const definition = payload as Partial<ClusterPathMotionDefinition>;
  const schemaVersion = (payload as { schemaVersion?: unknown }).schemaVersion;
  if (schemaVersion === "cluster-03-box-nen-motion.v1") {
    const boxDefinition = payload as Partial<ClusterBoxNenMotionDefinition>;
    if (
      boxDefinition.clusterId !== "cluster-03" ||
      boxDefinition.motionGroup !== "motor_nen" ||
      boxDefinition.status !== "verified" ||
      boxDefinition.runtimeReady !== true ||
      boxDefinition.units !== "meters" ||
      boxDefinition.coordinateFrame !== "solidworks-assembly" ||
      boxDefinition.partId !== "box_nen-1" ||
      boxDefinition.nodeName !== "box_nen-1" ||
      boxDefinition.parentId !== "body_may-1" ||
      boxDefinition.motion?.kind !== "screw-follow" ||
      boxDefinition.motion.property !== "translation" ||
      !Array.isArray(boxDefinition.motion.progressRange) ||
      boxDefinition.motion.progressRange.length !== 2 ||
      boxDefinition.motion.progressRange.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      ) ||
      boxDefinition.motion.progressRange[0] !== 0 ||
      boxDefinition.motion.progressRange[1] !== 1 ||
      boxDefinition.motion.preserveInitialPose !== true ||
      !Array.isArray(boxDefinition.motion.translationRangeMeters) ||
      boxDefinition.motion.translationRangeMeters.length !== 2 ||
      boxDefinition.motion.translationRangeMeters.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      ) ||
      boxDefinition.attachment?.relation !== "body-mounted-axial-slide" ||
      JSON.stringify(boxDefinition.attachment.sourceMates) !==
        JSON.stringify(["Concentric28", "Parallel15"]) ||
      !isMotionVector(boxDefinition.attachment.parentReference?.point) ||
      !isMotionVector(boxDefinition.attachment.parentReference?.axis) ||
      !isMotionVector(
        boxDefinition.attachment.parentReference?.parallelNormal,
      ) ||
      !isMotionVector(boxDefinition.attachment.targetReference?.point) ||
      !isMotionVector(boxDefinition.attachment.targetReference?.axis) ||
      !isMotionVector(
        boxDefinition.attachment.targetReference?.parallelNormal,
      ) ||
      !isMotionVector(boxDefinition.attachment.axis) ||
      boxDefinition.attachment.axisReference !== "truc_nen-1" ||
      boxDefinition.screw?.sourceMate !== "Screw2" ||
      boxDefinition.screw?.driverComponent !== "truc_nen-1" ||
      boxDefinition.screw?.fixedReferenceComponent !== "box_nen-1" ||
      !isMotionVector(boxDefinition.screw.targetAxis) ||
      !isMotionVector(boxDefinition.screw.fixedReferenceAxis) ||
      !Number.isFinite(boxDefinition.screw?.pitchMeters) ||
      (boxDefinition.screw?.pitchMeters ?? 0) <= 0 ||
      typeof boxDefinition.screw?.reverse !== "boolean" ||
      !Number.isFinite(boxDefinition.screw?.translationPerRevolutionMeters) ||
      !boxDefinition.driver ||
      boxDefinition.driver.partId !== "truc_nen-1" ||
      boxDefinition.driver.motionFile !==
        "/models/digital-twin/cluster-03/connections/truc-nen.json" ||
      boxDefinition.driver.relation !== "screw-translation-follow" ||
      JSON.stringify(boxDefinition.driver.sourceMates) !==
        JSON.stringify(["Screw2", "GearMate4"]) ||
      !Array.isArray(boxDefinition.targetInitialTransform) ||
      boxDefinition.targetInitialTransform.length !== 16 ||
      boxDefinition.targetInitialTransform.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      ) ||
      !Array.isArray(boxDefinition.parentInitialTransform) ||
      boxDefinition.parentInitialTransform.length !== 16 ||
      boxDefinition.parentInitialTransform.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      ) ||
      !boxDefinition.validation ||
      boxDefinition.validation.parentFixed !== true ||
      boxDefinition.validation.passed !== true ||
      !Number.isFinite(boxDefinition.validation.glbMatrixResidual) ||
      !Number.isFinite(boxDefinition.validation.glbMatrixTolerance) ||
      boxDefinition.validation.glbMatrixResidual >
        boxDefinition.validation.glbMatrixTolerance ||
      !Number.isFinite(boxDefinition.validation.screwPitchMeters) ||
      !Number.isFinite(boxDefinition.validation.translationDirectionDot) ||
      boxDefinition.validation.samples?.length !== 3 ||
      boxDefinition.validation.samples.some(
        (sample) =>
          !Number.isFinite(sample.progress) ||
          !Number.isFinite(sample.driverAngleRadians) ||
          !Number.isFinite(sample.shaftTranslationMeters) ||
          !Number.isFinite(sample.boxTranslationMeters) ||
          !Number.isFinite(sample.translationResidualMeters),
      )
    ) {
      throw new Error("cluster box_nen motion contract is invalid or not verified.");
    }

    return boxDefinition as ClusterBoxNenMotionDefinition;
  }
  if (
    schemaVersion === "cluster-03-truc-chinh-motion.v1" ||
    schemaVersion === "cluster-03-truc-nen-motion.v1" ||
    schemaVersion === "cluster-03-gear-motor-chinh-motion.v1" ||
    schemaVersion === "cluster-03-gear-motor-nen-motion.v1" ||
    schemaVersion === "cluster-03-gear-nen-motion.v1" ||
    schemaVersion === "cluster-03-arm-left-3-motion.v1" ||
    schemaVersion === "cluster-03-arm-right-3-motion.v1" ||
    schemaVersion === "cluster-03-wiper-gear-motion.v1"
  ) {
    const axisDefinition = payload as Partial<ClusterAxisMotionDefinition>;
    const expectedPartId =
      schemaVersion === "cluster-03-truc-chinh-motion.v1"
        ? "truc_chinh-1"
        : schemaVersion === "cluster-03-truc-nen-motion.v1"
          ? "truc_nen-1"
          : schemaVersion === "cluster-03-gear-motor-chinh-motion.v1"
            ? "gear_motor_chinh-1"
            : schemaVersion === "cluster-03-gear-motor-nen-motion.v1"
              ? "gear_motor_nen-1"
              : schemaVersion === "cluster-03-gear-nen-motion.v1"
                ? "gear_nen-1"
                : schemaVersion === "cluster-03-arm-left-3-motion.v1"
                  ? "arm_left_3-1"
                  : schemaVersion === "cluster-03-arm-right-3-motion.v1"
                    ? "arm_right_3-1"
                  : "wiper_gear-1";
    const expectedKind =
      schemaVersion === "cluster-03-truc-chinh-motion.v1"
        ? "axis-rotation"
        : schemaVersion === "cluster-03-truc-nen-motion.v1"
          ? "screw-axis"
          : "axis-rotation";
    const translationRange = axisDefinition.motion?.translationRangeMeters;
    const isGearMotorSchema =
      schemaVersion === "cluster-03-gear-motor-chinh-motion.v1" ||
      schemaVersion === "cluster-03-gear-motor-nen-motion.v1";
    if (
      axisDefinition.clusterId !== "cluster-03" ||
      axisDefinition.status !== "verified" ||
      axisDefinition.runtimeReady !== true ||
      axisDefinition.partId !== expectedPartId ||
      axisDefinition.nodeName !== expectedPartId ||
      axisDefinition.parentId !== "body_may-1" ||
      axisDefinition.motion?.kind !== expectedKind ||
      (axisDefinition.motion?.property !== "rotation" &&
        axisDefinition.motion?.property !== "rotation+translation") ||
      axisDefinition.motion.angleRangeKind !== "diagnostic-test-envelope" ||
      axisDefinition.motion.cadAngularLimit !== null ||
      !Array.isArray(axisDefinition.motion.angleRangeRadians) ||
      axisDefinition.motion.angleRangeRadians.length !== 2 ||
      axisDefinition.motion.angleRangeRadians.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      ) ||
      axisDefinition.motion.angleRangeRadians[1] <=
        axisDefinition.motion.angleRangeRadians[0] ||
      axisDefinition.pivot?.kind !== "axis" ||
      !isMotionVector(axisDefinition.pivot.point) ||
      !isMotionVector(axisDefinition.pivot.localPoint) ||
      !isMotionVector(axisDefinition.pivot.axis) ||
      !isMotionVector(axisDefinition.pivot.localAxis) ||
      (axisDefinition.motion.kind === "screw-axis" &&
        (!Array.isArray(translationRange) ||
          translationRange.length !== 2 ||
          translationRange.some(
            (value) => typeof value !== "number" || !Number.isFinite(value),
          ))) ||
      (isGearMotorSchema &&
        (!axisDefinition.gear ||
          (axisDefinition.gear.sourceMate !== "GearMate2" &&
            axisDefinition.gear.sourceMate !== "GearMate4") ||
          typeof axisDefinition.gear.drivenComponent !== "string" ||
          typeof axisDefinition.gear.ratioNumerator !== "number" ||
          !Number.isFinite(axisDefinition.gear.ratioNumerator) ||
          typeof axisDefinition.gear.ratioDenominator !== "number" ||
          !Number.isFinite(axisDefinition.gear.ratioDenominator) ||
          typeof axisDefinition.gear.ratio !== "number" ||
          !Number.isFinite(axisDefinition.gear.ratio) ||
          axisDefinition.gear.ratio <= 0 ||
          typeof axisDefinition.gear.reverse !== "boolean" ||
          !isMotionVector(axisDefinition.gear.targetAxis) ||
          !isMotionVector(axisDefinition.gear.drivenAxis))) ||
      (schemaVersion === "cluster-03-gear-motor-chinh-motion.v1" &&
        !isValidMainDriveCalibration(axisDefinition.gear?.driveCalibration)) ||
      (schemaVersion === "cluster-03-arm-left-3-motion.v1" &&
        (!axisDefinition.driver ||
          axisDefinition.driver.partId !== "truc_chinh-1" ||
          axisDefinition.driver.motionFile !==
            "/models/digital-twin/cluster-03/connections/truc-chinh.json" ||
          JSON.stringify(axisDefinition.driver.sourceMates) !==
            JSON.stringify(["Parallel1", "Concentric6"]))) ||
      (schemaVersion === "cluster-03-arm-right-3-motion.v1" &&
        (!axisDefinition.driver ||
          axisDefinition.driver.partId !== "truc_chinh-1" ||
          axisDefinition.driver.motionFile !==
            "/models/digital-twin/cluster-03/connections/truc-chinh.json" ||
          JSON.stringify(axisDefinition.driver.sourceMates) !==
            JSON.stringify(["Parallel7", "Concentric22"])))
    ) {
      throw new Error("cluster axis motion contract is invalid or not verified.");
    }

    return axisDefinition as ClusterAxisMotionDefinition;
  }

  const isKnownArmLeft1Motion =
    schemaVersion === "cluster-03-arm-left-1-motion.v1" &&
    definition.partId === "arm_left_1-1" &&
    definition.nodeName === "arm_left_1-1" &&
    definition.motion?.kind === "driver-follow" &&
    definition.driver?.partId === "oc_left-1" &&
    definition.driver?.pathConstraint === "PathMate8";
  const isKnownArmLeft2Motion =
    schemaVersion === "cluster-03-arm-left-2-motion.v1" &&
    definition.partId === "arm_left_2-1" &&
    definition.nodeName === "arm_left_2-1" &&
    definition.motion?.kind === "driver-follow" &&
    definition.driver?.partId === "oc_left-1" &&
    definition.driver?.dependencyPartId === "arm_left_1-1" &&
    definition.connection?.kind === "point-on-path" &&
    definition.connection?.status === "verified" &&
    definition.connection?.mate === "PathMate10" &&
    definition.connection?.sourcePartId === "arm_left_2-1" &&
    definition.connection?.targetPartId === "arm_left_3-1";
  const isKnownArmRight1Motion =
    schemaVersion === "cluster-03-arm-right-1-motion.v1" &&
    definition.partId === "arm_right_1-1" &&
    definition.nodeName === "arm_right_1-1" &&
    definition.motion?.kind === "driver-follow" &&
    definition.driver?.partId === "oc_right-1" &&
    definition.driver?.pathConstraint === "PathMate13";
  const isKnownArmRight2Motion =
    schemaVersion === "cluster-03-arm-right-2-motion.v1" &&
    definition.partId === "arm_right_2-1" &&
    definition.nodeName === "arm_right_2-1" &&
    definition.motion?.kind === "driver-follow" &&
    definition.driver?.partId === "oc_right-1" &&
    definition.driver?.dependencyPartId === "arm_right_1-1" &&
    definition.connection?.kind === "point-on-path" &&
    definition.connection?.status === "verified" &&
    definition.connection?.mate === "PathMate14" &&
    definition.connection?.sourcePartId === "arm_right_2-1" &&
    definition.connection?.targetPartId === "arm_right_3-1";
  const isKnownArmMotion =
    isKnownArmLeft1Motion ||
    isKnownArmLeft2Motion ||
    isKnownArmRight1Motion ||
    isKnownArmRight2Motion;
  const segments = definition.path?.segments;
  const arc = segments?.[0];
  const line = segments?.[1];
  const isKnownMotion =
    (definition.schemaVersion === "cluster-03-oc-left-motion.v1" &&
      definition.partId === "oc_left-1" &&
      definition.nodeName === "oc_left-1") ||
    (definition.schemaVersion === "cluster-03-oc-right-motion.v1" &&
      definition.partId === "oc_right-1" &&
      definition.nodeName === "oc_right-1") ||
    isKnownArmMotion;
  const isKnownMotionPath =
    (definition.partId === "oc_left-1" &&
      definition.path?.sourceFeature === "Sketch1" &&
      JSON.stringify(definition.path?.sourceSegments) ===
        JSON.stringify(["Arc3", "Line1"])) ||
    (definition.partId === "oc_right-1" &&
      definition.path?.sourceFeature === "Sketch2" &&
      JSON.stringify(definition.path?.sourceSegments) ===
        JSON.stringify(["Arc1", "Line2"])) ||
    (definition.partId === "arm_left_1-1" &&
      definition.path?.sourceFeature === "Sketch1" &&
      JSON.stringify(definition.path?.sourceSegments) ===
        JSON.stringify(["Arc3", "Line1"])) ||
    (definition.partId === "arm_left_2-1" &&
      definition.path?.sourceFeature === "Sketch1" &&
      JSON.stringify(definition.path?.sourceSegments) ===
        JSON.stringify(["Arc3", "Line1"])) ||
    ((definition.partId === "arm_right_1-1" ||
      definition.partId === "arm_right_2-1") &&
      definition.path?.sourceFeature === "Sketch2" &&
      JSON.stringify(definition.path?.sourceSegments) ===
        JSON.stringify(["Arc1", "Line2"]));
  if (
    definition.clusterId !== "cluster-03" ||
    definition.status !== "verified" ||
    definition.runtimeReady !== true ||
    !isKnownMotion ||
    !isKnownMotionPath ||
    definition.parentId !== "body_may-1" ||
    !definition.motion ||
    (definition.motion.kind !== "path-follow" &&
      definition.motion.kind !== "driver-follow") ||
    definition.motion.property !== "translation" ||
    !Array.isArray(definition.motion.progressRange) ||
    definition.motion.progressRange.length !== 2 ||
    definition.motion.progressRange.some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    ) ||
    definition.motion.progressRange[1] <= definition.motion.progressRange[0] ||
    definition.motion.preserveInitialOrientation !== true ||
    !isMotionVector(definition.anchor?.point) ||
    !isMotionVector(definition.anchor?.localPoint) ||
    !arc ||
    arc.kind !== "arc" ||
    !isMotionVector(arc.center) ||
    !isMotionVector(arc.start) ||
    !isMotionVector(arc.end) ||
    !isMotionVector(arc.normal) ||
    typeof arc.radius !== "number" ||
    !Number.isFinite(arc.radius) ||
    typeof arc.sweepRadians !== "number" ||
    !Number.isFinite(arc.sweepRadians) ||
    !line ||
    line.kind !== "line" ||
    !isMotionVector(line.start) ||
    !isMotionVector(line.end) ||
    (isKnownArmLeft1Motion &&
      (!definition.driver ||
        definition.driver.partId !== "oc_left-1" ||
        definition.driver.motionFile !==
          "/models/digital-twin/cluster-03/connections/oc-left.json" ||
        JSON.stringify(definition.driver.sourceMates) !==
          JSON.stringify(["Coincident1", "Concentric1"]))) ||
    (schemaVersion === "cluster-03-arm-left-1-motion.v1" &&
      (!isValidArmLeft1BodyConnection(definition.bodyConnection) ||
        !isValidArmLeft1Attachments(definition.attachments)))
    ||
    (isKnownArmRight1Motion &&
      (!definition.driver ||
        JSON.stringify(definition.driver.sourceMates) !==
          JSON.stringify(["Coincident12", "Concentric17"]) ||
        !isValidArmRight1BodyConnection(definition.bodyConnection)))
    ||
    (isKnownArmLeft2Motion &&
      (!definition.driver ||
        JSON.stringify(definition.driver.sourceMates) !==
          JSON.stringify(["Coincident3", "Concentric2"]) ||
        definition.driver.dependencyMotionFile !==
          "/models/digital-twin/cluster-03/connections/arm-left-1.json" ||
        !definition.connection ||
        !isMotionVector(definition.connection.sourcePoint) ||
        !isMotionVector(definition.connection.targetPath.point) ||
        !isMotionVector(definition.connection.targetPath.direction) ||
        !isMotionVector(definition.connection.targetPath.start) ||
        !isMotionVector(definition.connection.targetPath.end) ||
        !isMotionVector(definition.connection.targetPath.localStart) ||
        !isMotionVector(definition.connection.targetPath.localEnd) ||
        !Array.isArray(definition.connection.targetPath.parameterRange) ||
        definition.connection.targetPath.parameterRange.length !== 2 ||
        definition.connection.targetPath.parameterRange[0] !== 0 ||
        definition.connection.targetPath.parameterRange[1] !== 1 ||
        typeof definition.connection.targetPath.lengthMeters !== "number" ||
        !Number.isFinite(definition.connection.targetPath.lengthMeters) ||
        definition.connection.targetPath.lengthMeters <= 0 ||
        definition.connection.targetPath.sourceFeature !== "Sketch1" ||
        definition.connection.targetPath.sourceSegment !== "Line1" ||
        definition.connection.driverAxis?.sourceMate !== "Concentric2" ||
        definition.connection.driverAxis.partId !== "oc_left-1" ||
        !isMotionVector(definition.connection.driverAxis.point) ||
        !isMotionVector(definition.connection.driverAxis.axis) ||
        !isMotionVector(definition.connection.driverAxis.localPoint) ||
        !isMotionVector(definition.connection.driverAxis.localAxis) ||
        definition.connection.limit?.mate !== "LimitDistance1" ||
        !definition.wiperConnection ||
        definition.wiperConnection.kind !== "point-on-path" ||
        definition.wiperConnection.status !== "verified" ||
        definition.wiperConnection.mate !== "PathMate11" ||
        definition.wiperConnection.sourcePartId !== "arm_left_2-1" ||
        definition.wiperConnection.targetPartId !== "wiper_gear-1" ||
        !isMotionVector(definition.wiperConnection.sourcePoint) ||
        definition.wiperConnection.targetPath.sourceFeature !== "Sketch1" ||
        definition.wiperConnection.targetPath.sourceSegment !== "Line1" ||
        !isMotionVector(definition.wiperConnection.targetPath.point) ||
        !isMotionVector(definition.wiperConnection.targetPath.direction) ||
        definition.wiperConnection.limit.mate !== "LimitDistance2" ||
        !isMotionVector(definition.wiperConnection.limit.targetPoint) ||
        typeof definition.wiperConnection.limit.distanceMeters !== "number" ||
        !Number.isFinite(definition.wiperConnection.limit.distanceMeters) ||
        typeof definition.wiperConnection.limit.minimumDistanceMeters !==
          "number" ||
        typeof definition.wiperConnection.limit.maximumDistanceMeters !==
          "number")) ||
    (isKnownArmRight2Motion &&
      (!definition.driver ||
        JSON.stringify(definition.driver.sourceMates) !==
          JSON.stringify(["Coincident13", "Concentric21"]) ||
        definition.driver.dependencyMotionFile !==
          "/models/digital-twin/cluster-03/connections/arm-right-1.json" ||
        !definition.connection ||
        !isMotionVector(definition.connection.sourcePoint) ||
        !isMotionVector(definition.connection.sourceLocalPoint) ||
        definition.connection.targetPath.sourceFeature !== "Sketch1" ||
        definition.connection.targetPath.sourceSegment !== "Line1" ||
        !isMotionVector(definition.connection.targetPath.point) ||
        !isMotionVector(definition.connection.targetPath.direction) ||
        !isMotionVector(definition.connection.targetPath.start) ||
        !isMotionVector(definition.connection.targetPath.end) ||
        !isMotionVector(definition.connection.targetPath.localStart) ||
        !isMotionVector(definition.connection.targetPath.localEnd) ||
        !Array.isArray(definition.connection.targetPath.parameterRange) ||
        definition.connection.targetPath.parameterRange.length !== 2 ||
        definition.connection.targetPath.parameterRange[0] !== 0 ||
        definition.connection.targetPath.parameterRange[1] !== 1 ||
        typeof definition.connection.targetPath.lengthMeters !== "number" ||
        !Number.isFinite(definition.connection.targetPath.lengthMeters) ||
        definition.connection.targetPath.lengthMeters <= 0 ||
        definition.connection.driverAxis?.sourceMate !== "Concentric21" ||
        definition.connection.driverAxis.partId !== "oc_right-1" ||
        !isMotionVector(definition.connection.driverAxis.point) ||
        !isMotionVector(definition.connection.driverAxis.axis) ||
        !isMotionVector(definition.connection.driverAxis.localPoint) ||
        !isMotionVector(definition.connection.driverAxis.localAxis) ||
        typeof definition.connection.validation?.pathResidualMeters !==
          "number" ||
        !Number.isFinite(definition.connection.validation.pathResidualMeters) ||
        definition.connection.validation.pathResidualMeters >
          (definition.connection.validation.toleranceMeters ?? Infinity)))
  ) {
    throw new Error("cluster motion contract is invalid or not verified.");
  }

  return definition as ClusterMotionDefinition;
}

export async function loadClusterMotionDefinition(
  motionDefinitionUrl: string | undefined,
  signal: AbortSignal,
) {
  if (!motionDefinitionUrl) return null;

  const response = await fetch(motionDefinitionUrl, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `cluster motion request failed with status ${response.status}.`,
    );
  }

  return parseClusterMotionDefinition(await response.json());
}

export function combineClusterParts(
  parts: THREE.Object3D[],
  rootTransform: THREE.Matrix4,
  recenterModel: boolean,
) {
  const combinedModel = new THREE.Group();
  for (const [index, part] of parts.entries()) {
    part.userData.clusterPartIndex = index;
    part.userData.basePosition = part.position.clone();
    part.userData.baseQuaternion = part.quaternion.clone();
    combinedModel.add(part);
  }
  combinedModel.userData.clusterParts = parts;

  if (recenterModel) {
    combinedModel.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(combinedModel);
    const center = bounds.getCenter(new THREE.Vector3());
    combinedModel.position.copy(center).negate();
  } else {
    combinedModel.matrix.copy(rootTransform);
    combinedModel.matrixAutoUpdate = false;
  }
  combinedModel.updateMatrixWorld(true);

  return combinedModel;
}

export function assertClusterPartSeparation(model: THREE.Group) {
  const body = model.getObjectByName("body_may-1");
  const arm1 = model.getObjectByName("arm_left_1-1");
  if (!body || !arm1) {
    throw new Error("cluster-03 body/arm_left_1 GLB nodes are missing.");
  }
  if (body === arm1 || arm1.getObjectByName("body_may-1")) {
    throw new Error(
      "cluster-03 arm_left_1-1 must not own the body_may-1 mesh node.",
    );
  }
  if (body.parent !== arm1.parent) {
    throw new Error(
      "cluster-03 body_may-1 and arm_left_1-1 must share the aggregate GLB parent.",
    );
  }
}

function attachArmLeft1Followers(
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
) {
  const arm1Definition = motionDefinitions.find(
    (definition) => definition.partId === "arm_left_1-1",
  );
  if (
    !arm1Definition ||
    arm1Definition.schemaVersion !== "cluster-03-arm-left-1-motion.v1"
  ) {
    return;
  }

  const arm = model.getObjectByName("arm_left_1-1");
  if (!arm) {
    throw new Error('GLB node "arm_left_1-1" was not found for attached parts.');
  }

  for (const attachment of arm1Definition.attachments ?? []) {
    const part = model.getObjectByName(attachment.nodeName);
    const parent = model.getObjectByName(attachment.parentId);
    if (!part) {
      throw new Error(
        `GLB node "${attachment.nodeName}" was not found for arm_left_1 attachment.`,
      );
    }
    if (!parent) {
      throw new Error(
        `GLB node "${attachment.parentId}" was not found for arm_left_1 attachment.`,
      );
    }
    if (part === parent) {
      throw new Error("arm_left_1 attachment cannot point back to its parent.");
    }
    if (part.parent !== parent) {
      // Object3D.attach preserves the CAD-imported world pose while applying
      // the verified CAD parent. head_nen follows arm_left_1; gac_coffee stays
      // in the body frame because Coincident10 is its primary CAD anchor.
      parent.attach(part);
    }
  }
}

function attachClusterConnections(
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
) {
  for (const definition of motionDefinitions) {
    if (definition.schemaVersion !== "cluster-03-box-nen-motion.v1") continue;

    const part = model.getObjectByName(definition.nodeName);
    const parent = model.getObjectByName(definition.parentId);
    if (!part) {
      throw new Error(
        `GLB node "${definition.nodeName}" was not found for box_nen connection.`,
      );
    }
    if (!parent) {
      throw new Error(
        `GLB node "${definition.parentId}" was not found for box_nen connection.`,
      );
    }
    if (part === parent) {
      throw new Error("box_nen connection cannot point a node back to itself.");
    }
    if (part.parent !== parent) {
      // Preserve the exported CAD pose while making the verified body parent
      // explicit. The axial translation is applied after the lower gear
      // coupling, so Concentric28/Parallel15 remain orientation constraints.
      parent.attach(part);
    }
  }
}

function createCircularArcCurve(
  center: THREE.Vector3,
  radius: number,
  startAngle: number,
  deltaAngle: number,
  basisX: THREE.Vector3,
  basisY: THREE.Vector3,
) {
  class CircularArcCurve extends THREE.Curve<THREE.Vector3> {
    constructor() {
      super();
    }

    getPoint(t: number, target = new THREE.Vector3()) {
      const angle = startAngle + deltaAngle * t;
      return target
        .copy(center)
        .addScaledVector(basisX, radius * Math.cos(angle))
        .addScaledVector(basisY, radius * Math.sin(angle));
    }
  }

  return new CircularArcCurve();
}

function createClusterMotionPath(definition: ClusterPathMotionDefinition) {
  const [arcDefinition, lineDefinition] = definition.path.segments;
  const center = new THREE.Vector3(...arcDefinition.center);
  const arcStart = new THREE.Vector3(...arcDefinition.start);
  const arcEnd = new THREE.Vector3(...arcDefinition.end);
  const normal = new THREE.Vector3(...arcDefinition.normal).normalize();
  const basisX = arcStart.clone().sub(center).normalize();
  const basisY = normal.clone().cross(basisX).normalize();
  const arc = createCircularArcCurve(
    center,
    arcDefinition.radius,
    0,
    arcDefinition.sweepRadians,
    basisX,
    basisY,
  );

  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(arc);
  path.add(
    new THREE.LineCurve3(
      new THREE.Vector3(...lineDefinition.start),
      new THREE.Vector3(...lineDefinition.end),
    ),
  );

  const generatedStart = path.getPointAt(0);
  const generatedArcEnd = arc.getPoint(1);
  if (
    generatedStart.distanceTo(arcStart) > 1e-8 ||
    generatedArcEnd.distanceTo(arcEnd) > 1e-8 ||
    generatedArcEnd.distanceTo(
      new THREE.Vector3(...lineDefinition.start),
    ) > 1e-8
  ) {
    throw new Error(
      `${definition.partId} motion path does not reproduce its CAD endpoints.`,
    );
  }
  return path;
}

function createParentLocalGuidePath(
  worldPath: THREE.CurvePath<THREE.Vector3>,
  parent: THREE.Object3D,
) {
  const points = worldPath
    .getPoints(128)
    .map((point) => parent.worldToLocal(point.clone()));
  const guidePath = new THREE.CurvePath<THREE.Vector3>();
  for (let index = 1; index < points.length; index += 1) {
    guidePath.add(new THREE.LineCurve3(points[index - 1], points[index]));
  }
  return guidePath;
}

interface MovingPointOnLineSolution {
  arm2Angle: number;
  residualMeters: number;
}

function wrapAngleRadians(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function angularDistanceRadians(left: number, right: number) {
  return Math.abs(wrapAngleRadians(left - right));
}

function solveMovingPointOnLine({
  sourcePoint,
  driverAxisPoint,
  driverAxis,
  linePoint,
  lineDirection,
  previousAngle,
}: {
  sourcePoint: THREE.Vector3;
  driverAxisPoint: THREE.Vector3;
  driverAxis: THREE.Vector3;
  linePoint: THREE.Vector3;
  lineDirection: THREE.Vector3;
  previousAngle: number;
}): MovingPointOnLineSolution | null {
  const normalizedDriverAxis = driverAxis.clone().normalize();
  const normalizedLineDirection = lineDirection.clone().normalize();
  const lineNormal = normalizedDriverAxis
    .clone()
    .cross(normalizedLineDirection);
  if (lineNormal.lengthSq() <= 1e-20) {
    return null;
  }
  lineNormal.normalize();

  // PathMate14 uses an infinite CAD line. Solve the single angular degree of
  // freedom required to place the driven point on that line; locking the
  // target to lineProgress=0 incorrectly loses the solution mid-stroke.
  const sourceRelative = sourcePoint.clone().sub(driverAxisPoint);
  const sourceParallel = normalizedDriverAxis
    .clone()
    .multiplyScalar(sourceRelative.dot(normalizedDriverAxis));
  const sourcePerpendicular = sourceRelative.clone().sub(sourceParallel);
  const cosineTerm = sourcePerpendicular.dot(lineNormal);
  const sineTerm = normalizedDriverAxis
    .clone()
    .cross(sourcePerpendicular)
    .dot(lineNormal);
  const constant = driverAxisPoint
    .clone()
    .add(sourceParallel)
    .sub(linePoint)
    .dot(lineNormal);
  const amplitude = Math.hypot(cosineTerm, sineTerm);
  if (amplitude <= 1e-12 || Math.abs(-constant) > amplitude + 1e-10) {
    return null;
  }

  const phase = Math.atan2(sineTerm, cosineTerm);
  const offset = Math.acos(
    THREE.MathUtils.clamp(-constant / amplitude, -1, 1),
  );
  const candidates = [phase - offset, phase + offset]
    .map((angle) => unwrapAngleNear(angle, previousAngle))
    .map((angle) => {
      const resolvedPoint = rotatePointAroundAxis(
        sourcePoint,
        driverAxisPoint,
        normalizedDriverAxis,
        angle,
      );
      return {
        arm2Angle: angle,
        residualMeters: Math.abs(
          resolvedPoint.clone().sub(linePoint).dot(lineNormal),
        ),
      };
    });

  candidates.sort(
    (left, right) =>
      angularDistanceRadians(left.arm2Angle, previousAngle) -
        angularDistanceRadians(right.arm2Angle, previousAngle) ||
      left.residualMeters - right.residualMeters,
  );

  const solution = candidates[0];
  return solution && solution.residualMeters <= 1e-7 ? solution : null;
}

interface CalibratedArmLeftSolution {
  motorAngle: number;
  wiperAngle: number;
  camProgress: number;
  arm2Angle: number;
  residualMeters: number;
  limitDistanceMeters: number;
  lineProjectionMeters: number;
  path10ResidualMeters: number;
  limitDistance1Meters: number;
  line10ProjectionMeters: number;
}

function unwrapAngleNear(angle: number, reference: number) {
  let unwrapped = angle;
  while (unwrapped - reference > Math.PI) unwrapped -= Math.PI * 2;
  while (unwrapped - reference < -Math.PI) unwrapped += Math.PI * 2;
  return unwrapped;
}

function rotatePointAroundAxis(
  point: THREE.Vector3,
  pivot: THREE.Vector3,
  axis: THREE.Vector3,
  angle: number,
) {
  return point
    .clone()
    .sub(pivot)
    .applyAxisAngle(axis, angle)
    .add(pivot);
}

function rotateVectorAroundAxis(
  vector: THREE.Vector3,
  axis: THREE.Vector3,
  angle: number,
) {
  return vector.clone().applyAxisAngle(axis, angle);
}

interface ArmLeft1BodyPathSolution {
  angleRadians: number;
  residualMeters: number;
  lineProjectionMeters: number;
}

function solveArmLeft1BodyPathAngle({
  sourcePoint,
  sourceDirection,
  targetPoint,
  rotationAxisPoint,
  rotationAxis,
  pathDelta,
  previousAngle,
}: {
  sourcePoint: THREE.Vector3;
  sourceDirection: THREE.Vector3;
  targetPoint: THREE.Vector3;
  rotationAxisPoint: THREE.Vector3;
  rotationAxis: THREE.Vector3;
  pathDelta: THREE.Vector3;
  previousAngle: number;
}): ArmLeft1BodyPathSolution | null {
  const axis = rotationAxis.clone().normalize();
  const direction = sourceDirection.clone().normalize();
  const movedAxisPoint = rotationAxisPoint.clone().add(pathDelta);
  const sourceRelative = sourcePoint.clone().sub(rotationAxisPoint);
  const targetRelative = targetPoint.clone().sub(movedAxisPoint);
  const quarterTurnDirection = axis.clone().cross(direction);
  const cosineTerm = targetRelative.clone().cross(direction).dot(axis);
  const sineTerm = targetRelative
    .clone()
    .cross(quarterTurnDirection)
    .dot(axis);
  const constant = sourceRelative.clone().cross(direction).dot(axis);
  const amplitude = Math.hypot(cosineTerm, sineTerm);
  if (amplitude <= 1e-12 || Math.abs(constant) > amplitude + 1e-10) {
    return null;
  }

  const phase = Math.atan2(sineTerm, cosineTerm);
  const offset = Math.acos(
    THREE.MathUtils.clamp(-constant / amplitude, -1, 1),
  );
  const candidates = [phase - offset, phase + offset]
    .map((angle) => unwrapAngleNear(angle, previousAngle))
    .map((angle) => {
      const resolvedSourcePoint = rotatePointAroundAxis(
        sourcePoint.clone().add(pathDelta),
        movedAxisPoint,
        axis,
        angle,
      );
      const resolvedDirection = rotateVectorAroundAxis(
        direction,
        axis,
        angle,
      ).normalize();
      const targetOffset = targetPoint.clone().sub(resolvedSourcePoint);
      const lineProjectionMeters = targetOffset.dot(resolvedDirection);
      const residualMeters = targetOffset
        .clone()
        .cross(resolvedDirection)
        .length();
      return {
        angleRadians: angle,
        residualMeters,
        lineProjectionMeters,
      };
    })
    .sort(
      (left, right) =>
        Math.abs(left.angleRadians - previousAngle) -
          Math.abs(right.angleRadians - previousAngle) ||
        left.residualMeters - right.residualMeters,
    );

  const solution = candidates[0];
  return solution && solution.residualMeters <= 1e-7 ? solution : null;
}

function isWithinDistanceRange(
  value: number,
  minimum: number,
  maximum: number,
  tolerance = 1e-8,
) {
  return (
    value >= minimum - tolerance && value <= maximum + tolerance
  );
}

function interpolateMainDriveMotorAngle(
  calibration: MainDriveCalibration,
  progress: number,
) {
  const clampedProgress = THREE.MathUtils.clamp(
    progress,
    calibration.camProgressRange[0],
    calibration.camProgressRange[1],
  );
  const samples = calibration.samples;
  if (clampedProgress <= samples[0].camProgress) {
    return samples[0].motorAngleRadians;
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (clampedProgress > current.camProgress) continue;
    const segmentProgress =
      (clampedProgress - previous.camProgress) /
      (current.camProgress - previous.camProgress);
    return THREE.MathUtils.lerp(
      previous.motorAngleRadians,
      current.motorAngleRadians,
      segmentProgress,
    );
  }

  return samples[samples.length - 1].motorAngleRadians;
}

function limitMainAutoProgressStep(
  currentProgress: number,
  targetProgress: number,
  calibration: MainDriveCalibration | undefined,
) {
  if (!calibration || currentProgress === targetProgress) {
    return targetProgress;
  }

  const currentMotorAngle = interpolateMainDriveMotorAngle(
    calibration,
    currentProgress,
  );
  const targetMotorAngle = interpolateMainDriveMotorAngle(
    calibration,
    targetProgress,
  );
  const motorAngleDelta = Math.abs(targetMotorAngle - currentMotorAngle);
  if (!Number.isFinite(motorAngleDelta)) {
    return targetProgress;
  }

  if (motorAngleDelta <= CLUSTER_MAX_AUTO_MOTOR_STEP_RADIANS) {
    return targetProgress;
  }

  // The calibration curve changes slope near the CAD transition. A linear
  // fraction of the full progress step can therefore still overshoot the
  // angle limit. Find the largest safe progress fraction against the actual
  // interpolated motor angle instead.
  let safeFraction = 0;
  let unsafeFraction = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const fraction = (safeFraction + unsafeFraction) / 2;
    const candidateProgress = THREE.MathUtils.lerp(
      currentProgress,
      targetProgress,
      fraction,
    );
    const candidateMotorAngle = interpolateMainDriveMotorAngle(
      calibration,
      candidateProgress,
    );
    if (
      Math.abs(candidateMotorAngle - currentMotorAngle) <=
      CLUSTER_MAX_AUTO_MOTOR_STEP_RADIANS
    ) {
      safeFraction = fraction;
    } else {
      unsafeFraction = fraction;
    }
  }

  return THREE.MathUtils.lerp(
    currentProgress,
    targetProgress,
    safeFraction,
  );
}

function solveCalibratedArmLeft({
  motorAngle,
  gearRatio,
  gearReverse,
  wiperSourcePoint,
  arm3SourcePoint,
  driverAxisPoint,
  driverAxis,
  wiperPathPoint,
  wiperPathDirection,
  wiperLimitPoint,
  wiperPivot,
  wiperAxis,
  wiperDistanceMinimum,
  wiperDistanceMaximum,
  arm3LineStart,
  arm3LineEnd,
  arm3LimitPoint,
  arm3Pivot,
  arm3Axis,
  arm3DistanceMinimum,
  arm3DistanceMaximum,
  worldPath,
  pathStart,
  camProgress,
  previousArm2Angle,
}: {
  motorAngle: number;
  gearRatio: number;
  gearReverse: boolean;
  wiperSourcePoint: THREE.Vector3;
  arm3SourcePoint: THREE.Vector3;
  driverAxisPoint: THREE.Vector3;
  driverAxis: THREE.Vector3;
  wiperPathPoint: THREE.Vector3;
  wiperPathDirection: THREE.Vector3;
  wiperLimitPoint: THREE.Vector3;
  wiperPivot: THREE.Vector3;
  wiperAxis: THREE.Vector3;
  wiperDistanceMinimum: number;
  wiperDistanceMaximum: number;
  arm3LineStart: THREE.Vector3;
  arm3LineEnd: THREE.Vector3;
  arm3LimitPoint: THREE.Vector3;
  arm3Pivot: THREE.Vector3;
  arm3Axis: THREE.Vector3;
  arm3DistanceMinimum: number;
  arm3DistanceMaximum: number;
  worldPath: THREE.CurvePath<THREE.Vector3>;
  pathStart: THREE.Vector3;
  camProgress: number;
  previousArm2Angle: number;
}): CalibratedArmLeftSolution | null {
  const signedGearRatio = (gearReverse ? -1 : 1) * gearRatio;
  if (Math.abs(signedGearRatio) <= 1e-12) return null;

  const normalizedDriverAxis = driverAxis.clone().normalize();
  const normalizedWiperAxis = wiperAxis.clone().normalize();
  const normalizedArm3Axis = arm3Axis.clone().normalize();
  const normalizedWiperPathDirection = wiperPathDirection.clone().normalize();
  const wiperAngle = signedGearRatio * motorAngle;
  const rotatedPathPoint = rotatePointAroundAxis(
    wiperPathPoint,
    wiperPivot,
    normalizedWiperAxis,
    wiperAngle,
  );
  const rotatedPathDirection = rotateVectorAroundAxis(
    normalizedWiperPathDirection,
    normalizedWiperAxis,
    wiperAngle,
  ).normalize();
  const rotatedLimitPoint = rotatePointAroundAxis(
    wiperLimitPoint,
    wiperPivot,
    normalizedWiperAxis,
    wiperAngle,
  );
  const initialPathOffset = wiperPathPoint
    .clone()
    .sub(wiperLimitPoint)
    .dot(normalizedWiperPathDirection);
  const pathBranchSign = Math.sign(initialPathOffset) || -1;
  const pathDelta = worldPath
    .getPointAt(THREE.MathUtils.clamp(camProgress, 0, 1))
    .sub(pathStart);
  const axisPoint = driverAxisPoint.clone().add(pathDelta);
  const wiperSource = wiperSourcePoint.clone().add(pathDelta);
  const arm3Source = arm3SourcePoint.clone().add(pathDelta);
  const lineNormalVector = normalizedDriverAxis
    .clone()
    .cross(rotatedPathDirection);
  if (lineNormalVector.lengthSq() <= 1e-20) return null;
  const lineNormal = lineNormalVector.normalize();
  const relativeSource = wiperSource.clone().sub(axisPoint);
  const sineVector = normalizedDriverAxis.clone().cross(relativeSource);
  const constant = axisPoint.clone().sub(rotatedPathPoint).dot(lineNormal);
  const cosineTerm = relativeSource.dot(lineNormal);
  const sineTerm = sineVector.dot(lineNormal);
  const amplitude = Math.hypot(cosineTerm, sineTerm);
  if (amplitude <= 1e-12 || Math.abs(-constant) > amplitude + 1e-10) {
    return null;
  }

  const phase = Math.atan2(sineTerm, cosineTerm);
  const offset = Math.acos(
    THREE.MathUtils.clamp(-constant / amplitude, -1, 1),
  );
  const arm2Angles = [
    unwrapAngleNear(phase - offset, previousArm2Angle),
    unwrapAngleNear(phase + offset, previousArm2Angle),
  ];
  const rotatedArm3LineStart = rotatePointAroundAxis(
    arm3LineStart,
    arm3Pivot,
    normalizedArm3Axis,
    wiperAngle,
  );
  const rotatedArm3LineEnd = rotatePointAroundAxis(
    arm3LineEnd,
    arm3Pivot,
    normalizedArm3Axis,
    wiperAngle,
  );
  const arm3LineDirection = rotatedArm3LineEnd
    .clone()
    .sub(rotatedArm3LineStart);
  const arm3LineLength = arm3LineDirection.length();
  if (arm3LineLength <= 1e-12) return null;
  arm3LineDirection.normalize();
  const rotatedArm3LimitPoint = rotatePointAroundAxis(
    arm3LimitPoint,
    arm3Pivot,
    normalizedArm3Axis,
    wiperAngle,
  );

  const candidates = arm2Angles
    .map((arm2Angle) => {
      const resolvedWiperSource = rotatePointAroundAxis(
        wiperSource,
        axisPoint,
        normalizedDriverAxis,
        arm2Angle,
      );
      const path11ResidualMeters = resolvedWiperSource
        .clone()
        .sub(rotatedPathPoint)
        .cross(rotatedPathDirection)
        .length();
      const lineProjectionMeters = resolvedWiperSource
        .clone()
        .sub(rotatedPathPoint)
        .dot(rotatedPathDirection);
      const targetProjectionMeters = rotatedLimitPoint
        .clone()
        .sub(rotatedPathPoint)
        .dot(rotatedPathDirection);
      const signedDistanceAlongLine =
        lineProjectionMeters - targetProjectionMeters;
      const limitDistance2Meters = resolvedWiperSource.distanceTo(
        rotatedLimitPoint,
      );

      const resolvedArm3Source = rotatePointAroundAxis(
        arm3Source,
        axisPoint,
        normalizedDriverAxis,
        arm2Angle,
      );
      const path10ResidualMeters = resolvedArm3Source
        .clone()
        .sub(rotatedArm3LineStart)
        .cross(arm3LineDirection)
        .length();
      const line10ProjectionMeters = resolvedArm3Source
        .clone()
        .sub(rotatedArm3LineStart)
        .dot(arm3LineDirection);
      const limitDistance1Meters = resolvedArm3Source.distanceTo(
        rotatedArm3LimitPoint,
      );

      return {
        motorAngle,
        wiperAngle,
        camProgress,
        arm2Angle,
        residualMeters: path11ResidualMeters,
        limitDistanceMeters: limitDistance2Meters,
        lineProjectionMeters: signedDistanceAlongLine,
        path10ResidualMeters,
        limitDistance1Meters,
        line10ProjectionMeters,
        valid:
          path11ResidualMeters <= 1e-7 &&
          signedDistanceAlongLine * pathBranchSign >= -1e-8 &&
          isWithinDistanceRange(
            limitDistance2Meters,
            wiperDistanceMinimum,
            wiperDistanceMaximum,
          ) &&
          path10ResidualMeters <= 1e-7 &&
          line10ProjectionMeters >=
            -CLUSTER_KINEMATIC_ENDPOINT_TOLERANCE_METERS &&
          line10ProjectionMeters <=
            arm3LineLength + CLUSTER_KINEMATIC_ENDPOINT_TOLERANCE_METERS &&
          isWithinDistanceRange(
            limitDistance1Meters,
            arm3DistanceMinimum,
            arm3DistanceMaximum,
            CLUSTER_KINEMATIC_ENDPOINT_TOLERANCE_METERS,
          ),
      };
    })
    .filter((candidate) => candidate.valid)
    .sort(
      (left, right) =>
        Math.abs(left.arm2Angle - previousArm2Angle) -
          Math.abs(right.arm2Angle - previousArm2Angle) ||
        left.residualMeters - right.residualMeters ||
        left.path10ResidualMeters - right.path10ResidualMeters,
    );

  const solution = candidates[0];
  if (!solution) return null;
  const { valid: _valid, ...resolvedSolution } = solution;
  return resolvedSolution;
}

interface CamState {
  kind: "path";
  nodeName: ClusterPathMotionNodeName;
  part: THREE.Object3D;
  parent: THREE.Object3D;
  basePosition: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  initialAnchorParent: THREE.Vector3;
  worldPath: THREE.CurvePath<THREE.Vector3>;
  guide: THREE.Mesh;
  showGuide: boolean;
  progress: number;
  direction: 1 | -1;
  coupledAngleRadians?: number;
  bodyPathAngleRadians?: number;
}

interface AxisState {
  kind: "axis";
  nodeName: ClusterAxisMotionNodeName;
  part: THREE.Object3D;
  parent: THREE.Object3D;
  basePosition: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  pivotParent: THREE.Vector3;
  axisParent: THREE.Vector3;
  angleRangeRadians: readonly [number, number];
  translationRangeMeters: readonly [number, number];
  progress: number;
  direction: 1 | -1;
  coupledAngleRadians?: number;
  kinematicAngleRangeRadians?: readonly [number, number];
  currentAxialTranslationMeters?: number;
  screwFollowerTranslationMeters?: number;
}

type MotionState = CamState | AxisState;

interface BoxNenSlideState {
  part: THREE.Object3D;
  parent: THREE.Object3D;
  basePosition: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  axisParent: THREE.Vector3;
  translationRangeMeters: readonly [number, number];
  progress: number;
  currentTranslationMeters: number;
}

function createBoxNenSlideState(
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
): BoxNenSlideState | null {
  const definition = motionDefinitions.find(
    (candidate): candidate is ClusterBoxNenMotionDefinition =>
      candidate.schemaVersion === "cluster-03-box-nen-motion.v1",
  );
  if (!definition) return null;

  const part = model.getObjectByName(definition.nodeName);
  const parent = model.getObjectByName(definition.parentId);
  if (!part || !parent) {
    throw new Error("cluster-03 box_nen slide nodes are missing.");
  }

  model.updateMatrixWorld(true);
  const axisPointWorld = new THREE.Vector3(
    ...definition.attachment.targetReference.point,
  );
  const axisWorld = new THREE.Vector3(...definition.attachment.axis).normalize();
  const parentInverse = parent.matrixWorld.clone().invert();
  const axisPointParent = axisPointWorld.clone().applyMatrix4(parentInverse);
  const axisParent = axisPointWorld
    .clone()
    .add(axisWorld)
    .applyMatrix4(parentInverse)
    .sub(axisPointParent)
    .normalize();

  return {
    part,
    parent,
    basePosition: part.position.clone(),
    baseQuaternion: part.quaternion.clone(),
    axisParent,
    translationRangeMeters: definition.motion.translationRangeMeters,
    progress: 0,
    currentTranslationMeters: 0,
  };
}

function applyBoxNenSlideMotion(
  state: BoxNenSlideState,
  translationOverride?: number,
) {
  const translation =
    translationOverride ??
    THREE.MathUtils.lerp(
      state.translationRangeMeters[0],
      state.translationRangeMeters[1],
      THREE.MathUtils.clamp(state.progress, 0, 1),
    );
  state.currentTranslationMeters = translation;
  state.part.position
    .copy(state.basePosition)
    .addScaledVector(state.axisParent, translation);
  state.part.quaternion.copy(state.baseQuaternion);
  state.part.updateMatrixWorld(true);
}

interface ArmLeft1FollowerState {
  motionParent: THREE.Object3D;
  part: THREE.Object3D;
  bodyConnection: ClusterBodyPathConnection;
  slideGuide: ClusterGacCoffeeSlideGuide;
  motionParentBaseWorldMatrix: THREE.Matrix4;
  partBaseWorldMatrix: THREE.Matrix4;
  arcEndProgress: number;
  arcEndSlideDistanceMeters: number | null;
}

function createArmLeft1FollowerState(
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
): ArmLeft1FollowerState | null {
  const arm1Definition = motionDefinitions.find(
    (definition) =>
      definition.partId === "arm_left_1-1" &&
      definition.schemaVersion === "cluster-03-arm-left-1-motion.v1",
  );
  if (
    !arm1Definition ||
    arm1Definition.schemaVersion !== "cluster-03-arm-left-1-motion.v1"
  ) {
    return null;
  }
  const bodyConnection = arm1Definition.bodyConnection;
  const arcSegment = arm1Definition.path.segments[0];
  if (
    !bodyConnection ||
    arcSegment.kind !== "arc" ||
    arm1Definition.path.lengthMeters <= 0
  ) {
    return null;
  }
  const gacAttachment = (arm1Definition.attachments ?? []).find(
    (attachment) =>
      attachment.partId === "gac_coffee-1" &&
      attachment.motionParentId === "arm_left_1-1" &&
      attachment.motionRelation === "straight-body-bar-translation" &&
      attachment.slideGuide?.kind === "straight-translation",
  );
  const motionParentId = gacAttachment?.motionParentId;
  if (!gacAttachment || !motionParentId || !gacAttachment.slideGuide) return null;

  const motionParent = model.getObjectByName(motionParentId);
  const part = model.getObjectByName(gacAttachment.nodeName);
  if (!motionParent || !part) {
    throw new Error(
      "cluster-03 gac_coffee straight-slide nodes are missing.",
    );
  }

  model.updateMatrixWorld(true);
  return {
    motionParent,
    part,
    bodyConnection,
    slideGuide: gacAttachment.slideGuide,
    motionParentBaseWorldMatrix: motionParent.matrixWorld.clone(),
    partBaseWorldMatrix: part.matrixWorld.clone(),
    arcEndProgress: arcSegment.lengthMeters / arm1Definition.path.lengthMeters,
    arcEndSlideDistanceMeters: null,
  };
}

function applyAxisMotionAtAngle(
  state: AxisState,
  angle: number,
  axialTranslationOverride?: number,
) {
  const axialTranslation =
    axialTranslationOverride ??
    THREE.MathUtils.lerp(
      state.translationRangeMeters[0],
      state.translationRangeMeters[1],
      THREE.MathUtils.clamp(state.progress, 0, 1),
    );
  state.currentAxialTranslationMeters = axialTranslation;
  const deltaRotation = new THREE.Quaternion().setFromAxisAngle(
    state.axisParent,
    angle,
  );
  state.part.position
    .copy(state.basePosition)
    .sub(state.pivotParent)
    .applyQuaternion(deltaRotation)
    .add(state.pivotParent)
    .addScaledVector(state.axisParent, axialTranslation);
  state.part.quaternion
    .copy(state.baseQuaternion)
    .premultiply(deltaRotation);
  state.part.updateMatrixWorld(true);
}

function applyWorldAxisRotation(
  part: THREE.Object3D,
  axisPointWorld: THREE.Vector3,
  axisWorld: THREE.Vector3,
  angle: number,
) {
  const parent = part.parent;
  if (!parent) return;

  const normalizedAxis = axisWorld.clone().normalize();
  const currentPositionWorld = part.getWorldPosition(new THREE.Vector3());
  const currentQuaternionWorld = part.getWorldQuaternion(
    new THREE.Quaternion(),
  );
  const deltaRotation = new THREE.Quaternion().setFromAxisAngle(
    normalizedAxis,
    angle,
  );
  const targetPositionWorld = currentPositionWorld
    .sub(axisPointWorld)
    .applyQuaternion(deltaRotation)
    .add(axisPointWorld);
  const targetQuaternionWorld = deltaRotation
    .clone()
    .multiply(currentQuaternionWorld);
  const parentQuaternionWorld = parent.getWorldQuaternion(
    new THREE.Quaternion(),
  );
  part.position.copy(parent.worldToLocal(targetPositionWorld));
  part.quaternion.copy(
    parentQuaternionWorld.invert().multiply(targetQuaternionWorld),
  );
  part.updateMatrixWorld(true);
}

function applyMotionState(state: MotionState, progress: number) {
  if (state.kind === "axis") {
    const angle = THREE.MathUtils.lerp(
      state.angleRangeRadians[0],
      state.angleRangeRadians[1],
      THREE.MathUtils.clamp(progress, 0, 1),
    );
    applyAxisMotionAtAngle(state, angle);
    return;
  }

  const targetAnchor = state.parent.worldToLocal(
    state.worldPath.getPointAt(progress).clone(),
  );
  state.part.position
    .copy(state.basePosition)
    .add(targetAnchor.sub(state.initialAnchorParent));
  state.part.quaternion.copy(state.baseQuaternion);
  state.part.updateMatrixWorld(true);
}

function resolveArmLeft1WorldMatrixAtProgress(
  model: THREE.Group,
  states: MotionState[],
  follower: ArmLeft1FollowerState,
  progress: number,
) {
  const armState = states.find(
    (state): state is CamState =>
      state.nodeName === "arm_left_1-1" && state.kind === "path",
  );
  const driverState = states.find(
    (state): state is CamState =>
      state.nodeName === "oc_left-1" && state.kind === "path",
  );
  if (!armState || !driverState) return null;

  const savedPosition = armState.part.position.clone();
  const savedQuaternion = armState.part.quaternion.clone();
  const savedScale = armState.part.scale.clone();
  const savedBodyPathAngle = armState.bodyPathAngleRadians;
  const targetProgress = THREE.MathUtils.clamp(progress, 0, 1);
  const pathStart = driverState.worldPath.getPointAt(0).clone();
  const pathDelta = driverState.worldPath
    .getPointAt(targetProgress)
    .sub(pathStart);
  const bodyConnection = follower.bodyConnection;
  const bodyPathSolution = solveArmLeft1BodyPathAngle({
    sourcePoint: new THREE.Vector3(...bodyConnection.sourcePoint),
    sourceDirection: new THREE.Vector3(...bodyConnection.sourceDirection),
    targetPoint: new THREE.Vector3(...bodyConnection.targetReferencePoint),
    rotationAxisPoint: new THREE.Vector3(
      ...bodyConnection.rotationAxis.point,
    ),
    rotationAxis: new THREE.Vector3(...bodyConnection.rotationAxis.axis),
    pathDelta,
    previousAngle: savedBodyPathAngle ?? 0,
  });
  if (!bodyPathSolution) return null;

  applyMotionState(armState, targetProgress);
  model.updateMatrixWorld(true);
  const bodyPathAxisPoint = new THREE.Vector3(
    ...bodyConnection.rotationAxis.point,
  ).add(pathDelta);
  const bodyPathAxis = new THREE.Vector3(
    ...bodyConnection.rotationAxis.axis,
  ).normalize();
  applyWorldAxisRotation(
    armState.part,
    bodyPathAxisPoint,
    bodyPathAxis,
    bodyPathSolution.angleRadians,
  );
  armState.bodyPathAngleRadians = bodyPathSolution.angleRadians;
  model.updateMatrixWorld(true);
  const targetWorldMatrix = armState.part.matrixWorld.clone();

  armState.part.position.copy(savedPosition);
  armState.part.quaternion.copy(savedQuaternion);
  armState.part.scale.copy(savedScale);
  armState.bodyPathAngleRadians = savedBodyPathAngle;
  armState.part.updateMatrixWorld(true);
  model.updateMatrixWorld(true);
  return targetWorldMatrix;
}

function applyArmLeft1FollowerMotion(
  model: THREE.Group,
  states: MotionState[],
  follower: ArmLeft1FollowerState | null,
  mainProgress: number,
) {
  if (!follower) return;

  model.updateMatrixWorld(true);
  const isArcPushPhase = mainProgress <= follower.arcEndProgress;
  const slideAxis = new THREE.Vector3(...follower.slideGuide.axis).normalize();
  const drivenNormal = new THREE.Vector3(
    ...follower.slideGuide.contact.drivenNormal,
  ).normalize();
  const driverPoint = new THREE.Vector3(
    ...follower.slideGuide.contact.driverPoint,
  );
  const slideDenominator = drivenNormal.dot(slideAxis);
  if (Math.abs(slideDenominator) <= 1e-8) return;

  const resolveSlideDistance = (armWorldMatrix: THREE.Matrix4) => {
    const motionDelta = armWorldMatrix
      .clone()
      .multiply(follower.motionParentBaseWorldMatrix.clone().invert());
    const currentDriverPoint = driverPoint.clone().applyMatrix4(motionDelta);
    return drivenNormal.dot(currentDriverPoint.sub(driverPoint)) / slideDenominator;
  };

  let slideDistanceMeters: number;
  if (isArcPushPhase) {
    // Arc3 is the push phase. Tangent3 gives the driven plane normal; its
    // projection onto Coincident10 gives a fixed body-bar slide axis. GAC
    // therefore translates without inheriting the arm's rotation or pose.
    slideDistanceMeters = resolveSlideDistance(
      follower.motionParent.matrixWorld,
    );
  } else {
    // Line1 continues along the body_may groove. Hold GAC at the distance
    // reached at the end of Arc3 so only the arm-side contact/connector moves.
    if (follower.arcEndSlideDistanceMeters === null) {
      const arcEndArmWorldMatrix = resolveArmLeft1WorldMatrixAtProgress(
        model,
        states,
        follower,
        follower.arcEndProgress,
      );
      if (!arcEndArmWorldMatrix) return;
      follower.arcEndSlideDistanceMeters = resolveSlideDistance(
        arcEndArmWorldMatrix,
      );
    }
    slideDistanceMeters = follower.arcEndSlideDistanceMeters;
  }

  const targetWorldMatrix = follower.partBaseWorldMatrix.clone();
  const targetWorldPosition = new THREE.Vector3()
    .setFromMatrixPosition(follower.partBaseWorldMatrix)
    .addScaledVector(slideAxis, slideDistanceMeters);
  targetWorldMatrix.setPosition(targetWorldPosition);

  const parent = follower.part.parent ?? model;
  const targetLocalMatrix = parent.matrixWorld
    .clone()
    .invert()
    .multiply(targetWorldMatrix);
  targetLocalMatrix.decompose(
    follower.part.position,
    follower.part.quaternion,
    follower.part.scale,
  );
  follower.part.updateMatrixWorld(true);
}

function applyLowerGearMotorConnection(
  states: MotionState[],
  motionDefinitions: ClusterMotionDefinition[],
) {
  // The CAD pitch remains 4 mm per revolution. The viewer exposes six
  // input revolutions over one progress cycle so the lower slide is visible;
  // GearMate4 still resolves the motor-to-shaft ratio before translation.
  const lowerDriveRevolutions = 6;
  const motorDefinition = motionDefinitions.find(
    (definition) => definition.partId === "gear_motor_nen-1",
  );
  const motorState = states.find(
    (state): state is AxisState =>
      state.nodeName === "gear_motor_nen-1" && state.kind === "axis",
  );
  if (
    !motorDefinition ||
    !motorState ||
    !("gear" in motorDefinition) ||
    !motorDefinition.gear
  ) {
    return;
  }
  const axisMotorDefinition = motorDefinition as ClusterAxisMotionDefinition;
  const motorGear = axisMotorDefinition.gear;
  if (!motorGear) return;

  const motorProgress = THREE.MathUtils.clamp(motorState.progress, 0, 1);
  const motorAngle = THREE.MathUtils.lerp(
    axisMotorDefinition.motion.angleRangeRadians[0],
    axisMotorDefinition.motion.angleRangeRadians[1],
    motorProgress,
  ) * lowerDriveRevolutions;
  applyAxisMotionAtAngle(motorState, motorAngle);
  motorState.coupledAngleRadians = motorAngle;

  const signedDrivenRatio =
    (motorGear.reverse ? -1 : 1) * motorGear.ratio;
  const drivenGearAngle = signedDrivenRatio * motorAngle;
  const gearState = states.find(
    (state): state is AxisState =>
      state.nodeName === "gear_nen-1" && state.kind === "axis",
  );
  if (gearState) {
    gearState.coupledAngleRadians = drivenGearAngle;
    applyAxisMotionAtAngle(gearState, drivenGearAngle);
  }

  const shaftState = states.find(
    (state): state is AxisState =>
      state.nodeName === "truc_nen-1" && state.kind === "axis",
  );
  if (shaftState) {
    const shaftAngle = -drivenGearAngle;
    const shaftRevolutions = Math.abs(shaftAngle) / (Math.PI * 2);
    const shaftTranslation = THREE.MathUtils.lerp(
      shaftState.translationRangeMeters[0],
      shaftState.translationRangeMeters[1],
      shaftRevolutions,
    );
    // Keep the shaft as a rotation-only visual part. box_nen consumes the
    // screw displacement calculated from this same gear/shaft relation.
    shaftState.screwFollowerTranslationMeters = shaftTranslation;
    shaftState.coupledAngleRadians = shaftAngle;
    applyAxisMotionAtAngle(shaftState, shaftAngle, 0);
  }
}

function applyMainGearMotorConnection(
  states: MotionState[],
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
) {
  const arm1Definition = motionDefinitions.find(
    (definition) => definition.partId === "arm_left_1-1",
  );
  const arm2Definition = motionDefinitions.find(
    (definition) => definition.partId === "arm_left_2-1",
  );
  const arm3Definition = motionDefinitions.find(
    (definition) => definition.partId === "arm_left_3-1",
  );
  const wiperDefinition = motionDefinitions.find(
    (definition) => definition.partId === "wiper_gear-1",
  );
  if (
    !arm1Definition ||
    !arm2Definition ||
    !arm3Definition ||
    !wiperDefinition ||
    !("connection" in arm2Definition) ||
    !arm2Definition.connection ||
    !("wiperConnection" in arm2Definition) ||
    !arm2Definition.wiperConnection
  ) {
    return;
  }

  const arm1PathDefinition = arm1Definition as ClusterPathMotionDefinition;
  const arm2PathDefinition = arm2Definition as ClusterPathMotionDefinition;
  const wiperPathDefinition = arm2PathDefinition.wiperConnection;
  if (!wiperPathDefinition || !arm1PathDefinition.bodyConnection) return;
  const wiperAxisDefinition = wiperDefinition as ClusterAxisMotionDefinition;

  const arm1State = states.find(
    (state): state is CamState =>
      state.nodeName === "arm_left_1-1" && state.kind === "path",
  );
  const arm2State = states.find(
    (state): state is CamState =>
      state.nodeName === "arm_left_2-1" && state.kind === "path",
  );
  const arm3State = states.find(
    (state): state is AxisState =>
      state.nodeName === "arm_left_3-1" && state.kind === "axis",
  );
  const wiperState = states.find(
    (state): state is AxisState =>
      state.nodeName === "wiper_gear-1" && state.kind === "axis",
  );
  const shaftState = states.find(
    (state): state is AxisState =>
      state.nodeName === "truc_chinh-1" && state.kind === "axis",
  );
  const gearMotorDefinition = motionDefinitions.find(
    (definition) => definition.partId === "gear_motor_chinh-1",
  );
  const gearMotorState = states.find(
    (state): state is AxisState =>
      state.nodeName === "gear_motor_chinh-1" && state.kind === "axis",
  );
  const ocLeftState = states.find(
    (state): state is CamState =>
      state.nodeName === "oc_left-1" && state.kind === "path",
  );
  if (
    !arm1State ||
    !arm2State ||
    !arm3State ||
    !wiperState ||
    !ocLeftState ||
    !gearMotorState ||
    !gearMotorDefinition ||
    !("gear" in gearMotorDefinition) ||
    !gearMotorDefinition.gear
  ) {
    return;
  }
  const axisGearMotorDefinition =
    gearMotorDefinition as ClusterAxisMotionDefinition;
  const gearMotor = axisGearMotorDefinition.gear;
  if (!gearMotor || !gearMotor.driveCalibration) return;

  const driveCalibration = gearMotor.driveCalibration;
  const arm2Connection = arm2PathDefinition.connection;
  if (!arm2Connection || !arm2Connection.limit) return;

  const driverAxis = arm2Connection.driverAxis;
  const wiperSourcePoint = new THREE.Vector3(
    ...wiperPathDefinition.sourcePoint,
  );
  const arm3SourcePoint = new THREE.Vector3(...arm2Connection.sourcePoint);
  const driverAxisPoint = new THREE.Vector3(...driverAxis.point);
  const driverAxisVector = new THREE.Vector3(...driverAxis.axis);
  const wiperPathPoint = new THREE.Vector3(
    ...wiperPathDefinition.targetPath.point,
  );
  const wiperPathDirection = new THREE.Vector3(
    ...wiperPathDefinition.targetPath.direction,
  );
  const wiperLimitPoint = new THREE.Vector3(
    ...wiperPathDefinition.limit.targetPoint,
  );
  const wiperPivot = new THREE.Vector3(...wiperAxisDefinition.pivot.point);
  const wiperAxis = new THREE.Vector3(...wiperAxisDefinition.pivot.axis);
  const arm3AxisDefinition = arm3Definition as ClusterAxisMotionDefinition;
  const arm3Pivot = new THREE.Vector3(...arm3AxisDefinition.pivot.point);
  const arm3Axis = new THREE.Vector3(...arm3AxisDefinition.pivot.axis);
  const arm3LineStart = new THREE.Vector3(
    ...arm2Connection.targetPath.start,
  );
  const arm3LineEnd = new THREE.Vector3(...arm2Connection.targetPath.end);
  const arm3LimitPoint = new THREE.Vector3(
    ...arm2Connection.limit.targetPoint,
  );
  const pathStart = ocLeftState.worldPath.getPointAt(0).clone();

  const mainProgress = THREE.MathUtils.clamp(gearMotorState.progress, 0, 1);
  const pathDelta = ocLeftState.worldPath
    .getPointAt(mainProgress)
    .sub(pathStart);
  const bodyConnection = arm1PathDefinition.bodyConnection;
  const bodyPathSolution = solveArmLeft1BodyPathAngle({
    sourcePoint: new THREE.Vector3(...bodyConnection.sourcePoint),
    sourceDirection: new THREE.Vector3(...bodyConnection.sourceDirection),
    targetPoint: new THREE.Vector3(...bodyConnection.targetReferencePoint),
    rotationAxisPoint: new THREE.Vector3(
      ...bodyConnection.rotationAxis.point,
    ),
    rotationAxis: new THREE.Vector3(...bodyConnection.rotationAxis.axis),
    pathDelta,
    previousAngle: arm1State.bodyPathAngleRadians ?? 0,
  });
  if (!bodyPathSolution || bodyPathSolution.residualMeters > 1e-7) return;

  const motorAngle = interpolateMainDriveMotorAngle(
    driveCalibration,
    mainProgress,
  );
  const solution = solveCalibratedArmLeft({
    motorAngle,
    gearRatio: gearMotor.ratio,
    gearReverse: gearMotor.reverse,
    wiperSourcePoint,
    arm3SourcePoint,
    driverAxisPoint,
    driverAxis: driverAxisVector,
    wiperPathPoint,
    wiperPathDirection,
    wiperLimitPoint,
    wiperPivot,
    wiperAxis,
    wiperDistanceMinimum: wiperPathDefinition.limit.minimumDistanceMeters,
    wiperDistanceMaximum: wiperPathDefinition.limit.maximumDistanceMeters,
    arm3LineStart,
    arm3LineEnd,
    arm3LimitPoint,
    arm3Pivot,
    arm3Axis,
    arm3DistanceMinimum: arm2Connection.limit.minimumDistanceMeters,
    arm3DistanceMaximum: arm2Connection.limit.maximumDistanceMeters,
    worldPath: ocLeftState.worldPath,
    pathStart,
    camProgress: mainProgress,
    previousArm2Angle: arm2State.coupledAngleRadians ?? 0,
  });
  if (
    !solution ||
    solution.residualMeters > 1e-7 ||
    solution.path10ResidualMeters > 1e-7
  ) {
    return;
  }

  gearMotorState.kinematicAngleRangeRadians =
    driveCalibration.motorAngleRangeRadians;

  gearMotorState.coupledAngleRadians = solution.motorAngle;
  applyAxisMotionAtAngle(gearMotorState, solution.motorAngle);
  wiperState.coupledAngleRadians = solution.wiperAngle;
  applyAxisMotionAtAngle(wiperState, solution.wiperAngle);
  arm3State.coupledAngleRadians = solution.wiperAngle;
  applyAxisMotionAtAngle(arm3State, solution.wiperAngle);
  if (shaftState) {
    shaftState.coupledAngleRadians = solution.wiperAngle;
    applyAxisMotionAtAngle(shaftState, solution.wiperAngle);
  }

  const camProgress = mainProgress;
  states.forEach((state) => {
    if (
      state.kind === "path" &&
      (state.nodeName === "oc_left-1" ||
        state.nodeName === "arm_left_1-1" ||
        state.nodeName === "arm_left_2-1")
    ) {
      state.progress = camProgress;
      applyMotionState(state, camProgress);
    }
  });

  model.updateMatrixWorld(true);
  // The path-follow pose above restores arm_left_1 from its base transform and
  // applies the same translation as oc_left.  Apply the second Mate-like
  // constraint afterwards: Concentric1 keeps the arm on the oc axis while the
  // arm sketch line is rotated through body_may's path reference point.  Doing
  // this before applyMotionState would silently discard the connection.
  const bodyPathAxisPoint = new THREE.Vector3(
    ...bodyConnection.rotationAxis.point,
  ).add(pathDelta);
  const bodyPathAxis = new THREE.Vector3(
    ...bodyConnection.rotationAxis.axis,
  ).normalize();
  applyWorldAxisRotation(
    arm1State.part,
    bodyPathAxisPoint,
    bodyPathAxis,
    bodyPathSolution.angleRadians,
  );
  arm1State.bodyPathAngleRadians = bodyPathSolution.angleRadians;
  model.updateMatrixWorld(true);

  const driverAxisPointWorld = ocLeftState.part.localToWorld(
    new THREE.Vector3(...driverAxis.localPoint),
  );
  const driverAxisEndWorld = ocLeftState.part.localToWorld(
    new THREE.Vector3(...driverAxis.localPoint).add(
      new THREE.Vector3(...driverAxis.localAxis),
    ),
  );
  const driverAxisWorld = driverAxisEndWorld
    .sub(driverAxisPointWorld)
    .normalize();

  arm2State.coupledAngleRadians = solution.arm2Angle;
  applyWorldAxisRotation(
    arm2State.part,
    driverAxisPointWorld,
    driverAxisWorld,
    solution.arm2Angle,
  );
}

function applyMainRightArmConnection(
  states: MotionState[],
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
  mainProgress: number,
) {
  const right1Definition = motionDefinitions.find(
    (definition) => definition.partId === "arm_right_1-1",
  );
  const right2Definition = motionDefinitions.find(
    (definition) => definition.partId === "arm_right_2-1",
  );
  const right3Definition = motionDefinitions.find(
    (definition) => definition.partId === "arm_right_3-1",
  );
  const ocRightState = states.find(
    (state): state is CamState =>
      state.nodeName === "oc_right-1" && state.kind === "path",
  );
  const right1State = states.find(
    (state): state is CamState =>
      state.nodeName === "arm_right_1-1" && state.kind === "path",
  );
  const right2State = states.find(
    (state): state is CamState =>
      state.nodeName === "arm_right_2-1" && state.kind === "path",
  );
  const right3State = states.find(
    (state): state is AxisState =>
      state.nodeName === "arm_right_3-1" && state.kind === "axis",
  );
  const shaftState = states.find(
    (state): state is AxisState =>
      state.nodeName === "truc_chinh-1" && state.kind === "axis",
  );
  if (
    !right1Definition ||
    !right2Definition ||
    !right3Definition ||
    right1Definition.schemaVersion !==
      "cluster-03-arm-right-1-motion.v1" ||
    right2Definition.schemaVersion !==
      "cluster-03-arm-right-2-motion.v1" ||
    right3Definition.schemaVersion !==
      "cluster-03-arm-right-3-motion.v1" ||
    !right1State ||
    !right2State ||
    !right3State ||
    !ocRightState
  ) {
    return;
  }

  const right1PathDefinition = right1Definition as ClusterPathMotionDefinition;
  const right2PathDefinition = right2Definition as ClusterPathMotionDefinition;
  const right3AxisDefinition = right3Definition as ClusterAxisMotionDefinition;
  const right1BodyConnection = right1PathDefinition.bodyConnection;
  const right2Connection = right2PathDefinition.connection;
  if (!right1BodyConnection || !right2Connection) return;

  const progress = THREE.MathUtils.clamp(mainProgress, 0, 1);
  right1State.progress = progress;
  right2State.progress = progress;
  applyMotionState(right1State, progress);
  applyMotionState(right2State, progress);

  const shaftAngle =
    shaftState?.coupledAngleRadians ??
    (shaftState
      ? THREE.MathUtils.lerp(
          shaftState.angleRangeRadians[0],
          shaftState.angleRangeRadians[1],
          progress,
        )
      : THREE.MathUtils.lerp(
          right3State.angleRangeRadians[0],
          right3State.angleRangeRadians[1],
          progress,
        ));
  right3State.coupledAngleRadians = shaftAngle;
  applyAxisMotionAtAngle(right3State, shaftAngle);
  model.updateMatrixWorld(true);

  const pathStart = ocRightState.worldPath.getPointAt(0).clone();
  const pathDelta = ocRightState.worldPath.getPointAt(progress).sub(pathStart);
  const bodyPathSolution = solveArmLeft1BodyPathAngle({
    sourcePoint: new THREE.Vector3(...right1BodyConnection.sourcePoint),
    sourceDirection: new THREE.Vector3(...right1BodyConnection.sourceDirection),
    targetPoint: new THREE.Vector3(
      ...right1BodyConnection.targetReferencePoint,
    ),
    rotationAxisPoint: new THREE.Vector3(
      ...right1BodyConnection.rotationAxis.point,
    ),
    rotationAxis: new THREE.Vector3(...right1BodyConnection.rotationAxis.axis),
    pathDelta,
    previousAngle: right1State.bodyPathAngleRadians ?? 0,
  });
  if (!bodyPathSolution || bodyPathSolution.residualMeters > 1e-7) return;

  const bodyPathAxisPoint = new THREE.Vector3(
    ...right1BodyConnection.rotationAxis.point,
  ).add(pathDelta);
  applyWorldAxisRotation(
    right1State.part,
    bodyPathAxisPoint,
    new THREE.Vector3(...right1BodyConnection.rotationAxis.axis),
    bodyPathSolution.angleRadians,
  );
  right1State.bodyPathAngleRadians = bodyPathSolution.angleRadians;
  model.updateMatrixWorld(true);

  const driverAxisPointWorld = ocRightState.part.localToWorld(
    new THREE.Vector3(...right2Connection.driverAxis.localPoint),
  );
  const driverAxisEndWorld = ocRightState.part.localToWorld(
    new THREE.Vector3(...right2Connection.driverAxis.localPoint).add(
      new THREE.Vector3(...right2Connection.driverAxis.localAxis),
    ),
  );
  const driverAxisWorld = driverAxisEndWorld
    .sub(driverAxisPointWorld)
    .normalize();
  const sourcePointWorld = right2State.part.localToWorld(
    new THREE.Vector3(...right2Connection.sourceLocalPoint),
  );
  const arm3Pivot = new THREE.Vector3(...right3AxisDefinition.pivot.point);
  const arm3Axis = new THREE.Vector3(
    ...right3AxisDefinition.pivot.axis,
  ).normalize();
  const targetLineStart = rotatePointAroundAxis(
    new THREE.Vector3(...right2Connection.targetPath.start),
    arm3Pivot,
    arm3Axis,
    shaftAngle,
  );
  const targetLineDirection = rotateVectorAroundAxis(
    new THREE.Vector3(...right2Connection.targetPath.direction),
    arm3Axis,
    shaftAngle,
  ).normalize();
  const lineSolution = solveMovingPointOnLine({
    sourcePoint: sourcePointWorld,
    driverAxisPoint: driverAxisPointWorld,
    driverAxis: driverAxisWorld,
    linePoint: targetLineStart,
    lineDirection: targetLineDirection,
    previousAngle: right2State.coupledAngleRadians ?? 0,
  });
  if (!lineSolution || lineSolution.residualMeters > 1e-7) return;

  right2State.coupledAngleRadians = lineSolution.arm2Angle;
  applyWorldAxisRotation(
    right2State.part,
    driverAxisPointWorld,
    driverAxisWorld,
    lineSolution.arm2Angle,
  );
}

function disposeMotionState(state: MotionState) {
  if (state.kind === "path") {
    state.parent.remove(state.guide);
    state.guide.geometry.dispose();
    if (Array.isArray(state.guide.material)) {
      state.guide.material.forEach((material) => material.dispose());
    } else {
      state.guide.material.dispose();
    }
  }
}

function fitCameraToCluster(
  camera: THREE.Camera,
  controls: OrbitControlsImpl,
  bounds: THREE.Box3,
  zoomLevel: number,
) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;

  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxSize) || maxSize <= 0) return;

  const fitHeightDistance =
    maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  const fitWidthDistance = fitHeightDistance / Math.max(camera.aspect, 0.01);
  const distance =
    1.4 * Math.max(fitHeightDistance, fitWidthDistance) * Math.pow(0.82, zoomLevel);
  const direction = new THREE.Vector3(1, 0.72, 1).normalize();

  camera.near = Math.max(maxSize / 1000, 0.001);
  camera.far = Math.max(maxSize * 100, 100);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = Math.max(maxSize * 0.12, 0.05);
  controls.maxDistance = Math.max(maxSize * 8, 10);
  controls.update();
}

function isLowerDriveNode(nodeName: MotionState["nodeName"]) {
  return (
    nodeName === "gear_motor_nen-1" ||
    nodeName === "gear_nen-1" ||
    nodeName === "truc_nen-1"
  );
}

function applyIndependentMotion(
  states: MotionState[],
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
  mainProgress: number,
  lowerProgress: number,
  armLeft1Follower: ArmLeft1FollowerState | null = null,
  boxNenSlide: BoxNenSlideState | null = null,
) {
  states.forEach((state) => {
    const progress = isLowerDriveNode(state.nodeName)
      ? lowerProgress
      : mainProgress;
    state.progress = THREE.MathUtils.clamp(progress, 0, 1);
    applyMotionState(state, state.progress);
  });
  const lowerShaftState = states.find(
    (state): state is AxisState =>
      state.nodeName === "truc_nen-1" && state.kind === "axis",
  );
  if (lowerShaftState) {
    lowerShaftState.screwFollowerTranslationMeters = undefined;
  }
  applyLowerGearMotorConnection(states, motionDefinitions);
  if (boxNenSlide) {
    boxNenSlide.progress = THREE.MathUtils.clamp(lowerProgress, 0, 1);
    const shaftState = states.find(
      (state): state is AxisState =>
        state.nodeName === "truc_nen-1" && state.kind === "axis",
    );
    // Follow the resolved shaft translation after GearMate4/Screw2 coupling.
    // This keeps box_nen synchronized with the actual gear ratio rather than
    // assuming the lower motor progress is a one-to-one shaft displacement.
    applyBoxNenSlideMotion(
      boxNenSlide,
      shaftState?.screwFollowerTranslationMeters ??
        shaftState?.currentAxialTranslationMeters,
    );
  }
  applyMainGearMotorConnection(states, model, motionDefinitions);
  applyMainRightArmConnection(
    states,
    model,
    motionDefinitions,
    mainProgress,
  );
  applyArmLeft1FollowerMotion(
    model,
    states,
    armLeft1Follower,
    mainProgress,
  );
}

export interface ClusterMotionRuntime {
  apply(mainProgress: number, lowerProgress: number): void;
  advance(
    delta: number,
    mainAutoMotion: boolean,
    lowerAutoMotion: boolean,
  ): {
    mainProgress: number;
    lowerProgress: number;
  };
  setGuidesVisible(visible: boolean): void;
  dispose(): void;
}

export interface ClusterMotionRuntimeOptions {
  initialMainProgress: number;
  initialLowerProgress: number;
  showGuides?: boolean;
}

export function createClusterMotionRuntime(
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
  options: ClusterMotionRuntimeOptions,
): ClusterMotionRuntime {
  const states: MotionState[] = [];
  let armLeft1Follower: ArmLeft1FollowerState | null = null;
  let boxNenSlide: BoxNenSlideState | null = null;
  let disposed = false;

  try {
    attachArmLeft1Followers(model, motionDefinitions);
    attachClusterConnections(model, motionDefinitions);
    model.updateMatrixWorld(true);
    boxNenSlide = createBoxNenSlideState(model, motionDefinitions);
    armLeft1Follower = createArmLeft1FollowerState(
      model,
      motionDefinitions,
    );

    for (const motionDefinition of motionDefinitions) {
      const part = model.getObjectByName(motionDefinition.nodeName);
      if (!part) {
        throw new Error(
          `GLB node "${motionDefinition.nodeName}" was not found.`,
        );
      }

      if (motionDefinition.schemaVersion === "cluster-03-box-nen-motion.v1") {
        continue;
      }

      const parent = part.parent ?? model;
      parent.updateMatrixWorld(true);
      part.updateMatrixWorld(true);

      if (
        motionDefinition.schemaVersion ===
          "cluster-03-truc-chinh-motion.v1" ||
        motionDefinition.schemaVersion === "cluster-03-truc-nen-motion.v1" ||
        motionDefinition.schemaVersion ===
          "cluster-03-gear-motor-chinh-motion.v1" ||
        motionDefinition.schemaVersion ===
          "cluster-03-gear-motor-nen-motion.v1" ||
        motionDefinition.schemaVersion === "cluster-03-gear-nen-motion.v1" ||
        motionDefinition.schemaVersion ===
          "cluster-03-arm-left-3-motion.v1" ||
        motionDefinition.schemaVersion ===
          "cluster-03-arm-right-3-motion.v1" ||
        motionDefinition.schemaVersion === "cluster-03-wiper-gear-motion.v1"
      ) {
        const pivotWorld = new THREE.Vector3(...motionDefinition.pivot.point);
        const axisWorld = new THREE.Vector3(...motionDefinition.pivot.axis).normalize();
        const parentInverse = parent.matrixWorld.clone().invert();
        const pivotParent = pivotWorld.clone().applyMatrix4(parentInverse);
        const axisParent = axisWorld
          .clone()
          .add(pivotWorld)
          .applyMatrix4(parentInverse)
          .sub(pivotParent)
          .normalize();

        states.push({
          kind: "axis",
          nodeName: motionDefinition.nodeName,
          part,
          parent,
          basePosition: part.position.clone(),
          baseQuaternion: part.quaternion.clone(),
          pivotParent,
          axisParent,
          angleRangeRadians: motionDefinition.motion.angleRangeRadians,
          translationRangeMeters:
            motionDefinition.motion.translationRangeMeters ?? [0, 0],
          progress: THREE.MathUtils.clamp(
            isLowerDriveNode(motionDefinition.nodeName)
              ? options.initialLowerProgress
              : options.initialMainProgress,
            0,
            1,
          ),
          direction: 1,
        });
        continue;
      }

      const pathMotionDefinition =
        motionDefinition as ClusterPathMotionDefinition;
      const worldPath = createClusterMotionPath(pathMotionDefinition);
      const anchorLocal = new THREE.Vector3(
        ...pathMotionDefinition.anchor.localPoint,
      );
      const initialAnchorParent = parent.worldToLocal(
        part.localToWorld(anchorLocal.clone()),
      );
      const expectedAnchorParent = parent.worldToLocal(
        worldPath.getPointAt(0).clone(),
      );
      const isDriverFollow =
        pathMotionDefinition.motion.kind === "driver-follow";
      if (
        !isDriverFollow &&
        initialAnchorParent.distanceTo(expectedAnchorParent) > 1e-6
      ) {
        throw new Error(
          pathMotionDefinition.partId +
            " initial GLB anchor does not match the CAD motion path.",
        );
      }

      const guidePath = createParentLocalGuidePath(worldPath, parent);
      const guide = new THREE.Mesh(
        new THREE.TubeGeometry(guidePath, 128, 0.0007, 8, false),
        new THREE.MeshBasicMaterial({
          color:
            pathMotionDefinition.nodeName === "oc_left-1"
              ? 0xff7a00
              : 0x22c55e,
          transparent: true,
          opacity: 0.95,
          depthTest: false,
          depthWrite: false,
        }),
      );
      guide.name = `${pathMotionDefinition.nodeName}-sketch-cam-path`;
      guide.visible =
        options.showGuides !== false &&
        pathMotionDefinition.motion.showGuide !== false;
      parent.add(guide);

      states.push({
        kind: "path",
        nodeName: pathMotionDefinition.nodeName,
        part,
        parent,
        basePosition: part.position.clone(),
        baseQuaternion: part.quaternion.clone(),
        initialAnchorParent: isDriverFollow
          ? expectedAnchorParent
          : initialAnchorParent,
        worldPath,
        guide,
        showGuide: pathMotionDefinition.motion.showGuide !== false,
        progress: THREE.MathUtils.clamp(options.initialMainProgress, 0, 1),
        direction: 1,
      });
    }

    applyIndependentMotion(
      states,
      model,
      motionDefinitions,
      options.initialMainProgress,
      options.initialLowerProgress,
      armLeft1Follower,
      boxNenSlide,
    );
  } catch (error) {
    states.forEach(disposeMotionState);
    throw error;
  }

  const mainDriveDefinition = motionDefinitions.find(
    (definition): definition is ClusterAxisMotionDefinition =>
      definition.partId === "gear_motor_chinh-1" &&
      "gear" in definition &&
      Boolean(definition.gear?.driveCalibration),
  );
  const mainDriveCalibration = mainDriveDefinition?.gear?.driveCalibration;

  const runtime: ClusterMotionRuntime = {
    apply(mainProgress, lowerProgress) {
      if (disposed) return;
      applyIndependentMotion(
        states,
        model,
        motionDefinitions,
        mainProgress,
        lowerProgress,
        armLeft1Follower,
        boxNenSlide,
      );
    },
    advance(delta, mainAutoMotion, lowerAutoMotion) {
      if (disposed) {
        return {
          mainProgress: 0,
          lowerProgress: 0,
        };
      }

      const mainLeader = states.find(
        (state) => state.nodeName === "gear_motor_chinh-1",
      );
      const lowerLeader = states.find(
        (state) => state.nodeName === "gear_motor_nen-1",
      );
      let nextMainProgress = mainLeader?.progress ?? 0;
      let nextLowerProgress = lowerLeader?.progress ?? 0;

      if (mainAutoMotion && mainLeader) {
        const proposedMainProgress =
          nextMainProgress + delta * 0.22 * mainLeader.direction;
        nextMainProgress = limitMainAutoProgressStep(
          nextMainProgress,
          THREE.MathUtils.clamp(proposedMainProgress, 0, 1),
          mainDriveCalibration,
        );
        if (nextMainProgress >= 1) {
          mainLeader.direction = -1;
        } else if (nextMainProgress <= 0) {
          mainLeader.direction = 1;
        }
      }
      if (lowerAutoMotion && lowerLeader) {
        nextLowerProgress += delta * 0.22 * lowerLeader.direction;
        if (nextLowerProgress >= 1) {
          nextLowerProgress = 1;
          lowerLeader.direction = -1;
        } else if (nextLowerProgress <= 0) {
          nextLowerProgress = 0;
          lowerLeader.direction = 1;
        }
      }

      applyIndependentMotion(
        states,
        model,
        motionDefinitions,
        nextMainProgress,
        nextLowerProgress,
        armLeft1Follower,
        boxNenSlide,
      );

      return {
        mainProgress: nextMainProgress,
        lowerProgress: nextLowerProgress,
      };
    },
    setGuidesVisible(visible) {
      if (disposed) return;
      states.forEach((state) => {
        if (state.kind === "path") {
          state.guide.visible = visible && state.showGuide;
        }
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      states.forEach(disposeMotionState);
      states.length = 0;
      armLeft1Follower = null;
      boxNenSlide = null;
    },
  };

  return runtime;
}

function ClusterScene({
  modelUrls,
  attachedModelDefinitions,
  rootFrameUrl,
  motionDefinitionUrl,
  motionDefinitionUrls,
  isolateNodeName,
  motionNodeName,
  onLoadStart,
  onReady,
  onError,
  cameraResetVersion,
  zoomLevel,
  mainDriveProgress,
  lowerDriveProgress,
  ocLeftCamVisible,
  mainAutoMotion,
  lowerAutoMotion,
}: Omit<DigitalTwinClusterCanvasProps, "canvasLabel">) {
  const { camera } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [motionDefinitions, setMotionDefinitions] = useState<
    ClusterMotionDefinition[]
  >([]);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const motionRuntimeRef = useRef<ClusterMotionRuntime | null>(null);
  const resolvedMotionDefinitionUrls = useMemo(
    () =>
      motionDefinitionUrls?.length
        ? motionDefinitionUrls
        : motionDefinitionUrl
          ? [motionDefinitionUrl]
          : [],
    [motionDefinitionUrl, motionDefinitionUrls],
  );

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    if (resolvedMotionDefinitionUrls.length === 0) {
      setMotionDefinitions([]);
      return () => {
        active = false;
        abortController.abort();
      };
    }

    void Promise.all(
      resolvedMotionDefinitionUrls.map((url) =>
        loadClusterMotionDefinition(url, abortController.signal),
      ),
    )
      .then((definitions) => {
        if (active) {
          setMotionDefinitions(
            definitions.filter(
              (definition): definition is ClusterMotionDefinition =>
                definition !== null,
            ),
          );
        }
      })
      .catch((error) => {
        if (active && !abortController.signal.aborted) onError(error);
      });

    return () => {
      active = false;
      abortController.abort();
    };
  }, [onError, resolvedMotionDefinitionUrls]);

  useEffect(() => {
    let active = true;
    let loadedScene: THREE.Group | null = null;
    const pendingScenes: THREE.Group[] = [];
    const abortController = new AbortController();
    const manager = new THREE.LoadingManager();
    const dracoLoader = new DRACOLoader(manager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(dracoLoader);
    onLoadStart();

    const rootTransform = loadClusterRootTransform(
      rootFrameUrl,
      abortController.signal,
    );
    const loads = modelUrls.map((modelUrl, index) =>
      new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          modelUrl,
          (gltf) => resolve(gltf.scene),
          undefined,
          reject,
        );
      }).then((scene) => {
        pendingScenes.push(scene);
        return { scene, index };
      }),
    );
    const attachedLoads = (attachedModelDefinitions ?? []).map(
      (definition) =>
        new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            definition.modelUrl,
            (gltf) => resolve(gltf.scene),
            undefined,
            reject,
          );
        }).then((scene) => {
          pendingScenes.push(scene);
          return scene;
        }),
    );

    void Promise.all([
      rootTransform,
      Promise.all(loads),
      Promise.all(attachedLoads),
    ])
      .then(([resolvedRootTransform, loadedModels, attachedScenes]) => {
        if (!active) {
          loadedModels.forEach(({ scene }) => disposeModel(scene));
          attachedScenes.forEach((scene) => disposeModel(scene));
          pendingScenes.length = 0;
          return;
        }

        try {
          const parts = loadedModels.map(({ scene, index }) =>
            prepareClusterPart(
              scene,
              index === 0 ? isolateNodeName : undefined,
            ),
          );
          loadedScene = combineClusterParts(
            parts,
            resolvedRootTransform,
            !rootFrameUrl,
          );
          attachedScenes.forEach((scene, index) => {
            const definition = attachedModelDefinitions?.[index];
            if (!definition) return;
            attachClusterModelToParent(loadedScene!, scene, definition);
          });
          assertClusterPartSeparation(loadedScene);
          pendingScenes.length = 0;
          setModel(loadedScene);
          onReady();
        } catch (error) {
          if (loadedScene) {
            disposeModel(loadedScene);
            loadedScene = null;
          } else {
            loadedModels.forEach(({ scene }) => disposeModel(scene));
          }
          attachedScenes.forEach((scene) => disposeModel(scene));
          pendingScenes.length = 0;
          onError(error);
        }
      })
      .catch((error) => {
        pendingScenes.forEach((scene) => disposeModel(scene));
        pendingScenes.length = 0;
        if (active && !abortController.signal.aborted) onError(error);
      });

    return () => {
      active = false;
      abortController.abort();
      manager.abort();
      if (loadedScene) disposeModel(loadedScene);
      else pendingScenes.forEach((scene) => disposeModel(scene));
      pendingScenes.length = 0;
      dracoLoader.dispose();
    };
  }, [
    attachedModelDefinitions,
    isolateNodeName,
    modelUrls,
    onError,
    onLoadStart,
    onReady,
    rootFrameUrl,
  ]);

  const bounds = useMemo(() => {
    if (!model) return null;
    return new THREE.Box3().setFromObject(model);
  }, [model]);

  useEffect(() => {
    if (!model || !bounds || !controlsRef.current) return;
    fitCameraToCluster(camera, controlsRef.current, bounds, zoomLevel);
  }, [bounds, camera, cameraResetVersion, model, zoomLevel]);

  useEffect(() => {
    if (!model || motionDefinitions.length === 0) {
      motionRuntimeRef.current?.dispose();
      motionRuntimeRef.current = null;
      return;
    }

    let runtime: ClusterMotionRuntime | null = null;
    try {
      runtime = createClusterMotionRuntime(model, motionDefinitions, {
        initialMainProgress: 0,
        initialLowerProgress: 1,
        showGuides: true,
      });
      motionRuntimeRef.current = runtime;
    } catch (error) {
      onError(error);
      return;
    }

    return () => {
      if (motionRuntimeRef.current === runtime) {
        motionRuntimeRef.current = null;
      }
      runtime?.dispose();
    };
  }, [
    model,
    motionDefinitions,
    onError,
  ]);

  useEffect(() => {
    motionRuntimeRef.current?.apply(
      mainDriveProgress,
      lowerDriveProgress,
    );
  }, [lowerDriveProgress, mainDriveProgress]);

  useEffect(() => {
    motionRuntimeRef.current?.setGuidesVisible(ocLeftCamVisible);
  }, [ocLeftCamVisible]);

  useFrame((_, delta) => {
    const runtime = motionRuntimeRef.current;
    if (!runtime || (!mainAutoMotion && !lowerAutoMotion)) {
      return;
    }

    runtime.advance(delta, mainAutoMotion, lowerAutoMotion);
  });

  return (
    <>
      {model ? <primitive object={model} dispose={null} /> : null}
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 8, 5]} intensity={1.35} />
      <directionalLight position={[-5, 3, -4]} intensity={0.55} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={0.05}
        maxDistance={100}
      />
    </>
  );
}

export default function DigitalTwinClusterCanvas({
  modelUrls,
  attachedModelDefinitions,
  rootFrameUrl,
  motionDefinitionUrl,
  motionDefinitionUrls,
  isolateNodeName,
  motionNodeName,
  onLoadStart,
  onReady,
  onError,
  canvasLabel,
  cameraResetVersion,
  zoomLevel,
  mainDriveProgress,
  lowerDriveProgress,
  ocLeftCamVisible,
  mainAutoMotion,
  lowerAutoMotion,
}: DigitalTwinClusterCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      aria-label={canvasLabel}
      camera={{ position: [3, 2.4, 4.5], fov: 38, near: 0.001, far: 1000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ClusterScene
        modelUrls={modelUrls}
        attachedModelDefinitions={attachedModelDefinitions}
        rootFrameUrl={rootFrameUrl}
        motionDefinitionUrl={motionDefinitionUrl}
        motionDefinitionUrls={motionDefinitionUrls}
        isolateNodeName={isolateNodeName}
        motionNodeName={motionNodeName}
        onLoadStart={onLoadStart}
        onReady={onReady}
        onError={onError}
        cameraResetVersion={cameraResetVersion}
        zoomLevel={zoomLevel}
        mainDriveProgress={mainDriveProgress}
        lowerDriveProgress={lowerDriveProgress}
        ocLeftCamVisible={ocLeftCamVisible}
        mainAutoMotion={mainAutoMotion}
        lowerAutoMotion={lowerAutoMotion}
      />
    </Canvas>
  );
}
