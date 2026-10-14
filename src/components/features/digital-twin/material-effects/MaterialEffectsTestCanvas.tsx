"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DigitalTwinMaterialEffectPhase } from "@/schemas/digitalTwinMaterialEffects";
import {
  MAYXOAY_COFFEE_OUTLET,
  MAYXOAY_COFFEE_EFFECT,
  MAYXOAY_MODEL_URL,
  MAYXOAY_PRESENTATION_ROTATION_Y,
} from "./MaterialEffectsConfig";
import {
  useMaterialEffectsTest,
  type MaterialEffectsTestState,
} from "./useMaterialEffectsTest";
import {
  clearCoffeeGroundInstances,
  createCoffeeGroundRuntimeScratch,
  createCoffeeParticleSeeds,
  updateCoffeeGroundInstances,
} from "./coffeeGroundRuntime";

const DRACO_DECODER_PATH = "/draco-gltf/";

export interface MaterialEffectsTestCanvasProps {
  onLoadStart: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
  canvasLabel: string;
  cameraResetVersion: number;
  zoomLevel: number;
  runRequest: number;
  resetRequest: number;
  onEffectStateChange: (state: MaterialEffectsTestState) => void;
}

interface OutletMarkerState {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  radius: number;
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
    throw new Error(`GLB node "${sourceName}" was not found.`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple GLB nodes found for ${sourceName}.`);
  }
  return matches[0];
}

function fitCameraToModel(
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

function OutletMarker({ marker }: { marker: OutletMarkerState }) {
  return (
    <group position={marker.position}>
      <mesh renderOrder={10}>
        <sphereGeometry args={[marker.radius, 24, 16]} />
        <meshBasicMaterial
          color="#f59e0b"
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.72}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={11}>
        <torusGeometry args={[marker.radius * 1.45, marker.radius * 0.08, 12, 32]} />
        <meshBasicMaterial
          color="#fde68a"
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
}

function MaterialEffectsScene({
  onLoadStart,
  onReady,
  onError,
  cameraResetVersion,
  zoomLevel,
  runRequest,
  resetRequest,
  onEffectStateChange,
}: Omit<MaterialEffectsTestCanvasProps, "canvasLabel">) {
  const { camera } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [outletMarker, setOutletMarker] =
    useState<OutletMarkerState | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const coffeeMeshRef = useRef<THREE.InstancedMesh>(null);
  const anchorPositionRef = useRef(new THREE.Vector3());
  const anchorQuaternionRef = useRef(new THREE.Quaternion());
  const coffeeParticles = useMemo(
    () => createCoffeeParticleSeeds(MAYXOAY_COFFEE_EFFECT),
    [],
  );
  const runtimeScratch = useMemo(createCoffeeGroundRuntimeScratch, []);

  const handleCoffeeFrame = useCallback(
    (progress: number, phase: DigitalTwinMaterialEffectPhase) => {
      const mesh = coffeeMeshRef.current;
      if (!mesh) return;

      if (
        !outletMarker ||
        phase === "idle" ||
        phase === "fault" ||
        progress <= 0
      ) {
        clearCoffeeGroundInstances(mesh);
        return;
      }

      const anchorPosition = anchorPositionRef.current.set(
        outletMarker.position[0],
        outletMarker.position[1],
        outletMarker.position[2],
      );
      const anchorQuaternion = anchorQuaternionRef.current.set(
        outletMarker.quaternion[0],
        outletMarker.quaternion[1],
        outletMarker.quaternion[2],
        outletMarker.quaternion[3],
      );
      updateCoffeeGroundInstances({
        mesh,
        particles: coffeeParticles,
        effect: MAYXOAY_COFFEE_EFFECT,
        progress,
        anchorPosition,
        anchorQuaternion,
        scratch: runtimeScratch,
      });
    },
    [coffeeParticles, outletMarker, runtimeScratch],
  );

  const { run: runCoffee, reset: resetCoffee } = useMaterialEffectsTest({
    effect: MAYXOAY_COFFEE_EFFECT.effect,
    durationMs: MAYXOAY_COFFEE_EFFECT.durationMs,
    onFrame: handleCoffeeFrame,
    onStateChange: onEffectStateChange,
  });

  const previousRunRequestRef = useRef(runRequest);
  const previousResetRequestRef = useRef(resetRequest);

  useEffect(() => {
    if (previousRunRequestRef.current === runRequest) return;
    previousRunRequestRef.current = runRequest;
    runCoffee();
  }, [runCoffee, runRequest]);

  useEffect(() => {
    if (previousResetRequestRef.current === resetRequest) return;
    previousResetRequestRef.current = resetRequest;
    resetCoffee();
  }, [resetCoffee, resetRequest]);

  useEffect(() => {
    coffeeMeshRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useEffect(() => {
    let active = true;
    let loadedScene: THREE.Group | null = null;
    const abortController = new AbortController();
    const manager = new THREE.LoadingManager();
    const dracoLoader = new DRACOLoader(manager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(dracoLoader);

    onLoadStart();
    setModel(null);
    setOutletMarker(null);

    void loader
      .loadAsync(MAYXOAY_MODEL_URL)
      .then((gltf) => {
        if (!active || abortController.signal.aborted) {
          disposeModel(gltf.scene);
          return;
        }

        try {
          gltf.scene.updateWorldMatrix(true, true);
          const sourceBounds = new THREE.Box3().setFromObject(gltf.scene);
          if (sourceBounds.isEmpty()) {
            throw new Error("Mayxoay model has no visible geometry.");
          }

          const presentationRoot = new THREE.Group();
          presentationRoot.name = "MayxoayMaterialEffectsPresentation";
          presentationRoot.position.copy(
            sourceBounds.getCenter(new THREE.Vector3()),
          );
          presentationRoot.updateMatrixWorld(true);
          presentationRoot.attach(gltf.scene);
          presentationRoot.rotation.y = MAYXOAY_PRESENTATION_ROTATION_Y;
          presentationRoot.updateMatrixWorld(true);
          loadedScene = presentationRoot;

          const outletNode = findUniqueSourceNode(
            gltf.scene,
            MAYXOAY_COFFEE_OUTLET.sourceName,
          );
          presentationRoot.updateWorldMatrix(true, true);
          outletNode.updateWorldMatrix(true, true);

          const modelBounds = new THREE.Box3().setFromObject(presentationRoot);
          const outletBounds = new THREE.Box3().setFromObject(outletNode);
          if (modelBounds.isEmpty() || outletBounds.isEmpty()) {
            throw new Error("Mayxoay model or outlet bounds are empty.");
          }

          const outletSize = outletBounds.getSize(new THREE.Vector3());
          const modelSize = modelBounds.getSize(new THREE.Vector3());
          const outletQuaternion = outletNode.getWorldQuaternion(
            new THREE.Quaternion(),
          );
          const dischargeDirection = new THREE.Vector3(
            MAYXOAY_COFFEE_EFFECT.dischargeDirection[0],
            MAYXOAY_COFFEE_EFFECT.dischargeDirection[1],
            MAYXOAY_COFFEE_EFFECT.dischargeDirection[2],
          )
            .normalize()
            .applyQuaternion(outletQuaternion)
            .normalize();
          // Mayxoay1-2 is the grinder assembly. Start at its underside rather
          // than at the centre of the mesh so the grounds leave the machine.
          const outletCenter = new THREE.Vector3(
            (outletBounds.min.x + outletBounds.max.x) * 0.5,
            outletBounds.min.y,
            (outletBounds.min.z + outletBounds.max.z) * 0.5,
          );
          const markerSize = Math.max(
            Math.max(outletSize.x, outletSize.y, outletSize.z) * 0.25,
            Math.max(modelSize.x, modelSize.y, modelSize.z) * 0.018,
            0.015,
          );
          outletCenter.addScaledVector(dischargeDirection, markerSize * 0.6);

          setOutletMarker({
            position: [outletCenter.x, outletCenter.y, outletCenter.z],
            quaternion: [
              outletQuaternion.x,
              outletQuaternion.y,
              outletQuaternion.z,
              outletQuaternion.w,
            ],
            radius: Math.max(markerSize, 0.001),
          });
          setModel(presentationRoot);
          onReady();
        } catch (error) {
          if (loadedScene) {
            disposeModel(loadedScene);
            loadedScene = null;
          } else {
            disposeModel(gltf.scene);
          }
          onError(error);
        }
      })
      .catch((error) => {
        if (active && !abortController.signal.aborted) onError(error);
      });

    return () => {
      active = false;
      abortController.abort();
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
    fitCameraToModel(camera, controlsRef.current, bounds, zoomLevel);
  }, [bounds, camera, cameraResetVersion, model, zoomLevel]);

  return (
    <>
      {model ? <primitive object={model} dispose={null} /> : null}
      {outletMarker ? <OutletMarker marker={outletMarker} /> : null}
      <instancedMesh
        ref={coffeeMeshRef}
        args={[undefined, undefined, coffeeParticles.length]}
        frustumCulled={false}
        visible={false}
      >
        <sphereGeometry args={[MAYXOAY_COFFEE_EFFECT.particleRadius, 6, 4]} />
        <meshStandardMaterial
          color="#6b3f21"
          emissive="#2b1508"
          emissiveIntensity={MAYXOAY_COFFEE_EFFECT.highlightOpacity}
          metalness={0}
          roughness={0.95}
          transparent
          opacity={MAYXOAY_COFFEE_EFFECT.particleOpacity}
        />
      </instancedMesh>
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

export default function MaterialEffectsTestCanvas({
  onLoadStart,
  onReady,
  onError,
  canvasLabel,
  cameraResetVersion,
  zoomLevel,
  runRequest,
  resetRequest,
  onEffectStateChange,
}: MaterialEffectsTestCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      aria-label={canvasLabel}
      camera={{ position: [3, 2.4, 4.5], fov: 38, near: 0.001, far: 1000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <MaterialEffectsScene
        onLoadStart={onLoadStart}
        onReady={onReady}
        onError={onError}
        cameraResetVersion={cameraResetVersion}
        zoomLevel={zoomLevel}
        runRequest={runRequest}
        resetRequest={resetRequest}
        onEffectStateChange={onEffectStateChange}
      />
    </Canvas>
  );
}
