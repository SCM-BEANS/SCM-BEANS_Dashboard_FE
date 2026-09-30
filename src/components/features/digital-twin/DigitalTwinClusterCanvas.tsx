"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const CLUSTER_MODEL_URL = "/models/digital-twin/cluster-02/may_xoay.glb";
const MAYXOAY_NODE_NAME = "Mayxoay1-2";
const DRACO_DECODER_PATH = "/draco-gltf/";

interface DigitalTwinClusterCanvasProps {
  onLoadStart: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
  canvasLabel: string;
  cameraResetVersion: number;
  zoomLevel: number;
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

function isolateMayxoay(root: THREE.Group) {
  const mayxoay = root.getObjectByName(MAYXOAY_NODE_NAME);
  if (!mayxoay) {
    throw new Error(`GLB node "${MAYXOAY_NODE_NAME}" was not found.`);
  }

  mayxoay.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(mayxoay);
  if (bounds.isEmpty()) {
    throw new Error(`GLB node "${MAYXOAY_NODE_NAME}" has no visible geometry.`);
  }

  const worldTransform = mayxoay.matrixWorld.clone();
  const center = bounds.getCenter(new THREE.Vector3());
  mayxoay.removeFromParent();
  mayxoay.matrix.copy(worldTransform);
  mayxoay.matrixAutoUpdate = false;

  const isolatedModel = new THREE.Group();
  isolatedModel.add(mayxoay);
  isolatedModel.position.copy(center).negate();
  isolatedModel.updateMatrixWorld(true);

  return isolatedModel;
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

function ClusterScene({
  onLoadStart,
  onReady,
  onError,
  cameraResetVersion,
  zoomLevel,
}: Omit<DigitalTwinClusterCanvasProps, "canvasLabel">) {
  const { camera } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    let active = true;
    let loadedScene: THREE.Group | null = null;
    const manager = new THREE.LoadingManager();
    const dracoLoader = new DRACOLoader(manager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(dracoLoader);
    onLoadStart();

    loader.load(
      CLUSTER_MODEL_URL,
      (gltf) => {
        if (!active) {
          disposeModel(gltf.scene);
          return;
        }

        try {
          loadedScene = isolateMayxoay(gltf.scene);
          setModel(loadedScene);
          onReady();
        } catch (error) {
          disposeModel(gltf.scene);
          onError(error);
        }
      },
      undefined,
      (error) => {
        if (active) onError(error);
      },
    );

    return () => {
      active = false;
      manager.abort();
      if (loadedScene) disposeModel(loadedScene);
      dracoLoader.dispose();
    };
  }, [onError, onLoadStart, onReady]);

  const bounds = useMemo(() => {
    if (!model) return null;
    return new THREE.Box3().setFromObject(model);
  }, [model]);

  useEffect(() => {
    if (!model || !bounds || !controlsRef.current) return;
    fitCameraToCluster(camera, controlsRef.current, bounds, zoomLevel);
  }, [bounds, camera, cameraResetVersion, model, zoomLevel]);

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
  onLoadStart,
  onReady,
  onError,
  canvasLabel,
  cameraResetVersion,
  zoomLevel,
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
        onLoadStart={onLoadStart}
        onReady={onReady}
        onError={onError}
        cameraResetVersion={cameraResetVersion}
        zoomLevel={zoomLevel}
      />
    </Canvas>
  );
}
