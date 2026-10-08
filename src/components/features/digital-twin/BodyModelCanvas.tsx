"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  assertClusterPartSeparation,
  combineClusterParts,
  createClusterMotionRuntime,
  loadClusterMotionDefinition,
  loadClusterRootTransform,
  prepareClusterPart,
  type ClusterMotionDefinition,
  type ClusterMotionRuntime,
} from "./DigitalTwinClusterCanvas";

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
  includeCompressorMotion: boolean;
  compressorModelUrls?: readonly string[];
  compressorRootFrameUrl?: string;
  compressorMotionDefinitionUrls?: readonly string[];
  compressorRunning: boolean;
}

interface CompressorPosePair {
  source: THREE.Object3D;
  display: THREE.Object3D;
}

interface ModelResources {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  textures: Set<THREE.Texture>;
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
    if (candidate.userData.name === sourceName) matches.push(candidate);
  });

  if (matches.length === 0) {
    throw new Error(`GLB node not found: ${sourceName}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple GLB nodes found for ${sourceName}.`);
  }
  return matches[0];
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
  includeCompressorMotion,
  compressorModelUrls,
  compressorRootFrameUrl,
  compressorMotionDefinitionUrls,
  compressorRunning,
}: Omit<BodyModelCanvasProps, "canvasLabel">) {
  const { camera, gl } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [compressorRuntimeModel, setCompressorRuntimeModel] =
    useState<THREE.Group | null>(null);
  const [compressorDisplayRoot, setCompressorDisplayRoot] =
    useState<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const environmentMapRef = useRef<THREE.Texture | null>(null);
  const compressorRuntimeRef = useRef<ClusterMotionRuntime | null>(null);
  const compressorPosePairsRef = useRef<CompressorPosePair[]>([]);

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
          ]).then(([scenes, rootTransform, definitions]) => ({
            scenes,
            rootTransform,
            definitions: definitions.filter(
              (definition): definition is ClusterMotionDefinition =>
                definition !== null,
            ),
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
              initialLowerProgress: 0,
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

        compressorPosePairsRef.current = nextCompressorPosePairs;
        setModel(bodyScene);
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
      disposeLoadedScenes();
      dracoLoader.dispose();
    };
  }, [
    compressorModelUrls,
    compressorMotionDefinitionUrls,
    compressorRootFrameUrl,
    excludedNodeNames,
    includeCompressorMotion,
    includeMayxoayNode,
    onError,
    onLoadStart,
    onReady,
  ]);

  useFrame((_, delta) => {
    const runtime = compressorRuntimeRef.current;
    if (runtime && compressorRunning) {
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
    return combinedBounds;
  }, [compressorDisplayRoot, model]);
  const size = useMemo(() => bounds?.getSize(new THREE.Vector3()) ?? null, [bounds]);
  const center = useMemo(() => bounds?.getCenter(new THREE.Vector3()) ?? null, [bounds]);
  const maxSize = size ? Math.max(size.x, size.y, size.z) : 0;

  useEffect(() => {
    if (!model || !bounds || !controlsRef.current) return;
    fitCameraToBody(camera, controlsRef.current, bounds, zoomLevel);
  }, [bounds, camera, cameraResetVersion, model, zoomLevel]);

  return (
    <>
      {model && bounds && size && center ? (
        <>
          <primitive object={model} dispose={null} />
          {compressorRuntimeModel ? (
            <primitive object={compressorRuntimeModel} dispose={null} />
          ) : null}
          {compressorDisplayRoot ? (
            <primitive object={compressorDisplayRoot} dispose={null} />
          ) : null}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[center.x, bounds.min.y - maxSize * 0.015, center.z]}
            receiveShadow
          >
            <planeGeometry args={[maxSize * 4, maxSize * 4]} />
            <meshStandardMaterial color="#d9dde3" roughness={0.88} metalness={0.02} />
          </mesh>
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
  includeCompressorMotion,
  compressorModelUrls,
  compressorRootFrameUrl,
  compressorMotionDefinitionUrls,
  compressorRunning,
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
        includeCompressorMotion={includeCompressorMotion}
        compressorModelUrls={compressorModelUrls}
        compressorRootFrameUrl={compressorRootFrameUrl}
        compressorMotionDefinitionUrls={compressorMotionDefinitionUrls}
        compressorRunning={compressorRunning}
      />
    </Canvas>
  );
}
