"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const DRACO_DECODER_PATH = "/draco-gltf/";

export interface DigitalTwinClusterCanvasProps {
  modelUrls: readonly string[];
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

function prepareClusterPart(root: THREE.Group, isolateNodeName?: string) {
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
  | "arm_left_2-1";
type ClusterAxisMotionNodeName =
  | "truc_chinh-1"
  | "truc_nen-1"
  | "gear_motor_chinh-1"
  | "gear_motor_nen-1"
  | "gear_nen-1"
  | "arm_left_3-1"
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
  mate: "PathMate8";
  sourcePartId: "arm_left_1-1";
  targetPartId: "body_may-1";
  sourcePoint: MotionVector;
  targetReferencePoint: MotionVector;
  targetPath: {
    sourceFeature: "Sketch1";
    sourceSegments: readonly ["Arc3", "Line1"];
    coordinateFrame: "solidworks-assembly";
  };
  validation: {
    pathDriverStartResidualMeters: number;
    toleranceMeters: number;
  };
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
    | "cluster-03-arm-left-2-motion.v1";
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
    partId: "oc_left-1";
    motionFile: string;
    relation: "rigid-translation";
    sourceMates: readonly string[];
    pathConstraint?: string;
    dependencyPartId?: string;
    dependencyMotionFile?: string;
    sourcePath: string;
  };
  bodyConnection?: ClusterBodyPathConnection;
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
      },
      {
        kind: "line";
        start: MotionVector;
        end: MotionVector;
      },
    ];
    segmentDirections?: readonly ["forward" | "reverse", "forward" | "reverse"];
  };
  connection?: {
    kind: "point-on-path";
    status: "verified";
    mate: "PathMate10";
    sourcePartId: "arm_left_2-1";
    targetPartId: "arm_left_3-1";
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
      lengthMeters: number;
      coordinateFrame: "solidworks-assembly";
    };
    driverAxis: {
      sourceMate: "Concentric2";
      partId: "oc_left-1";
      point: MotionVector;
      axis: MotionVector;
      localPoint: MotionVector;
      localAxis: MotionVector;
    };
    limit: {
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

type ClusterMotionDefinition =
  | ClusterPathMotionDefinition
  | ClusterAxisMotionDefinition;

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

async function loadClusterRootTransform(
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
    targetReferencePoint?: unknown;
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
    isMotionVector(connection.targetReferencePoint) &&
    connection.targetPath?.sourceFeature === "Sketch1" &&
    JSON.stringify(connection.targetPath.sourceSegments) ===
      JSON.stringify(["Arc3", "Line1"]) &&
    connection.targetPath.coordinateFrame === "solidworks-assembly" &&
    isFiniteNumber(validation?.pathDriverStartResidualMeters) &&
    isFiniteNumber(validation?.toleranceMeters) &&
    validation.pathDriverStartResidualMeters <= validation.toleranceMeters
  );
}

function parseClusterMotionDefinition(payload: unknown): ClusterMotionDefinition {
  if (!payload || typeof payload !== "object") {
    throw new Error("cluster motion response is not an object.");
  }

  const definition = payload as Partial<ClusterPathMotionDefinition>;
  const schemaVersion = (payload as { schemaVersion?: unknown }).schemaVersion;
  if (
    schemaVersion === "cluster-03-truc-chinh-motion.v1" ||
    schemaVersion === "cluster-03-truc-nen-motion.v1" ||
    schemaVersion === "cluster-03-gear-motor-chinh-motion.v1" ||
    schemaVersion === "cluster-03-gear-motor-nen-motion.v1" ||
    schemaVersion === "cluster-03-gear-nen-motion.v1" ||
    schemaVersion === "cluster-03-arm-left-3-motion.v1" ||
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
            JSON.stringify(["Parallel1", "Concentric6"])))
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
  const isKnownArmMotion = isKnownArmLeft1Motion || isKnownArmLeft2Motion;
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
        JSON.stringify(["Arc3", "Line1"]));
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
      !isValidArmLeft1BodyConnection(definition.bodyConnection))
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
          "number"))
  ) {
    throw new Error("cluster motion contract is invalid or not verified.");
  }

  return definition as ClusterMotionDefinition;
}

async function loadClusterMotionDefinition(
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

function combineClusterParts(
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

function assertClusterPartSeparation(model: THREE.Group) {
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

interface FinitePathCouplingCandidate {
  arm3Angle: number;
  arm2Angle: number;
  lineProgress: number;
  residualMeters: number;
}

function wrapAngleRadians(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function angularDistanceRadians(left: number, right: number) {
  return Math.abs(wrapAngleRadians(left - right));
}

function solveFinitePointOnMovingSegment({
  sourcePoint,
  driverAxisPoint,
  driverAxis,
  lineStart,
  lineEnd,
  lineProgress,
  arm3Pivot,
  arm3Axis,
  previousArm3Angle,
  previousArm2Angle,
}: {
  sourcePoint: THREE.Vector3;
  driverAxisPoint: THREE.Vector3;
  driverAxis: THREE.Vector3;
  lineStart: THREE.Vector3;
  lineEnd: THREE.Vector3;
  lineProgress: number;
  arm3Pivot: THREE.Vector3;
  arm3Axis: THREE.Vector3;
  previousArm3Angle: number;
  previousArm2Angle: number;
}): FinitePathCouplingCandidate | null {
  const normalizedDriverAxis = driverAxis.clone().normalize();
  const normalizedArm3Axis = arm3Axis.clone().normalize();
  const targetBasePoint = lineStart.clone().lerp(lineEnd, lineProgress);
  const sourceRadius = sourcePoint
    .clone()
    .sub(driverAxisPoint)
    .projectOnPlane(normalizedDriverAxis);
  const sourceRadiusSquared = sourceRadius.lengthSq();
  const arm3ToDriver = arm3Pivot
    .clone()
    .sub(driverAxisPoint)
    .projectOnPlane(normalizedDriverAxis);
  const targetRadius = targetBasePoint
    .clone()
    .sub(arm3Pivot)
    .projectOnPlane(normalizedDriverAxis);
  const cosineTerm = arm3ToDriver.dot(targetRadius);
  const sineTerm = arm3ToDriver.dot(
    normalizedArm3Axis.clone().cross(targetRadius),
  );
  const requiredTerm =
    (sourceRadiusSquared -
      arm3ToDriver.lengthSq() -
      targetRadius.lengthSq()) /
    2;
  const amplitude = Math.hypot(cosineTerm, sineTerm);
  if (amplitude <= 1e-12 || Math.abs(requiredTerm) > amplitude + 1e-10) {
    return null;
  }

  const phase = Math.atan2(sineTerm, cosineTerm);
  const offset = Math.acos(
    THREE.MathUtils.clamp(requiredTerm / amplitude, -1, 1),
  );
  const arm3Angles = [phase - offset, phase + offset];
  const candidates = arm3Angles.map((arm3Angle) => {
    const targetPoint = targetBasePoint
      .clone()
      .sub(arm3Pivot)
      .applyAxisAngle(normalizedArm3Axis, arm3Angle)
      .add(arm3Pivot);
    const targetPointRadius = targetPoint
      .clone()
      .sub(driverAxisPoint)
      .projectOnPlane(normalizedDriverAxis);
    const arm2Angle = Math.atan2(
      normalizedDriverAxis.dot(sourceRadius.clone().cross(targetPointRadius)),
      sourceRadius.dot(targetPointRadius),
    );
    const resolvedPoint = sourcePoint
      .clone()
      .sub(driverAxisPoint)
      .applyAxisAngle(normalizedDriverAxis, arm2Angle)
      .add(driverAxisPoint);
    return {
      arm3Angle,
      arm2Angle,
      lineProgress,
      residualMeters: resolvedPoint.distanceTo(targetPoint),
    };
  });

  candidates.sort(
    (left, right) =>
      angularDistanceRadians(left.arm3Angle, previousArm3Angle) -
        angularDistanceRadians(right.arm3Angle, previousArm3Angle) ||
      angularDistanceRadians(left.arm2Angle, previousArm2Angle) -
        angularDistanceRadians(right.arm2Angle, previousArm2Angle) ||
      left.residualMeters - right.residualMeters,
  );
  return candidates[0] ?? null;
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
          line10ProjectionMeters >= -1e-8 &&
          line10ProjectionMeters <= arm3LineLength + 1e-8 &&
          isWithinDistanceRange(
            limitDistance1Meters,
            arm3DistanceMinimum,
            arm3DistanceMaximum,
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
}

type MotionState = CamState | AxisState;

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

function applyLowerGearMotorConnection(
  states: MotionState[],
  motionDefinitions: ClusterMotionDefinition[],
) {
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
  );
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
    const shaftRevolutions = THREE.MathUtils.clamp(
      Math.abs(shaftAngle) / (Math.PI * 2),
      0,
      1,
    );
    const shaftTranslation = THREE.MathUtils.lerp(
      shaftState.translationRangeMeters[0],
      shaftState.translationRangeMeters[1],
      shaftRevolutions,
    );
    shaftState.coupledAngleRadians = shaftAngle;
    applyAxisMotionAtAngle(shaftState, shaftAngle, shaftTranslation);
  }
}

function applyMainGearMotorConnection(
  states: MotionState[],
  model: THREE.Group,
  motionDefinitions: ClusterMotionDefinition[],
) {
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

  const arm2PathDefinition = arm2Definition as ClusterPathMotionDefinition;
  const wiperPathDefinition = arm2PathDefinition.wiperConnection;
  if (!wiperPathDefinition) return;
  const wiperAxisDefinition = wiperDefinition as ClusterAxisMotionDefinition;

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
  if (!arm2Connection) return;

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
) {
  states.forEach((state) => {
    const progress = isLowerDriveNode(state.nodeName)
      ? lowerProgress
      : mainProgress;
    state.progress = THREE.MathUtils.clamp(progress, 0, 1);
    applyMotionState(state, state.progress);
  });
  applyLowerGearMotorConnection(states, motionDefinitions);
  applyMainGearMotorConnection(states, model, motionDefinitions);
}

function ClusterScene({
  modelUrls,
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
  const camStatesRef = useRef<MotionState[]>([]);
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

    void Promise.all([rootTransform, Promise.all(loads)])
      .then(([resolvedRootTransform, loadedModels]) => {
        if (!active) {
          loadedModels.forEach(({ scene }) => disposeModel(scene));
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
          assertClusterPartSeparation(loadedScene);
          pendingScenes.length = 0;
          setModel(loadedScene);
          onReady();
        } catch (error) {
          loadedModels.forEach(({ scene }) => disposeModel(scene));
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
  }, [isolateNodeName, modelUrls, onError, onLoadStart, onReady, rootFrameUrl]);

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
      camStatesRef.current = [];
      return;
    }

    model.updateMatrixWorld(true);
    const states: MotionState[] = [];
    try {
      for (const motionDefinition of motionDefinitions) {
        const part = model.getObjectByName(motionDefinition.nodeName);
        if (!part) {
          throw new Error(
            `GLB node "${motionDefinition.nodeName}" was not found.`,
          );
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
            "cluster-03-gear-motor-nen-motion.v1"
          || motionDefinition.schemaVersion === "cluster-03-gear-nen-motion.v1"
          || motionDefinition.schemaVersion === "cluster-03-arm-left-3-motion.v1"
          || motionDefinition.schemaVersion === "cluster-03-wiper-gear-motion.v1"
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
                ? lowerDriveProgress
                : mainDriveProgress,
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
          ocLeftCamVisible && pathMotionDefinition.motion.showGuide !== false;
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
          progress: THREE.MathUtils.clamp(mainDriveProgress, 0, 1),
          direction: 1,
        });
      }

      applyIndependentMotion(
        states,
        model,
        motionDefinitions,
        mainDriveProgress,
        lowerDriveProgress,
      );
      camStatesRef.current = states;
    } catch (error) {
      states.forEach(disposeMotionState);
      camStatesRef.current = [];
      onError(error);
      return;
    }

    return () => {
      states.forEach(disposeMotionState);
      if (camStatesRef.current === states) camStatesRef.current = [];
    };
  }, [model, motionDefinitions, onError]);

  useEffect(() => {
    if (model) {
      applyIndependentMotion(
        camStatesRef.current,
        model,
        motionDefinitions,
        mainDriveProgress,
        lowerDriveProgress,
      );
    }
  }, [
    lowerDriveProgress,
    mainDriveProgress,
    model,
    motionDefinitions,
  ]);

  useEffect(() => {
    camStatesRef.current.forEach((state) => {
      if (state.kind === "path") {
        state.guide.visible = ocLeftCamVisible && state.showGuide;
      }
    });
  }, [ocLeftCamVisible]);

  useFrame((_, delta) => {
    const states = camStatesRef.current;
    if (!states.length || !model || (!mainAutoMotion && !lowerAutoMotion)) {
      return;
    }

    const mainLeader = states.find(
      (state) => state.nodeName === "gear_motor_chinh-1",
    );
    const lowerLeader = states.find(
      (state) => state.nodeName === "gear_motor_nen-1",
    );
    let nextMainProgress = mainLeader?.progress ?? mainDriveProgress;
    let nextLowerProgress = lowerLeader?.progress ?? lowerDriveProgress;

    if (mainAutoMotion && mainLeader) {
      nextMainProgress += delta * 0.22 * mainLeader.direction;
      if (nextMainProgress >= 1) {
        nextMainProgress = 1;
        mainLeader.direction = -1;
      } else if (nextMainProgress <= 0) {
        nextMainProgress = 0;
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

    states.forEach((state) => {
      state.progress = isLowerDriveNode(state.nodeName)
        ? nextLowerProgress
        : nextMainProgress;
    });
    applyIndependentMotion(
      states,
      model,
      motionDefinitions,
      nextMainProgress,
      nextLowerProgress,
    );
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
