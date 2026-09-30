"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const BODY_MODEL_URL = "/models/digital-twin/body/Body.glb";
const MAYXOAY_MODEL_URL = "/models/digital-twin/cluster-02/may_xoay.glb";
const MAYXOAY_NODE_NAME = "Mayxoay1-2";
const DRACO_DECODER_PATH = "/draco-gltf/";
const BODY_METALLIC_COATING = {
  color: "#b9c1c8",
  metalness: 0.86,
  roughness: 0.36,
};
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

function applyBodyMetallicCoating(
  root: THREE.Object3D,
  environmentMap: THREE.Texture | null,
) {
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
        envMap?: THREE.Texture | null;
        envMapIntensity?: number;
        metalness?: number;
        roughness?: number;
      };
      if (pbrMaterial.color instanceof THREE.Color) {
        pbrMaterial.color.set(BODY_METALLIC_COATING.color);
      }
      if (typeof pbrMaterial.metalness === "number") {
        pbrMaterial.metalness = BODY_METALLIC_COATING.metalness;
      }
      if (typeof pbrMaterial.roughness === "number") {
        pbrMaterial.roughness = BODY_METALLIC_COATING.roughness;
      }
      if (environmentMap && "envMap" in pbrMaterial) {
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

  for (const node of excludedNodes) node.removeFromParent();

  return excludedNodes;
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
}: Omit<BodyModelCanvasProps, "canvasLabel">) {
  const { camera, gl } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const environmentMapRef = useRef<THREE.Texture | null>(null);

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
    let excludedNodes: THREE.Object3D[] = [];
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
      if (loadedScene) {
        disposeModel(loadedScene, environmentResources());
        loadedScene = null;
      }
      if (loadedMayxoayScene) {
        disposeModel(loadedMayxoayScene, environmentResources());
        loadedMayxoayScene = null;
      }
      for (const excludedNode of excludedNodes) {
        disposeModel(excludedNode, environmentResources());
      }
      excludedNodes = [];
    };

    onLoadStart();
    const bodyLoad = loader.loadAsync(BODY_MODEL_URL).then((gltf) => {
      loadedScene = gltf.scene;
      return gltf;
    });
    const mayxoayLoad = includeMayxoayNode
      ? loader.loadAsync(MAYXOAY_MODEL_URL).then((gltf) => {
          loadedMayxoayScene = gltf.scene;
          return gltf;
        })
      : Promise.resolve(null);

    void Promise.allSettled([bodyLoad, mayxoayLoad]).then((results) => {
      const [bodyResult, mayxoayResult] = results;
      if (!active) {
        disposeLoadedScenes();
        return;
      }

      if (
        bodyResult.status === "rejected" ||
        mayxoayResult.status === "rejected"
      ) {
        const error =
          bodyResult.status === "rejected"
            ? bodyResult.reason
            : mayxoayResult.status === "rejected"
              ? mayxoayResult.reason
              : new Error("A required 3D model could not be loaded.");
        console.error("Failed to load the combined machine model.", error);
        disposeLoadedScenes();
        onError(error);
        return;
      }

      try {
        const bodyScene = bodyResult.value.scene;
        // Display-only half-turn around the view axis: keep the open face toward
        // the fixed camera while correcting the machine's top/foot orientation.
        bodyScene.rotateZ(Math.PI);

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

        excludedNodes = detachExcludedNodes(bodyScene, excludedNodeNames);
        applyBodyMetallicCoating(bodyScene, environmentMapRef.current);
        if (mayxoayNode) applyMayxoayMetallicAccent(mayxoayNode);
        bodyScene.updateMatrixWorld(true);
        setModel(bodyScene);
        onReady();
      } catch (error) {
        console.error("Failed to prepare the combined machine model.", error);
        disposeLoadedScenes();
        onError(error);
      }
    });

    return () => {
      active = false;
      manager.abort();
      disposeLoadedScenes();
      dracoLoader.dispose();
    };
  }, [excludedNodeNames, includeMayxoayNode, onError, onLoadStart, onReady]);

  const bounds = useMemo(() => {
    if (!model) return null;
    return new THREE.Box3().setFromObject(model);
  }, [model]);
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
      />
    </Canvas>
  );
}
