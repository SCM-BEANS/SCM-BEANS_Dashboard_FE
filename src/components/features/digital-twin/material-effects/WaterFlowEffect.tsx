"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { DigitalTwinMaterialEffectPhase } from "@/schemas/digitalTwinMaterialEffects";
import { WATER_FLOW_TEST_CONFIG } from "./WaterFlowConfig";
import {
  clearWaterFlowInstances,
  createWaterFlowBranches,
  createWaterFlowParticles,
  createWaterFlowRuntimeScratch,
  updateWaterFlowInstances,
  type WaterFlowBranchLayout,
} from "./waterFlowRuntime";

export interface WaterFlowPlayback {
  phase: DigitalTwinMaterialEffectPhase;
  cycleId: string | null;
}

interface WaterFlowEffectProps {
  sourceNode: THREE.Object3D | null;
  playback: WaterFlowPlayback;
}

export function WaterFlowEffect({
  sourceNode,
  playback,
}: WaterFlowEffectProps) {
  const waterMeshRef = useRef<THREE.InstancedMesh>(null);
  const runtimeRef = useRef({
    activeCycleId: null as string | null,
    elapsedMs: 0,
    completed: false,
  });
  const [flowVisible, setFlowVisible] = useState(false);
  const flowVisibleRef = useRef(false);
  const branchLayout = useMemo<WaterFlowBranchLayout | null>(() => {
    if (!sourceNode) return null;
    return createWaterFlowBranches(sourceNode);
  }, [sourceNode]);
  const branchCurves = useMemo(
    () =>
      branchLayout?.branches.map((branch) => {
        const midpoint = branch.start.clone().lerp(branch.end, 0.5);
        return new THREE.CatmullRomCurve3([
          branch.start.clone(),
          midpoint,
          branch.end.clone(),
        ]);
      }) ?? [],
    [branchLayout],
  );
  const waterParticles = useMemo(
    () => createWaterFlowParticles(WATER_FLOW_TEST_CONFIG, 2),
    [],
  );
  const runtimeScratch = useMemo(createWaterFlowRuntimeScratch, []);
  const waterVisualScale = useMemo(() => {
    const referenceSize = branchLayout?.referenceSize ?? 0.03;
    return {
      streamRadius:
        referenceSize * WATER_FLOW_TEST_CONFIG.streamRadiusRatio,
      particleRadius:
        referenceSize * WATER_FLOW_TEST_CONFIG.particleRadiusRatio,
    };
  }, [branchLayout]);

  const setFlowActive = useCallback((active: boolean) => {
    if (flowVisibleRef.current === active) return;
    flowVisibleRef.current = active;
    setFlowVisible(active);
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const mesh = waterMeshRef.current;

    if (
      !playback.cycleId ||
      playback.phase === "idle" ||
      playback.phase === "fault"
    ) {
      runtime.activeCycleId = null;
      runtime.elapsedMs = 0;
      runtime.completed = false;
      if (mesh) clearWaterFlowInstances(mesh);
      setFlowActive(false);
      return;
    }

    if (runtime.activeCycleId === playback.cycleId) return;

    runtime.activeCycleId = playback.cycleId;
    runtime.elapsedMs = 0;
    runtime.completed = false;
    if (mesh) clearWaterFlowInstances(mesh);
    setFlowActive(false);
  }, [playback.cycleId, playback.phase, setFlowActive]);

  useEffect(() => {
    return () => {
      const mesh = waterMeshRef.current;
      if (mesh) clearWaterFlowInstances(mesh);
    };
  }, []);

  useFrame((_, deltaSeconds) => {
    const mesh = waterMeshRef.current;
    const runtime = runtimeRef.current;
    const branches = branchLayout?.branches ?? [];

    if (
      !mesh ||
      branches.length === 0 ||
      !runtime.activeCycleId ||
      runtime.completed ||
      (playback.phase !== "running" && playback.phase !== "complete")
    ) {
      return;
    }

    runtime.elapsedMs += Math.min(Math.max(deltaSeconds, 0), 0.1) * 1000;
    const progress = Math.min(
      runtime.elapsedMs / Math.max(WATER_FLOW_TEST_CONFIG.durationMs, 1),
      1,
    );

    setFlowActive(true);
    updateWaterFlowInstances({
      mesh,
      particles: waterParticles,
      config: WATER_FLOW_TEST_CONFIG,
      progress,
      elapsedMs: runtime.elapsedMs,
      branches,
      scratch: runtimeScratch,
    });

    if (
      runtime.elapsedMs >=
      WATER_FLOW_TEST_CONFIG.durationMs +
        WATER_FLOW_TEST_CONFIG.particleTravelDurationMs
    ) {
      runtime.completed = true;
      clearWaterFlowInstances(mesh);
      setFlowActive(false);
    }
  });

  return (
    <>
      <group visible={flowVisible} renderOrder={1}>
        {branchCurves.map((curve, index) => (
          <mesh key={`body-water-branch-${index}`}>
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
    </>
  );
}
