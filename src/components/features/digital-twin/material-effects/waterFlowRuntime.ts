import * as THREE from "three";
import type { WaterFlowTestConfig } from "./WaterFlowConfig";

export interface WaterFlowParticle {
  branchIndex: number;
  emissionOffset: number;
  lateralOffset: [number, number];
  phase: number;
  scale: number;
  rotation: number;
}

export interface WaterFlowBranch {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

export interface WaterFlowBranchLayout {
  branches: readonly WaterFlowBranch[];
  referenceSize: number;
}

export interface WaterFlowRuntimeScratch {
  localStart: THREE.Vector3;
  localEnd: THREE.Vector3;
  localPosition: THREE.Vector3;
  dummy: THREE.Object3D;
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWaterFlowParticles(
  config: WaterFlowTestConfig,
  branchCount = 2,
): readonly WaterFlowParticle[] {
  const random = createSeededRandom(config.seed);
  const count = config.particleCount;

  return Array.from({ length: count }, (_, index) => ({
    branchIndex: index % Math.max(branchCount, 1),
    // Emit droplets at even intervals so the test represents a continuous
    // stream instead of one stretched burst.
    emissionOffset: count <= 1 ? 0 : index / (count - 1),
    lateralOffset: [(random() * 2 - 1) * 0.004, (random() * 2 - 1) * 0.004],
    phase: random() * Math.PI * 2,
    scale: 0.72 + random() * 0.56,
    rotation: random() * Math.PI * 2,
  }));
}

export function createWaterFlowRuntimeScratch(): WaterFlowRuntimeScratch {
  return {
    localStart: new THREE.Vector3(),
    localEnd: new THREE.Vector3(),
    localPosition: new THREE.Vector3(),
    dummy: new THREE.Object3D(),
  };
}

/**
 * Build two parallel, world-vertical streams from the two DR08_CT8-1 outlets.
 * The outlet node supplies the source positions; the flow direction is kept
 * explicitly vertical so the body effect cannot inherit an outward V shape.
 */
export function createWaterFlowBranches(
  outletNode: THREE.Object3D,
): WaterFlowBranchLayout {
  outletNode.updateWorldMatrix(true, false);
  const outletBounds = new THREE.Box3().setFromObject(outletNode);
  const outletSize = outletBounds.getSize(new THREE.Vector3());
  const outletWorldMatrix = outletNode.matrixWorld;
  const verticalDown = new THREE.Vector3(0, -1, 0);
  const referenceSize = Math.max(
    Math.min(outletSize.x, outletSize.y, outletSize.z),
    0.001,
  );

  const halfOutletSpan = 0.015;
  const outletLocalY = 0.003;
  const outletLocalZ = 0.03;
  const dropDistance = Math.max(outletSize.length() * 12, 0.45);

  const branches = [-1, 1].map((direction) => {
    const start = new THREE.Vector3(
      direction * halfOutletSpan,
      outletLocalY,
      outletLocalZ,
    ).applyMatrix4(outletWorldMatrix);
    const end = start.clone().addScaledVector(verticalDown, dropDistance);
    return { start, end };
  });

  return { branches, referenceSize };
}

export function createWaterFlowBounds(outletNode: THREE.Object3D) {
  const { branches } = createWaterFlowBranches(outletNode);
  const bounds = new THREE.Box3().setFromObject(outletNode);
  branches.forEach((branch) => {
    bounds.expandByPoint(branch.start);
    bounds.expandByPoint(branch.end);
  });
  return bounds;
}

export function clearWaterFlowInstances(mesh: THREE.InstancedMesh) {
  mesh.count = 0;
  mesh.visible = false;
  mesh.instanceMatrix.needsUpdate = true;
}

export function updateWaterFlowInstances({
  mesh,
  particles,
  config,
  progress,
  elapsedMs,
  branches,
  scratch,
}: {
  mesh: THREE.InstancedMesh;
  particles: readonly WaterFlowParticle[];
  config: WaterFlowTestConfig;
  progress: number;
  elapsedMs?: number;
  branches: readonly WaterFlowBranch[];
  scratch: WaterFlowRuntimeScratch;
}) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
  const effectiveElapsedMs =
    elapsedMs ?? clampedProgress * Math.max(config.durationMs, 1);
  const travelDurationMs = Math.max(config.particleTravelDurationMs, 1);
  const dummy = scratch.dummy;
  let visibleParticleCount = 0;

  if (branches.length === 0) {
    clearWaterFlowInstances(mesh);
    return;
  }

  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const branch = branches[particle.branchIndex % branches.length];
    const emissionTimeMs =
      particle.emissionOffset * Math.max(config.durationMs, 1);
    const particleAgeMs = effectiveElapsedMs - emissionTimeMs;
    const hasEmitted = particleAgeMs >= 0;
    const travelProgress = hasEmitted
      ? THREE.MathUtils.clamp(particleAgeMs / travelDurationMs, 0, 1)
      : 0;
    const isVisible = hasEmitted && travelProgress < 1;
    if (isVisible) visibleParticleCount += 1;

    const easedProgress =
      travelProgress * travelProgress * (3 - 2 * travelProgress);
    scratch.localStart.copy(branch.start);
    scratch.localEnd.copy(branch.end);
    scratch.localPosition
      .copy(scratch.localStart)
      .lerp(scratch.localEnd, easedProgress);

    const lateralEnvelope = Math.sin(easedProgress * Math.PI);
    scratch.localPosition.x +=
      particle.lateralOffset[0] * lateralEnvelope +
      Math.sin(easedProgress * Math.PI * 3 + particle.phase) * 0.0025;
    scratch.localPosition.z +=
      particle.lateralOffset[1] * lateralEnvelope +
      Math.cos(easedProgress * Math.PI * 2 + particle.phase) * 0.0025;

    dummy.position.copy(scratch.localPosition);
    dummy.rotation.set(
      particle.rotation + easedProgress * Math.PI * 2,
      particle.phase,
      particle.rotation,
    );
    const scale = isVisible ? particle.scale : 0;
    dummy.scale.set(scale * 0.72, scale * 1.45, scale * 0.72);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  mesh.count = particles.length;
  mesh.visible = visibleParticleCount > 0;
  mesh.instanceMatrix.needsUpdate = true;
}
