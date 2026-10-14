"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DigitalTwinCycleEvent } from "@/schemas/digitalTwinCycle";
import {
  assertClusterPartSeparation,
  attachClusterModelToParent,
  combineClusterParts,
  createClusterMotionRuntime,
  loadClusterMotionDefinition,
  loadClusterRootTransform,
  prepareClusterPart,
  type ClusterMotionDefinition,
  type ClusterMotionRuntime,
  type ClusterAttachmentDefinition,
} from "./DigitalTwinClusterCanvas";
import {
  DIGITAL_TWIN_OPERATION_STAGES,
  type DigitalTwinOperationNodeReference,
  type DigitalTwinOperationStageDefinition,
} from "./operation/DigitalTwinOperationConfig";
import {
  MAYXOAY_COFFEE_BOX_NEN_TARGET,
  MAYXOAY_COFFEE_SKETCH18_CALIBRATION,
} from "./material-effects/MaterialEffectsConfig";
import {
  CoffeeGroundEffect,
  type CoffeeGroundPlayback,
} from "./material-effects/CoffeeGroundEffect";
import {
  WaterFlowEffect,
  type WaterFlowPlayback,
} from "./material-effects/WaterFlowEffect";
import { createWaterFlowBounds } from "./material-effects/waterFlowRuntime";

const COFFEE_MACHINE_MODEL_URL =
  "/models/digital-twin/body/coffee_machine_03_v2.glb";
const MAYXOAY_MODEL_URL = "/models/digital-twin/cluster-02/may_xoay.glb";
const MAYXOAY_NODE_NAME = "Mayxoay1-2";
const HIDDEN_BODY_NODE_NAMES = [
  "CV02_Matphai-1",
  "HK05_TamR-1",
  "PART_03_BL-1",
  "Assem_HeNhiet02-1",
] as const;

// The body asset still contains the legacy compressor assembly. When the
// Cụm 3 replacement is enabled, remove that duplicate before attaching the
// animated replacement so both models cannot render on top of each other.
const LEGACY_COMPRESSOR_NODE_NAMES = ["Mayphacafe-1"] as const;
const BODY_COMPRESSOR_NODE_NAME = "may_ne_coffe-1";
const CLUSTER_COMPRESSOR_NODE_NAME = "body_may-1";
const CLUSTER_BOX_NEN_NODE_NAME = "box_nen-1";
const BODY_COFFEE_OUTLET_NODE_NAME = "DR08_CT8-1";
const CLUSTER_GUIDE_SUFFIX = "-sketch-cam-path";
const DRACO_DECODER_PATH = "/draco-gltf/";
const MAYXOAY_METALLIC_ACCENT = {
  color: "#e8752b",
  metalness: 0.62,
  roughness: 0.3,
};

interface BodyModelCanvasProps {
  onLoadStart: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
  canvasLabel: string;
  cameraResetVersion: number;
  zoomLevel: number;
  excludedNodeNames: readonly string[];
  includeMayxoayNode: boolean;
  enableCoffeeEffect: boolean;
  coffeeRunRequest: number;
  enableWaterEffect: boolean;
  waterRunRequest: number;
  waterResetRequest: number;
  includeCompressorMotion: boolean;
  compressorModelUrls?: readonly string[];
  compressorAttachedModelDefinitions?: readonly ClusterAttachmentDefinition[];
  compressorRootFrameUrl?: string;
  compressorMotionDefinitionUrls?: readonly string[];
  compressorRunning: boolean;
  operationEvent: DigitalTwinCycleEvent | null;
  onOperationError: (error: unknown) => void;
}

const INITIAL_COFFEE_PLAYBACK: CoffeeGroundPlayback = {
  phase: "idle",
  cycleId: null,
};

const INITIAL_WATER_PLAYBACK: WaterFlowPlayback = {
  phase: "idle",
  cycleId: null,
};

interface CompressorPosePair {
  source: THREE.Object3D;
  display: THREE.Object3D;
}

interface ModelResources {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  textures: Set<THREE.Texture>;
}

interface OperationVisualState {
  visibility: Map<THREE.Object3D, boolean>;
  materials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  clonedMaterials: Set<THREE.Material>;
}

function collectModelResources(root: THREE.Object3D): ModelResources {
  const resources: ModelResources = {
    geometries: new Set(),
    materials: new Set(),
    textures: new Set(),
  };

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    resources.geometries.add(object.geometry);
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      resources.materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) resources.textures.add(value);
      }
    }
  });

  return resources;
}

function disposeModel(
  root: THREE.Object3D,
  preservedResources: Partial<{
    geometries: ReadonlySet<THREE.BufferGeometry>;
    materials: ReadonlySet<THREE.Material>;
    textures: ReadonlySet<THREE.Texture>;
  }> = {},
) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!preservedResources.geometries?.has(object.geometry)) {
      object.geometry.dispose();
    }
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (preservedResources.materials?.has(material)) continue;
      for (const value of Object.values(material)) {
        if (
          value instanceof THREE.Texture &&
          !preservedResources.textures?.has(value)
        ) {
          value.dispose();
        }
      }
      material.dispose();
    }
  });
}

function findUniqueSourceNode(root: THREE.Object3D, sourceName: string) {
  const matches: THREE.Object3D[] = [];
  root.traverse((candidate) => {
    if (
      candidate.userData.name === sourceName ||
      candidate.name === sourceName
    ) {
      matches.push(candidate);
    }
  });

  if (matches.length === 0) {
    throw new Error(`GLB node not found: ${sourceName}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple GLB nodes found for ${sourceName}.`);
  }
  return matches[0];
}

function findOperationNode(
  bodyRoot: THREE.Object3D,
  compressorDisplayRoot: THREE.Object3D | null,
  reference: DigitalTwinOperationNodeReference,
) {
  const targetRoot =
    reference.root === "body" ? bodyRoot : compressorDisplayRoot;
  if (!targetRoot) {
    throw new Error(
      `Digital twin operation root is unavailable: ${reference.root}.`,
    );
  }
  return findUniqueSourceNode(targetRoot, reference.sourceName);
}

function isAncestorOf(ancestor: THREE.Object3D, node: THREE.Object3D) {
  let current = node.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function getMeshMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function createHighlightedMaterial(
  material: THREE.Material,
  highlightColor: string,
) {
  const clone = material.clone();
  const styledMaterial = clone as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
  };
  const color = new THREE.Color(highlightColor);

  if (styledMaterial.color instanceof THREE.Color) {
    styledMaterial.color.lerp(color, 0.72);
  }
  if (styledMaterial.emissive instanceof THREE.Color) {
    styledMaterial.emissive.copy(color);
    styledMaterial.emissiveIntensity = Math.max(
      styledMaterial.emissiveIntensity ?? 0,
      1.35,
    );
  }
  styledMaterial.needsUpdate = true;
  return clone;
}

function restoreOperationVisualState(
  stateRef: MutableRefObject<OperationVisualState | null>,
) {
  const state = stateRef.current;
  if (!state) return;

  for (const [mesh, originalMaterials] of state.materials) {
    mesh.material = originalMaterials;
  }
  for (const material of state.clonedMaterials) material.dispose();
  for (const [node, originalVisibility] of state.visibility) {
    node.visible = originalVisibility;
  }

  stateRef.current = null;
}

function applyOperationVisualState(
  bodyRoot: THREE.Object3D,
  compressorDisplayRoot: THREE.Object3D | null,
  stage: DigitalTwinOperationStageDefinition,
  state: OperationVisualState,
) {
  const activeNodes = stage.activeNodes.map((reference) => ({
    reference,
    node: findOperationNode(bodyRoot, compressorDisplayRoot, reference),
  }));
  const hiddenOccluders = stage.hiddenOccluders.map((reference) => ({
    reference,
    node: findOperationNode(bodyRoot, compressorDisplayRoot, reference),
  }));

  for (const activeTarget of activeNodes) {
    for (const occluderTarget of hiddenOccluders) {
      if (
        activeTarget.reference.root === occluderTarget.reference.root &&
        (activeTarget.node === occluderTarget.node ||
          isAncestorOf(occluderTarget.node, activeTarget.node))
      ) {
        throw new Error(
          `Operation occluder ${occluderTarget.reference.sourceName} hides active node ${activeTarget.reference.sourceName}.`,
        );
      }
    }
  }

  const snapshotVisibility = (node: THREE.Object3D) => {
    if (!state.visibility.has(node)) state.visibility.set(node, node.visible);
  };

  for (const { node } of activeNodes) {
    snapshotVisibility(node);
    node.visible = true;

    let meshCount = 0;
    node.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      meshCount += 1;
      if (state.materials.has(object)) return;

      const originalMaterials = object.material;
      const highlightedMaterials = getMeshMaterials(object).map((material) =>
        createHighlightedMaterial(material, stage.highlightColor),
      );
      state.materials.set(object, originalMaterials);
      highlightedMaterials.forEach((material) =>
        state.clonedMaterials.add(material),
      );
      object.material = Array.isArray(originalMaterials)
        ? highlightedMaterials
        : highlightedMaterials[0];
    });

    if (meshCount === 0) {
      throw new Error(
        `Operation active node has no mesh descendants: ${stage.phase}:${stage.activeNodes
          .map((reference) => reference.sourceName)
          .join(", ")}.`,
      );
    }
  }

  for (const { node } of hiddenOccluders) {
    snapshotVisibility(node);
    node.visible = false;
  }
}

function isClusterGuideNode(node: THREE.Object3D) {
  return node.name.endsWith(CLUSTER_GUIDE_SUFFIX);
}

function createCompressorDisplayClone(source: THREE.Group) {
  const display = source.clone(true);
  display.visible = true;

  const sourceNodes: THREE.Object3D[] = [];
  source.traverse((node) => {
    if (!isClusterGuideNode(node)) sourceNodes.push(node);
  });

  const displayGuideNodes: THREE.Object3D[] = [];
  display.traverse((node) => {
    if (isClusterGuideNode(node)) displayGuideNodes.push(node);
  });
  displayGuideNodes.forEach((node) => node.removeFromParent());

  const displayNodes: THREE.Object3D[] = [];
  display.traverse((node) => displayNodes.push(node));
  if (sourceNodes.length !== displayNodes.length) {
    throw new Error("Compressor display clone hierarchy does not match runtime.");
  }

  return {
    display,
    posePairs: sourceNodes.map((sourceNode, index) => ({
      source: sourceNode,
      display: displayNodes[index],
    })),
  } satisfies { display: THREE.Group; posePairs: CompressorPosePair[] };
}

function syncCompressorDisplayPose(
  posePairs: readonly CompressorPosePair[],
  displayRoot: THREE.Object3D | null,
) {
  if (!displayRoot) return;

  for (const { source, display } of posePairs) {
    display.matrixAutoUpdate = source.matrixAutoUpdate;
    if (source.matrixAutoUpdate) {
      display.position.copy(source.position);
      display.quaternion.copy(source.quaternion);
      display.scale.copy(source.scale);
    } else {
      display.matrix.copy(source.matrix);
    }
    display.matrixWorldNeedsUpdate = true;
  }
  displayRoot.updateMatrixWorld(true);
}

function attachMayxoayNode(
  sourceRoot: THREE.Object3D,
  targetRoot: THREE.Object3D,
) {
  const matches: THREE.Object3D[] = [];
  sourceRoot.traverse((candidate) => {
    if (candidate.userData.name === MAYXOAY_NODE_NAME) matches.push(candidate);
  });

  if (matches.length === 0) {
    throw new Error(`GLB node not found: ${MAYXOAY_NODE_NAME}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple GLB nodes found for ${MAYXOAY_NODE_NAME}.`);
  }
  const mayxoayNode = matches[0];

  mayxoayNode.updateWorldMatrix(true, false);
  const sourceWorldMatrix = mayxoayNode.matrixWorld.clone();
  mayxoayNode.removeFromParent();
  mayxoayNode.matrix.copy(sourceWorldMatrix);
  mayxoayNode.matrixAutoUpdate = false;
  mayxoayNode.matrixWorldNeedsUpdate = true;
  targetRoot.add(mayxoayNode);
  mayxoayNode.updateMatrixWorld(true);

  return mayxoayNode;
}

function applyBodyEnvironmentMap(
  root: THREE.Object3D,
  environmentMap: THREE.Texture | null,
) {
  if (!environmentMap) return;
  const environmentMappedMaterials = new Set<THREE.Material>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (environmentMappedMaterials.has(material)) continue;
      environmentMappedMaterials.add(material);

      const pbrMaterial = material as THREE.Material & {
        envMap?: THREE.Texture | null;
        envMapIntensity?: number;
      };
      if ("envMap" in pbrMaterial) {
        pbrMaterial.envMap = environmentMap;
        if (typeof pbrMaterial.envMapIntensity === "number") {
          pbrMaterial.envMapIntensity = 0.65;
        }
        pbrMaterial.needsUpdate = true;
      }
    }
  });
}

function applyMayxoayMetallicAccent(root: THREE.Object3D) {
  const styledMaterials = new Set<THREE.Material>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (styledMaterials.has(material)) continue;
      styledMaterials.add(material);

      const pbrMaterial = material as THREE.Material & {
        color?: THREE.Color;
        metalness?: number;
        roughness?: number;
      };
      if (pbrMaterial.color instanceof THREE.Color) {
        pbrMaterial.color.set(MAYXOAY_METALLIC_ACCENT.color);
      }
      if (typeof pbrMaterial.metalness === "number") {
        pbrMaterial.metalness = MAYXOAY_METALLIC_ACCENT.metalness;
      }
      if (typeof pbrMaterial.roughness === "number") {
        pbrMaterial.roughness = MAYXOAY_METALLIC_ACCENT.roughness;
      }
    }
  });
}

function detachExcludedNodes(
  root: THREE.Object3D,
  excludedNodeNames: readonly string[],
) {
  const requestedNames = new Set(excludedNodeNames);
  const foundNames = new Set<string>();
  const excludedNodes: THREE.Object3D[] = [];

  root.traverse((candidate) => {
    // GLTFLoader sanitizes Object3D.name; userData.name retains the GLB name.
    const sourceName = candidate.userData.name;
    if (typeof sourceName !== "string" || !requestedNames.has(sourceName)) {
      return;
    }

    foundNames.add(sourceName);
    excludedNodes.push(candidate);
  });

  const missingNames = excludedNodeNames.filter((name) => !foundNames.has(name));
  if (missingNames.length > 0) {
    throw new Error(`Excluded GLB node(s) not found: ${missingNames.join(", ")}.`);
  }

  const excludedNodeSet = new Set(excludedNodes);
  const detachedNodes = excludedNodes.filter((node) => {
    let ancestor = node.parent;
    while (ancestor) {
      if (excludedNodeSet.has(ancestor)) return false;
      ancestor = ancestor.parent;
    }
    return true;
  });

  for (const node of detachedNodes) node.removeFromParent();

  return detachedNodes;
}

function fitCameraToBody(
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
  const direction = new THREE.Vector3(0, 0.22, -1).normalize();

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

function BodyScene({
  onLoadStart,
  onReady,
  onError,
  cameraResetVersion,
  zoomLevel,
  excludedNodeNames,
  includeMayxoayNode,
  enableCoffeeEffect,
  coffeeRunRequest,
  enableWaterEffect,
  waterRunRequest,
  waterResetRequest,
  includeCompressorMotion,
  compressorModelUrls,
  compressorAttachedModelDefinitions,
  compressorRootFrameUrl,
  compressorMotionDefinitionUrls,
  compressorRunning,
  operationEvent,
  onOperationError,
}: Omit<BodyModelCanvasProps, "canvasLabel">) {
  const { camera, gl } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [compressorRuntimeModel, setCompressorRuntimeModel] =
    useState<THREE.Group | null>(null);
  const [compressorDisplayRoot, setCompressorDisplayRoot] =
    useState<THREE.Group | null>(null);
  const [coffeeAnchorNode, setCoffeeAnchorNode] =
    useState<THREE.Object3D | null>(null);
  const [coffeeTargetNode, setCoffeeTargetNode] =
    useState<THREE.Object3D | null>(null);
  const [coffeePlayback, setCoffeePlayback] = useState<CoffeeGroundPlayback>(
    INITIAL_COFFEE_PLAYBACK,
  );
  const [waterOutletNode, setWaterOutletNode] =
    useState<THREE.Object3D | null>(null);
  const [waterPlayback, setWaterPlayback] = useState<WaterFlowPlayback>(
    INITIAL_WATER_PLAYBACK,
  );
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const environmentMapRef = useRef<THREE.Texture | null>(null);
  const compressorRuntimeRef = useRef<ClusterMotionRuntime | null>(null);
  const compressorPosePairsRef = useRef<CompressorPosePair[]>([]);
  const operationVisualStateRef = useRef<OperationVisualState | null>(null);
  const operationCycleIdRef = useRef<string | null>(null);
  const operationMotionProgressRef = useRef({ main: 0, lower: 1 });
  const previousCoffeeRunRequestRef = useRef(coffeeRunRequest);
  const previousWaterRunRequestRef = useRef(waterRunRequest);
  const previousWaterResetRequestRef = useRef(waterResetRequest);
  const restoreOperationState = useCallback(
    () => restoreOperationVisualState(operationVisualStateRef),
    [],
  );

  useEffect(() => {
    if (!enableCoffeeEffect) {
      setCoffeePlayback((previous) =>
        previous.phase === "idle" && previous.cycleId === null
          ? previous
          : INITIAL_COFFEE_PLAYBACK,
      );
      return;
    }

    if (!operationEvent || operationEvent.phase === "idle") {
      setCoffeePlayback((previous) =>
        previous.phase === "idle" && previous.cycleId === null
          ? previous
          : INITIAL_COFFEE_PLAYBACK,
      );
      return;
    }

    if (operationEvent.phase === "fault") {
      setCoffeePlayback((previous) =>
        previous.phase === "fault" && previous.cycleId === null
          ? previous
          : { phase: "fault", cycleId: null },
      );
      return;
    }

    if (operationEvent.phase === "grinding") {
      setCoffeePlayback((previous) =>
        previous.phase === "idle" && previous.cycleId === null
          ? previous
          : INITIAL_COFFEE_PLAYBACK,
      );
      return;
    }

    if (operationEvent.phase === "dosing") {
      setCoffeePlayback((previous) =>
        previous.cycleId === operationEvent.cycleId &&
        previous.phase === "running"
          ? previous
          : { phase: "running", cycleId: operationEvent.cycleId },
      );
    }
  }, [enableCoffeeEffect, operationEvent]);

  useEffect(() => {
    if (previousCoffeeRunRequestRef.current === coffeeRunRequest) return;
    previousCoffeeRunRequestRef.current = coffeeRunRequest;
    if (!enableCoffeeEffect) return;

    setCoffeePlayback({
      phase: "running",
      cycleId: `manual-coffee-${coffeeRunRequest}`,
    });
  }, [coffeeRunRequest, enableCoffeeEffect]);

  useEffect(() => {
    if (previousWaterRunRequestRef.current === waterRunRequest) return;
    previousWaterRunRequestRef.current = waterRunRequest;
    if (!enableWaterEffect) return;

    setWaterPlayback({
      phase: "running",
      cycleId: `manual-water-${waterRunRequest}`,
    });
  }, [enableWaterEffect, waterRunRequest]);

  useEffect(() => {
    if (previousWaterResetRequestRef.current === waterResetRequest) return;
    previousWaterResetRequestRef.current = waterResetRequest;
    setWaterPlayback(INITIAL_WATER_PLAYBACK);
  }, [waterResetRequest]);

  useEffect(() => {
    if (enableWaterEffect) return;
    setWaterPlayback((previous) =>
      previous.phase === "idle" && previous.cycleId === null
        ? previous
        : INITIAL_WATER_PLAYBACK,
    );
  }, [enableWaterEffect]);

  useEffect(() => {
    const room = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const environment = pmremGenerator.fromScene(room, 0.04);
    environmentMapRef.current = environment.texture;

    return () => {
      if (environmentMapRef.current === environment.texture) {
        environmentMapRef.current = null;
      }
      environment.dispose();
      pmremGenerator.dispose();
      room.dispose();
    };
  }, [gl]);

  useEffect(() => {
    let active = true;
    let loadedScene: THREE.Group | null = null;
    let loadedMayxoayScene: THREE.Group | null = null;
    let loadedClusterSourceScenes: THREE.Group[] = [];
    let loadedClusterModel: THREE.Group | null = null;
    let excludedNodes: THREE.Object3D[] = [];
    const abortController = new AbortController();
    const manager = new THREE.LoadingManager();
    const dracoLoader = new DRACOLoader(manager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(dracoLoader);
    const environmentResources = () => {
      const environmentMap = environmentMapRef.current;
      return environmentMap ? { textures: new Set([environmentMap]) } : {};
    };
    const disposeLoadedScenes = () => {
      compressorRuntimeRef.current?.dispose();
      compressorRuntimeRef.current = null;
      compressorPosePairsRef.current = [];
      if (loadedScene) {
        disposeModel(loadedScene, environmentResources());
        loadedScene = null;
      }
      if (loadedMayxoayScene) {
        disposeModel(loadedMayxoayScene, environmentResources());
        loadedMayxoayScene = null;
      }
      if (loadedClusterModel) {
        disposeModel(loadedClusterModel);
        loadedClusterModel = null;
        loadedClusterSourceScenes = [];
      } else {
        loadedClusterSourceScenes.forEach((scene) => disposeModel(scene));
        loadedClusterSourceScenes = [];
      }
      for (const excludedNode of excludedNodes) {
        disposeModel(excludedNode, environmentResources());
      }
      excludedNodes = [];
    };

    onLoadStart();
    setCoffeeAnchorNode(null);
    setCoffeeTargetNode(null);
    setCoffeePlayback(INITIAL_COFFEE_PLAYBACK);
    setWaterOutletNode(null);
    setWaterPlayback(INITIAL_WATER_PLAYBACK);
    const bodyLoad = loader.loadAsync(COFFEE_MACHINE_MODEL_URL).then((gltf) => {
      loadedScene = gltf.scene;
      return gltf;
    });
    const mayxoayLoad = includeMayxoayNode
      ? loader.loadAsync(MAYXOAY_MODEL_URL).then((gltf) => {
          loadedMayxoayScene = gltf.scene;
          return gltf;
        })
      : Promise.resolve(null);

    const hasCompressorConfig = Boolean(
      compressorModelUrls?.length &&
        compressorRootFrameUrl &&
        compressorMotionDefinitionUrls?.length,
    );
    const compressorLoad = includeCompressorMotion
      ? hasCompressorConfig
        ? Promise.all([
            Promise.all(
              (compressorModelUrls ?? []).map((modelUrl) =>
                loader.loadAsync(modelUrl).then((gltf) => {
                  loadedClusterSourceScenes.push(gltf.scene);
                  return gltf.scene;
                }),
              ),
            ),
            loadClusterRootTransform(
              compressorRootFrameUrl,
              abortController.signal,
            ),
            Promise.all(
              (compressorMotionDefinitionUrls ?? []).map((url) =>
                loadClusterMotionDefinition(url, abortController.signal),
              ),
            ),
            Promise.all(
              (compressorAttachedModelDefinitions ?? []).map((definition) =>
                loader.loadAsync(definition.modelUrl).then((gltf) => {
                  loadedClusterSourceScenes.push(gltf.scene);
                  return gltf.scene;
                }),
              ),
            ),
          ]).then(([scenes, rootTransform, definitions, attachedScenes]) => ({
            scenes,
            rootTransform,
            definitions: definitions.filter(
              (definition): definition is ClusterMotionDefinition =>
                definition !== null,
            ),
            attachedScenes,
          }))
        : Promise.reject(
            new Error("Body compressor motion assets are not configured."),
          )
      : Promise.resolve(null);

    void Promise.allSettled([bodyLoad, mayxoayLoad, compressorLoad]).then(
      (results) => {
        const [bodyResult, mayxoayResult, compressorResult] = results;
        if (!active) {
          disposeLoadedScenes();
          return;
        }

        if (
          bodyResult.status === "rejected" ||
          mayxoayResult.status === "rejected" ||
          compressorResult.status === "rejected"
        ) {
          const error =
            bodyResult.status === "rejected"
              ? bodyResult.reason
              : mayxoayResult.status === "rejected"
                ? mayxoayResult.reason
                : compressorResult.status === "rejected"
                  ? compressorResult.reason
                  : new Error("A required 3D model could not be loaded.");
          console.error("Failed to load the combined machine model.", error);
          disposeLoadedScenes();
          onError(error);
          return;
        }

        try {
          // The GLB's native orientation puts the machine head on the viewer's left.
          const bodyScene = bodyResult.value.scene;
          const coffeeAnchorNode = enableCoffeeEffect
            ? findUniqueSourceNode(
                bodyScene,
                MAYXOAY_COFFEE_SKETCH18_CALIBRATION.anchor.sourceName,
              )
            : null;
          const waterOutletNode = enableWaterEffect
            ? findUniqueSourceNode(bodyScene, BODY_COFFEE_OUTLET_NODE_NAME)
            : null;

        let mayxoayNode: THREE.Object3D | null = null;
        if (mayxoayResult.value) {
          mayxoayNode = attachMayxoayNode(
            mayxoayResult.value.scene,
            bodyScene,
          );
          const preservedResources = collectModelResources(mayxoayNode);
          disposeModel(mayxoayResult.value.scene, {
            ...environmentResources(),
            ...preservedResources,
          });
          loadedMayxoayScene = null;
        }

      excludedNodes = detachExcludedNodes(bodyScene, [
        ...HIDDEN_BODY_NODE_NAMES,
        ...(includeCompressorMotion ? LEGACY_COMPRESSOR_NODE_NAMES : []),
        ...excludedNodeNames,
      ]);
        applyBodyEnvironmentMap(bodyScene, environmentMapRef.current);
        if (mayxoayNode) applyMayxoayMetallicAccent(mayxoayNode);
        bodyScene.updateMatrixWorld(true);

        let nextCompressorDisplayRoot: THREE.Group | null = null;
        let nextCompressorPosePairs: CompressorPosePair[] = [];
        let nextCoffeeTargetNode: THREE.Object3D | null = null;
        const compressorPayload = compressorResult.value;
        if (compressorPayload) {
          const compressorParts = compressorPayload.scenes.map((scene) =>
            prepareClusterPart(scene),
          );
          loadedClusterModel = combineClusterParts(
            compressorParts,
            compressorPayload.rootTransform,
            !compressorRootFrameUrl,
          );
          compressorPayload.attachedScenes.forEach((scene, index) => {
            const definition = compressorAttachedModelDefinitions?.[index];
            if (!definition) return;
            attachClusterModelToParent(loadedClusterModel!, scene, definition);
          });
          loadedClusterSourceScenes = [];
          assertClusterPartSeparation(loadedClusterModel);
          loadedClusterModel.updateMatrixWorld(true);

          const bodyCompressorNode = findUniqueSourceNode(
            bodyScene,
            BODY_COMPRESSOR_NODE_NAME,
          );
          const clusterCompressorNode = loadedClusterModel.getObjectByName(
            CLUSTER_COMPRESSOR_NODE_NAME,
          );
          if (!clusterCompressorNode) {
            throw new Error(
              `GLB node not found: ${CLUSTER_COMPRESSOR_NODE_NAME}.`,
            );
          }

          bodyCompressorNode.updateWorldMatrix(true, false);
          clusterCompressorNode.updateWorldMatrix(true, false);
          const displayPlacement = bodyCompressorNode.matrixWorld
            .clone()
            .multiply(clusterCompressorNode.matrixWorld.clone().invert());

          bodyCompressorNode.visible = false;
          loadedClusterModel.visible = false;
          const compressorRuntime = createClusterMotionRuntime(
            loadedClusterModel,
            compressorPayload.definitions,
            {
              initialMainProgress: 0,
              initialLowerProgress: 1,
              showGuides: false,
            },
          );
          compressorRuntimeRef.current = compressorRuntime;

          const displayClone = createCompressorDisplayClone(loadedClusterModel);
          const displayRoot = new THREE.Group();
          displayRoot.name = "body-compressor-display";
          displayRoot.matrix.copy(displayPlacement);
          displayRoot.matrixAutoUpdate = false;
          displayRoot.add(displayClone.display);
          displayRoot.updateMatrixWorld(true);
          nextCompressorDisplayRoot = displayRoot;
          nextCompressorPosePairs = displayClone.posePairs;
          syncCompressorDisplayPose(nextCompressorPosePairs, displayRoot);
        }

        if (enableCoffeeEffect) {
          if (!nextCompressorDisplayRoot) {
            throw new Error(
              "Coffee flow target is unavailable: compressor display is not loaded.",
            );
          }
          nextCoffeeTargetNode = findUniqueSourceNode(
            nextCompressorDisplayRoot,
            CLUSTER_BOX_NEN_NODE_NAME,
          );
        }

        compressorPosePairsRef.current = nextCompressorPosePairs;
        setModel(bodyScene);
        setCoffeeAnchorNode(coffeeAnchorNode);
        setCoffeeTargetNode(nextCoffeeTargetNode);
        setWaterOutletNode(waterOutletNode);
        setCompressorRuntimeModel(loadedClusterModel);
        setCompressorDisplayRoot(nextCompressorDisplayRoot);
        onReady();
        } catch (error) {
          console.error("Failed to prepare the combined machine model.", error);
          disposeLoadedScenes();
          onError(error);
        }
      }
    );

    return () => {
      active = false;
      abortController.abort();
      manager.abort();
      restoreOperationState();
      disposeLoadedScenes();
      dracoLoader.dispose();
    };
  }, [
    compressorAttachedModelDefinitions,
    compressorModelUrls,
    compressorMotionDefinitionUrls,
    compressorRootFrameUrl,
    excludedNodeNames,
    enableCoffeeEffect,
    enableWaterEffect,
    includeCompressorMotion,
    includeMayxoayNode,
    onError,
    onLoadStart,
    onReady,
    restoreOperationState,
  ]);

  const operationPhase = operationEvent?.phase ?? "idle";
  useEffect(() => {
    restoreOperationState();

    const stage = DIGITAL_TWIN_OPERATION_STAGES.find(
      (candidate) => candidate.phase === operationPhase,
    );
    if (!model || !stage) return;

    const nextState: OperationVisualState = {
      visibility: new Map(),
      materials: new Map(),
      clonedMaterials: new Set(),
    };
    operationVisualStateRef.current = nextState;

    try {
      applyOperationVisualState(
        model,
        compressorDisplayRoot,
        stage,
        nextState,
      );
    } catch (error) {
      restoreOperationState();
      onOperationError(error);
    }

    return restoreOperationState;
  }, [
    compressorDisplayRoot,
    model,
    onOperationError,
    operationPhase,
    restoreOperationState,
  ]);

  useFrame((_, delta) => {
    const runtime = compressorRuntimeRef.current;
    if (!runtime) return;

    const operationIsActive = Boolean(
      operationEvent &&
        operationEvent.phase !== "idle" &&
        operationEvent.phase !== "complete" &&
        operationEvent.phase !== "fault",
    );

    if (operationIsActive && operationEvent) {
      if (operationCycleIdRef.current !== operationEvent.cycleId) {
        operationCycleIdRef.current = operationEvent.cycleId;
        operationMotionProgressRef.current = { main: 0, lower: 1 };
        runtime.apply(0, 1);
      }

      const stage = DIGITAL_TWIN_OPERATION_STAGES.find(
        (candidate) => candidate.phase === operationEvent.phase,
      );
      if (stage?.motion?.runtime === "cluster-03") {
        operationMotionProgressRef.current = {
          main: THREE.MathUtils.lerp(
            stage.motion.mainProgressRange[0],
            stage.motion.mainProgressRange[1],
            operationEvent.progress,
          ),
          lower: THREE.MathUtils.lerp(
            stage.motion.lowerProgressRange[0],
            stage.motion.lowerProgressRange[1],
            operationEvent.progress,
          ),
        };
      }
      runtime.apply(
        operationMotionProgressRef.current.main,
        operationMotionProgressRef.current.lower,
      );
      syncCompressorDisplayPose(
        compressorPosePairsRef.current,
        compressorDisplayRoot,
      );
      return;
    }

    if (operationCycleIdRef.current !== null) {
      runtime.apply(0, 1);
      operationCycleIdRef.current = null;
      operationMotionProgressRef.current = { main: 0, lower: 1 };
    } else if (compressorRunning) {
      runtime.advance(delta, true, true);
    }
    syncCompressorDisplayPose(
      compressorPosePairsRef.current,
      compressorDisplayRoot,
    );
  });

  const bounds = useMemo(() => {
    if (!model) return null;
    const combinedBounds = new THREE.Box3().setFromObject(model);
    if (compressorDisplayRoot) {
      combinedBounds.union(new THREE.Box3().setFromObject(compressorDisplayRoot));
    }
    if (enableWaterEffect && waterOutletNode) {
      combinedBounds.union(createWaterFlowBounds(waterOutletNode));
    }
    return combinedBounds;
  }, [compressorDisplayRoot, enableWaterEffect, model, waterOutletNode]);

  useEffect(() => {
    if (!model || !bounds || !controlsRef.current) return;
    fitCameraToBody(camera, controlsRef.current, bounds, zoomLevel);
  }, [bounds, camera, cameraResetVersion, model, zoomLevel]);

  return (
    <>
      {model && bounds ? (
        <>
          <primitive object={model} dispose={null} />
          {compressorRuntimeModel ? (
            <primitive object={compressorRuntimeModel} dispose={null} />
          ) : null}
          {compressorDisplayRoot ? (
            <primitive object={compressorDisplayRoot} dispose={null} />
          ) : null}
          {enableCoffeeEffect && coffeeAnchorNode && coffeeTargetNode ? (
            <CoffeeGroundEffect
              anchorNode={coffeeAnchorNode}
              anchor={MAYXOAY_COFFEE_SKETCH18_CALIBRATION.anchor}
              targetNode={coffeeTargetNode}
              target={MAYXOAY_COFFEE_BOX_NEN_TARGET}
              playback={coffeePlayback}
            />
          ) : null}
          {enableWaterEffect && waterOutletNode ? (
            <WaterFlowEffect
              sourceNode={waterOutletNode}
              playback={waterPlayback}
            />
          ) : null}
        </>
      ) : null}
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 8, -5]} intensity={1.25} />
      <directionalLight position={[-5, 3, -4]} intensity={0.55} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom
        enableRotate={false}
        minDistance={0.05}
        maxDistance={100}
      />
    </>
  );
}

export default function BodyModelCanvas({
  onLoadStart,
  onReady,
  onError,
  canvasLabel,
  cameraResetVersion,
  zoomLevel,
  excludedNodeNames,
  includeMayxoayNode,
  enableCoffeeEffect,
  coffeeRunRequest,
  enableWaterEffect,
  waterRunRequest,
  waterResetRequest,
  includeCompressorMotion,
  compressorModelUrls,
  compressorAttachedModelDefinitions,
  compressorRootFrameUrl,
  compressorMotionDefinitionUrls,
  compressorRunning,
  operationEvent,
  onOperationError,
}: BodyModelCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      aria-label={canvasLabel}
      camera={{ position: [3, 2.4, 4.5], fov: 38, near: 0.001, far: 1000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <BodyScene
        onLoadStart={onLoadStart}
        onReady={onReady}
        onError={onError}
        cameraResetVersion={cameraResetVersion}
        zoomLevel={zoomLevel}
        excludedNodeNames={excludedNodeNames}
        includeMayxoayNode={includeMayxoayNode}
        enableCoffeeEffect={enableCoffeeEffect}
        coffeeRunRequest={coffeeRunRequest}
        enableWaterEffect={enableWaterEffect}
        waterRunRequest={waterRunRequest}
        waterResetRequest={waterResetRequest}
        includeCompressorMotion={includeCompressorMotion}
        compressorModelUrls={compressorModelUrls}
        compressorAttachedModelDefinitions={compressorAttachedModelDefinitions}
        compressorRootFrameUrl={compressorRootFrameUrl}
        compressorMotionDefinitionUrls={compressorMotionDefinitionUrls}
        compressorRunning={compressorRunning}
        operationEvent={operationEvent}
        onOperationError={onOperationError}
      />
    </Canvas>
  );
}
