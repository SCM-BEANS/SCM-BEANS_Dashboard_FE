"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type {
  DigitalTwinMaterialEffectPhase,
  MaterialEffectCalibratedAnchor,
  MaterialEffectSurfaceTarget,
} from "@/schemas/digitalTwinMaterialEffects";
import { MAYXOAY_COFFEE_EFFECT } from "./MaterialEffectsConfig";
import {
  clearCoffeeGroundInstances,
  createCoffeeGroundRuntimeScratch,
  createCoffeeParticleSeeds,
  updateCoffeeGroundInstances,
} from "./coffeeGroundRuntime";

export interface CoffeeGroundPlayback {
  phase: DigitalTwinMaterialEffectPhase;
  cycleId: string | null;
}

interface CoffeeGroundEffectProps {
  anchorNode: THREE.Object3D | null;
  anchor: MaterialEffectCalibratedAnchor;
  targetNode: THREE.Object3D | null;
  target: MaterialEffectSurfaceTarget;
  playback: CoffeeGroundPlayback;
}

const LOCAL_UP = new THREE.Vector3(0, 1, 0);
const MAX_PARTICLE_SCALE = 1.32;

export function CoffeeGroundEffect({
  anchorNode,
  anchor,
  targetNode,
  target,
  playback,
}: CoffeeGroundEffectProps) {
  const coffeeMeshRef = useRef<THREE.InstancedMesh>(null);
  const runtimeRef = useRef({
    activeCycleId: null as string | null,
    elapsedMs: 0,
    completed: false,
  });
  const anchorPositionRef = useRef(new THREE.Vector3());
  const anchorNormalRef = useRef(new THREE.Vector3());
  const anchorQuaternionRef = useRef(new THREE.Quaternion());
  const inverseAnchorQuaternionRef = useRef(new THREE.Quaternion());
  const targetWorldPositionRef = useRef(new THREE.Vector3());
  const targetLocalOffsetRef = useRef(new THREE.Vector3());
  const normalMatrixRef = useRef(new THREE.Matrix3());
  const particleRadius = Math.min(
    MAYXOAY_COFFEE_EFFECT.particleRadius,
    // Body grounds are finer than the isolated prototype; keep each sphere
    // visibly small while the spawn envelope remains the Sketch18 diameter.
    anchor.outletDiameterMeters * 0.04,
  );
  const containmentRadiusMeters = Math.max(
    anchor.outletDiameterMeters * 0.5 - particleRadius * MAX_PARTICLE_SCALE,
    0,
  );
  const coffeeParticles = useMemo(
    () =>
      createCoffeeParticleSeeds(MAYXOAY_COFFEE_EFFECT, {
        // Keep every particle, including its radius, inside the 22.5 mm
        // Sketch18 opening at spawn time.
        spawnRadiusMeters: Math.max(
          containmentRadiusMeters,
          0,
        ),
        verticalSpawnSpreadMeters: Math.min(
          MAYXOAY_COFFEE_EFFECT.spawnSpread[1],
          anchor.outletDiameterMeters * 0.14,
        ),
        // The receiving opening is narrower than Sketch18; converge onto its
        // calibrated center rather than scattering through the compressor.
        targetRadiusMeters: 0,
        verticalTargetSpreadMeters: 0,
      }),
    [anchor.outletDiameterMeters, containmentRadiusMeters],
  );
  const runtimeScratch = useMemo(createCoffeeGroundRuntimeScratch, []);

  useEffect(() => {
    coffeeMeshRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const mesh = coffeeMeshRef.current;

    if (
      !playback.cycleId ||
      playback.phase === "idle" ||
      playback.phase === "fault"
    ) {
      runtime.activeCycleId = null;
      runtime.elapsedMs = 0;
      runtime.completed = false;
      if (mesh) clearCoffeeGroundInstances(mesh);
      return;
    }

    if (runtime.activeCycleId === playback.cycleId) return;

    runtime.activeCycleId = playback.cycleId;
    runtime.elapsedMs = 0;
    runtime.completed = false;
    if (mesh) clearCoffeeGroundInstances(mesh);
  }, [playback.cycleId, playback.phase]);

  useEffect(() => {
    return () => {
      const mesh = coffeeMeshRef.current;
      if (mesh) clearCoffeeGroundInstances(mesh);
    };
  }, []);

  useFrame((_, deltaSeconds) => {
    const mesh = coffeeMeshRef.current;
    const runtime = runtimeRef.current;
    if (
      !mesh ||
      !anchorNode ||
      !targetNode ||
      !runtime.activeCycleId ||
      (playback.phase !== "running" && playback.phase !== "complete")
    ) {
      return;
    }

    anchorNode.updateWorldMatrix(true, false);
    anchorPositionRef.current
      .set(
        anchor.localPointMeters[0],
        anchor.localPointMeters[1],
        anchor.localPointMeters[2],
      )
      .applyMatrix4(anchorNode.matrixWorld);

    anchorNormalRef.current
      .set(anchor.localNormal[0], anchor.localNormal[1], anchor.localNormal[2])
      .applyNormalMatrix(
        normalMatrixRef.current.getNormalMatrix(anchorNode.matrixWorld),
      )
      .normalize();
    anchorQuaternionRef.current.setFromUnitVectors(
      LOCAL_UP,
      anchorNormalRef.current,
    );

    targetNode.updateWorldMatrix(true, false);
    targetWorldPositionRef.current
      .set(
        target.localPointMeters[0],
        target.localPointMeters[1],
        target.localPointMeters[2],
      )
      .applyMatrix4(targetNode.matrixWorld);
    targetLocalOffsetRef.current
      .copy(targetWorldPositionRef.current)
      .sub(anchorPositionRef.current)
      .applyQuaternion(
        inverseAnchorQuaternionRef.current
          .copy(anchorQuaternionRef.current)
          .invert(),
      );

    if (
      !runtime.completed &&
      (playback.phase === "running" || playback.phase === "complete")
    ) {
      // Keep the tail of the stream moving after the ten-second emission
      // window so the last emitted grounds can still reach box_nen-1.
      runtime.elapsedMs += Math.min(Math.max(deltaSeconds, 0), 0.1) * 1000;
      runtime.completed =
        runtime.elapsedMs >=
        Math.max(
          MAYXOAY_COFFEE_EFFECT.durationMs +
            MAYXOAY_COFFEE_EFFECT.particleTravelDurationMs,
          1,
        );
    }

    const progress = Math.min(
      runtime.elapsedMs / Math.max(MAYXOAY_COFFEE_EFFECT.durationMs, 1),
      1,
    );
    updateCoffeeGroundInstances({
      mesh,
      particles: coffeeParticles,
      effect: MAYXOAY_COFFEE_EFFECT,
      progress,
      elapsedMs: runtime.elapsedMs,
      anchorPosition: anchorPositionRef.current,
      anchorQuaternion: anchorQuaternionRef.current,
      scratch: runtimeScratch,
      baseTargetOffset: targetLocalOffsetRef.current,
      swayAmplitudeMeters: 0,
    });
  });

  return (
    <instancedMesh
      ref={coffeeMeshRef}
      args={[undefined, undefined, coffeeParticles.length]}
      frustumCulled={false}
      visible={false}
    >
      <sphereGeometry args={[particleRadius, 6, 4]} />
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
  );
}
