"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const BODY_MODEL_URL = "/models/digital-twin/body/Body.glb";
const DRACO_DECODER_PATH = "/draco-gltf/";

interface BodyModelCanvasProps {
  onLoadStart: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
  canvasLabel: string;
  cameraResetVersion: number;
  zoomLevel: number;
}

function disposeModel(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
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
}: Omit<BodyModelCanvasProps, "canvasLabel">) {
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
      BODY_MODEL_URL,
      (gltf) => {
        loadedScene = gltf.scene;
        if (!active) {
          disposeModel(gltf.scene);
          return;
        }

        // Display-only half-turn around the view axis: keep the open face toward
        // the fixed camera while correcting the machine's top/foot orientation.
        gltf.scene.rotateZ(Math.PI);
        gltf.scene.updateMatrixWorld(true);
        setModel(gltf.scene);
        onReady();
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
      />
    </Canvas>
  );
}
