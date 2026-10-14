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
  useMaterialEffectsTest,
  type MaterialEffectsTestState,
} from "./useMaterialEffectsTest";
import { WATER_FLOW_TEST_CONFIG } from "./WaterFlowConfig";
import {
  clearWaterFlowInstances,
  createWaterFlowBranches,
  createWaterFlowParticles,
  createWaterFlowRuntimeScratch,
  type WaterFlowBranch,
  updateWaterFlowInstances,
} from "./waterFlowRuntime";

const BODY_MODEL_URL = "/models/digital-twin/body/coffee_machine_03_v2.glb";
const DRACO_DECODER_PATH = "/draco-gltf/";
const COFFEE_OUTLET_NODE_NAME = "DR08_CT8-1";

export interface WaterFlowTestCanvasProps {
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

function fitWaterCamera(
  camera: THREE.Camera,
  controls: OrbitControlsImpl,
  bounds: THREE.Box3,
  zoomLevel: number,
) {
  if (!(camera instanceof THREE.PerspectiveCamera) || bounds.isEmpty()) return;

  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxSize) || maxSize <= 0) return;

  const fitHeightDistance =
    maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  const fitWidthDistance = fitHeightDistance / Math.max(camera.aspect, 0.01);
  const distance =
    1.35 * Math.max(fitHeightDistance, fitWidthDistance) *
    Math.pow(0.82, zoomLevel);
  const direction = new THREE.Vector3(1, 0.7, 1).normalize();

  camera.near = Math.max(maxSize / 1000, 0.001);
  camera.far = Math.max(maxSize * 100, 10);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = Math.max(maxSize * 0.15, 0.05);
  controls.maxDistance = Math.max(maxSize * 8, 5);
  controls.update();
}

function WaterFlowScene({
  onLoadStart,
  onReady,
  onError,
  cameraResetVersion,
  zoomLevel,
  runRequest,
  resetRequest,
  onEffectStateChange,
}: WaterFlowTestCanvasProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const waterMeshRef = useRef<THREE.InstancedMesh>(null);
  const [displayNode, setDisplayNode] = useState<THREE.Object3D | null>(null);
  const [branches, setBranches] = useState<readonly WaterFlowBranch[]>([]);
  const [sceneBounds, setSceneBounds] = useState<THREE.Box3 | null>(null);
  const [outletReferenceSize, setOutletReferenceSize] = useState(0.03);
  const [flowVisible, setFlowVisible] = useState(false);
  const flowVisibleRef = useRef(false);
  const waterParticles = useMemo(
    () => createWaterFlowParticles(WATER_FLOW_TEST_CONFIG, 2),
    [],
  );
  const runtimeScratch = useMemo(createWaterFlowRuntimeScratch, []);
  const branchCurves = useMemo(
    () =>
      branches.map((branch) => {
        const midpoint = branch.start
          .clone()
          .lerp(branch.end, 0.5);
        return new THREE.CatmullRomCurve3([
          branch.start.clone(),
          midpoint,
          branch.end.clone(),
        ]);
      }),
    [branches],
  );
  const waterVisualScale = useMemo(() => {
    const referenceSize = Math.max(outletReferenceSize, 0.001);
    return {
      streamRadius:
        referenceSize * WATER_FLOW_TEST_CONFIG.streamRadiusRatio,
      particleRadius:
        referenceSize * WATER_FLOW_TEST_CONFIG.particleRadiusRatio,
      targetRadius: referenceSize * WATER_FLOW_TEST_CONFIG.targetRadiusRatio,
    };
  }, [outletReferenceSize]);

  const setFlowActive = useCallback((active: boolean) => {
    if (flowVisibleRef.current === active) return;
    flowVisibleRef.current = active;
    setFlowVisible(active);
  }, []);

  const handleWaterFrame = useCallback(
    (progress: number, phase: DigitalTwinMaterialEffectPhase) => {
      const mesh = waterMeshRef.current;
      const isRunning =
        (phase === "running" || phase === "complete") && progress > 0;

      if (!mesh || !isRunning || branches.length === 0) {
        if (mesh) clearWaterFlowInstances(mesh);
        setFlowActive(false);
        return;
      }

      setFlowActive(true);
      updateWaterFlowInstances({
        mesh,
        particles: waterParticles,
        config: WATER_FLOW_TEST_CONFIG,
        progress,
        branches,
        scratch: runtimeScratch,
      });
    },
    [branches, runtimeScratch, setFlowActive, waterParticles],
  );

  const { run: runWater, reset: resetWater } = useMaterialEffectsTest({
    effect: WATER_FLOW_TEST_CONFIG.effect,
    durationMs: WATER_FLOW_TEST_CONFIG.durationMs,
    onFrame: handleWaterFrame,
    onStateChange: onEffectStateChange,
  });

  const previousRunRequestRef = useRef(runRequest);
  const previousResetRequestRef = useRef(resetRequest);

  useEffect(() => {
    let active = true;
    let loadedRoot: THREE.Group | null = null;
    const manager = new THREE.LoadingManager();
    const dracoLoader = new DRACOLoader(manager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(dracoLoader);

    onLoadStart();
    setDisplayNode(null);
    setBranches([]);
    setSceneBounds(null);
    setOutletReferenceSize(0.03);
    setFlowActive(false);

    void loader
      .loadAsync(BODY_MODEL_URL)
      .then((gltf) => {
        if (!active) {
          disposeModel(gltf.scene);
          return;
        }

        try {
          loadedRoot = gltf.scene;
          loadedRoot.updateWorldMatrix(true, true);
          const outletNode = findUniqueSourceNode(
            loadedRoot,
            COFFEE_OUTLET_NODE_NAME,
          );
          outletNode.updateWorldMatrix(true, true);

          const isolatedNode = outletNode.clone(true);
          isolatedNode.matrix.copy(outletNode.matrixWorld);
          isolatedNode.matrixAutoUpdate = false;
          isolatedNode.updateMatrixWorld(true);

          const { branches: nextBranches, referenceSize } =
            createWaterFlowBranches(isolatedNode);
          const nextBounds = new THREE.Box3().setFromObject(isolatedNode);
          setOutletReferenceSize(referenceSize);
          nextBranches.forEach((branch) => {
            nextBounds.expandByPoint(branch.start);
            nextBounds.expandByPoint(branch.end);
          });

          setDisplayNode(isolatedNode);
          setBranches(nextBranches);
          setSceneBounds(nextBounds);
          onReady();
        } catch (error) {
          if (loadedRoot) {
            disposeModel(loadedRoot);
            loadedRoot = null;
          }
          onError(error);
        }
      })
      .catch((error) => {
        if (active) onError(error);
      });

    return () => {
      active = false;
      manager.abort();
      if (loadedRoot) disposeModel(loadedRoot);
      dracoLoader.dispose();
    };
  }, [onError, onLoadStart, onReady, setFlowActive]);

  useEffect(() => {
    if (previousRunRequestRef.current === runRequest) return;
    previousRunRequestRef.current = runRequest;
    runWater();
  }, [runWater, runRequest]);

  useEffect(() => {
    if (previousResetRequestRef.current === resetRequest) return;
    previousResetRequestRef.current = resetRequest;
    resetWater();
  }, [resetRequest, resetWater]);

  useEffect(() => {
    if (!sceneBounds || !controlsRef.current) return;
    fitWaterCamera(camera, controlsRef.current, sceneBounds, zoomLevel);
  }, [camera, cameraResetVersion, sceneBounds, zoomLevel]);

  useEffect(() => {
    return () => {
      const mesh = waterMeshRef.current;
      if (mesh) clearWaterFlowInstances(mesh);
    };
  }, []);

  return (
    <>
      {displayNode ? <primitive object={displayNode} dispose={null} /> : null}
      <group visible={flowVisible} renderOrder={1}>
        {branchCurves.map((curve, index) => (
          <mesh key={`water-branch-${index}`}>
            <tubeGeometry
              args={[curve, 28, waterVisualScale.streamRadius, 10, false]}
            />
            <meshBasicMaterial
              color="#6b3f21"
              transparent
              opacity={0.36}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {branches.map((branch, index) => (
        <mesh key={`water-target-${index}`} position={branch.end}>
          <sphereGeometry args={[waterVisualScale.targetRadius, 16, 10]} />
          <meshBasicMaterial
            color="#6b3f21"
            transparent
            opacity={flowVisible ? 0.45 : 0}
            depthWrite={false}
          />
        </mesh>
      ))}
      <instancedMesh
        ref={waterMeshRef}
        args={[undefined, undefined, waterParticles.length]}
        frustumCulled={false}
        visible={false}
        renderOrder={2}
      >
        <sphereGeometry args={[waterVisualScale.particleRadius, 8, 6]} />
        <meshPhysicalMaterial
          color="#6b3f21"
          emissive="#2b1508"
          emissiveIntensity={0.16}
          roughness={0.42}
          metalness={0}
          transmission={0.12}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </instancedMesh>

      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.45} />
      <directionalLight position={[-4, 2, -3]} intensity={0.55} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={0.05}
        maxDistance={12}
      />
    </>
  );
}

export default function WaterFlowTestCanvas({
  onLoadStart,
  onReady,
  onError,
  canvasLabel,
  cameraResetVersion,
  zoomLevel,
  runRequest,
  resetRequest,
  onEffectStateChange,
}: WaterFlowTestCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      aria-label={canvasLabel}
      camera={{ position: [1, 0.6, 1.4], fov: 38, near: 0.001, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <WaterFlowScene
        onLoadStart={onLoadStart}
        onReady={onReady}
        onError={onError}
        canvasLabel={canvasLabel}
        cameraResetVersion={cameraResetVersion}
        zoomLevel={zoomLevel}
        runRequest={runRequest}
        resetRequest={resetRequest}
        onEffectStateChange={onEffectStateChange}
      />
    </Canvas>
  );
}
