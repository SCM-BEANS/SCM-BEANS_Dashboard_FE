"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { createMechanismAssembly } from "./assembly/createMechanismAssembly.js";

type MechanismAssembly = ReturnType<typeof createMechanismAssembly>;
export type DigitalTwinAssemblyController = MechanismAssembly;

interface DigitalTwinCanvasProps {
  onLoadStart: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
  onAssemblyCreated: (assembly: DigitalTwinAssemblyController | null) => void;
  canvasLabel: string;
  cameraResetVersion: number;
}

interface MechanismSceneProps extends Omit<DigitalTwinCanvasProps, "canvasLabel"> {}

function fitCameraToAssembly(
  camera: THREE.Camera,
  controls: OrbitControlsImpl,
  root: THREE.Object3D,
) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return;

  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxSize) || maxSize <= 0) return;

  const fitHeightDistance =
    maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  const fitWidthDistance = fitHeightDistance / Math.max(camera.aspect, 0.01);
  const distance = 1.35 * Math.max(fitHeightDistance, fitWidthDistance);
  const direction = new THREE.Vector3(1, 0.72, 1).normalize();

  camera.near = Math.max(maxSize / 1000, 0.001);
  camera.far = Math.max(maxSize * 100, 100);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = Math.max(maxSize * 0.15, 0.05);
  controls.maxDistance = Math.max(maxSize * 8, 10);
  controls.update();
}

function MechanismScene({
  onLoadStart,
  onReady,
  onError,
  onAssemblyCreated,
  cameraResetVersion,
}: MechanismSceneProps) {
  const { camera } = useThree();
  const [root, setRoot] = useState<THREE.Group | null>(null);
  const assemblyRef = useRef<MechanismAssembly | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let active = true;
    let settled = false;
    let disposed = false;
    let dracoLoader: DRACOLoader | null = null;
    const loadingManager = new THREE.LoadingManager();

    class AssemblyGLTFLoader extends GLTFLoader {
      constructor() {
        super(loadingManager);
      }
    }

    class AssemblyDRACOLoader extends DRACOLoader {
      constructor() {
        super(loadingManager);
        dracoLoader = this;
      }
    }

    let assembly: MechanismAssembly;
    try {
      assembly = createMechanismAssembly({
        dependencies: {
          THREE,
          GLTFLoader: AssemblyGLTFLoader,
          DRACOLoader: AssemblyDRACOLoader,
        },
      });
    } catch (error) {
      onError(error);
      return;
    }

    assemblyRef.current = assembly;
    assembly.setAnimationPlaying(false);
    assembly.setManualDirection(0);
    assembly.setCoffeeVisible(false);
    assembly.setCoffeePlaying(false);
    onAssemblyCreated(assembly);
    readyRef.current = false;
    setRoot(assembly.root);
    onLoadStart();

    const disposeOnce = (abortRequests = false) => {
      if (disposed) return;
      disposed = true;
      readyRef.current = false;
      if (abortRequests) loadingManager.abort();
      assembly.setManualDirection(0);
      assembly.setAnimationPlaying(false);
      assembly.setCoffeePlaying(false);
      assembly.dispose();
      dracoLoader?.dispose();
    };

    const loadPromise = assembly.load();
    void loadPromise.then(
      () => {
        settled = true;
        if (!active) {
          disposeOnce();
          return;
        }

        const controls = controlsRef.current;
        if (controls) fitCameraToAssembly(camera, controls, assembly.root);
        readyRef.current = true;
        onReady();
      },
      (error: unknown) => {
        settled = true;
        if (!active) {
          disposeOnce();
          return;
        }

        disposeOnce(true);
        onError(error);
      },
    );

    return () => {
      active = false;
      readyRef.current = false;
      if (assemblyRef.current === assembly) {
        assemblyRef.current = null;
        onAssemblyCreated(null);
      }

      if (settled) {
        disposeOnce();
      } else {
        // Let Three.js finish the in-flight load before disposing it. Aborting
        // here logs an AbortError during normal tab switches, even though the
        // request was intentionally canceled.
        void loadPromise.then(
          () => disposeOnce(),
          () => disposeOnce(),
        );
      }
    };
  }, [camera, onAssemblyCreated, onError, onLoadStart, onReady]);

  useEffect(() => {
    const assembly = assemblyRef.current;
    const controls = controlsRef.current;
    if (!readyRef.current || !assembly || !controls) return;
    fitCameraToAssembly(camera, controls, assembly.root);
  }, [camera, cameraResetVersion]);

  useFrame((_state, delta) => {
    if (readyRef.current) assemblyRef.current?.update(delta);
  });

  return (
    <>
      {root ? <primitive object={root} dispose={null} /> : null}
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 8, 5]} intensity={2} />
      <directionalLight position={[-5, 3, -4]} intensity={0.8} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        enablePan
        enableZoom
        enableRotate
        minDistance={0.05}
        maxDistance={100}
      />
    </>
  );
}

export default function DigitalTwinCanvas({
  onLoadStart,
  onReady,
  onError,
  onAssemblyCreated,
  canvasLabel,
  cameraResetVersion,
}: DigitalTwinCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      aria-label={canvasLabel}
      camera={{ position: [3, 2.4, 4.5], fov: 45, near: 0.001, far: 1000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <MechanismScene
        onLoadStart={onLoadStart}
        onReady={onReady}
        onError={onError}
        onAssemblyCreated={onAssemblyCreated}
        cameraResetVersion={cameraResetVersion}
      />
    </Canvas>
  );
}
