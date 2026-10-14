import * as THREE from "three";
import type { MaterialEffectCoffeeConfig } from "@/schemas/digitalTwinMaterialEffects";

export interface CoffeeParticleSeed {
  spawnOffset: [number, number, number];
  targetOffset: [number, number, number];
  emissionOffset: number;
  delay: number;
  scale: number;
  rotation: [number, number, number];
  drift: [number, number];
}

export interface CoffeeGroundRuntimeScratch {
  localStart: THREE.Vector3;
  localTarget: THREE.Vector3;
  localPosition: THREE.Vector3;
  worldPosition: THREE.Vector3;
  localDirection: THREE.Vector3;
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

export function createCoffeeParticleSeeds(
  effect: MaterialEffectCoffeeConfig,
  options: {
    spawnRadiusMeters?: number;
    verticalSpawnSpreadMeters?: number;
    targetRadiusMeters?: number;
    verticalTargetSpreadMeters?: number;
  } = {},
): readonly CoffeeParticleSeed[] {
  const random = createSeededRandom(effect.seed);
  const signed = () => random() * 2 - 1;

  return Array.from({ length: effect.maxParticleCount }, (_, index) => {
    const spawnOffset: CoffeeParticleSeed["spawnOffset"] =
      options.spawnRadiusMeters === undefined
        ? [
            signed() * effect.spawnSpread[0],
            signed() * effect.spawnSpread[1],
            signed() * effect.spawnSpread[2],
          ]
        : (() => {
            const angle = random() * Math.PI * 2;
            const radius =
              Math.sqrt(random()) * Math.max(options.spawnRadiusMeters, 0);
            return [
              Math.cos(angle) * radius,
              signed() *
                (options.verticalSpawnSpreadMeters ?? effect.spawnSpread[1]),
              Math.sin(angle) * radius,
            ];
          })();

    const targetOffset: CoffeeParticleSeed["targetOffset"] =
      options.targetRadiusMeters === undefined
        ? [
            signed() * effect.targetSpread[0],
            signed() * effect.targetSpread[1],
            signed() * effect.targetSpread[2],
          ]
        : (() => {
            const angle = random() * Math.PI * 2;
            const radius =
              Math.sqrt(random()) * Math.max(options.targetRadiusMeters, 0);
            return [
              Math.cos(angle) * radius,
              signed() *
                (options.verticalTargetSpreadMeters ??
                  effect.targetSpread[1]),
              Math.sin(angle) * radius,
            ];
          })();

    return {
      spawnOffset,
      targetOffset,
      // Spread emission slots evenly across the configured stream window so
      // the flow is continuous without needing a physics emitter.
      emissionOffset:
        effect.maxParticleCount <= 1
          ? 0
          : index / (effect.maxParticleCount - 1),
      delay: 0.04 + random() * 0.24,
      scale: 0.68 + random() * 0.64,
      rotation: [signed() * Math.PI, signed() * Math.PI, signed() * Math.PI],
      drift: [signed(), signed()],
    };
  });
}

export function createCoffeeGroundRuntimeScratch(): CoffeeGroundRuntimeScratch {
  return {
    localStart: new THREE.Vector3(),
    localTarget: new THREE.Vector3(),
    localPosition: new THREE.Vector3(),
    worldPosition: new THREE.Vector3(),
    localDirection: new THREE.Vector3(),
    dummy: new THREE.Object3D(),
  };
}

export function clearCoffeeGroundInstances(mesh: THREE.InstancedMesh) {
  mesh.count = 0;
  mesh.visible = false;
  mesh.instanceMatrix.needsUpdate = true;
}

export function updateCoffeeGroundInstances({
  mesh,
  particles,
  effect,
  progress,
  elapsedMs,
  anchorPosition,
  anchorQuaternion,
  scratch,
  baseTargetOffset,
  containmentRadiusMeters,
  swayAmplitudeMeters = 0.012,
}: {
  mesh: THREE.InstancedMesh;
  particles: readonly CoffeeParticleSeed[];
  effect: MaterialEffectCoffeeConfig;
  progress: number;
  elapsedMs?: number;
  anchorPosition: THREE.Vector3;
  anchorQuaternion: THREE.Quaternion;
  scratch: CoffeeGroundRuntimeScratch;
  baseTargetOffset?: THREE.Vector3;
  containmentRadiusMeters?: number;
  swayAmplitudeMeters?: number;
}) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
  const effectiveElapsedMs =
    elapsedMs ?? clampedProgress * Math.max(effect.durationMs, 1);
  const particleTravelDurationMs = Math.max(
    effect.particleTravelDurationMs,
    1,
  );
  const localDirection = scratch.localDirection
    .set(
      effect.dischargeDirection[0],
      effect.dischargeDirection[1],
      effect.dischargeDirection[2],
    )
    .normalize();
  const dummy = scratch.dummy;
  let visibleParticleCount = 0;

  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const emissionTimeMs =
      particle.emissionOffset * Math.max(effect.durationMs, 1);
    const particleAgeMs = effectiveElapsedMs - emissionTimeMs;
    const hasEmitted = particleAgeMs >= 0;
    const travelProgress = hasEmitted
      ? THREE.MathUtils.clamp(
          particleAgeMs / particleTravelDurationMs,
          0,
          1,
        )
      : 0;
    const isVisible = hasEmitted && travelProgress < 1;
    if (isVisible) visibleParticleCount += 1;
    const easedProgress =
      travelProgress * travelProgress * (3 - 2 * travelProgress);

    scratch.localStart.set(
      particle.spawnOffset[0],
      particle.spawnOffset[1],
      particle.spawnOffset[2],
    );
    scratch.localTarget.set(
      (baseTargetOffset?.x ?? effect.targetOffset[0]) +
        particle.targetOffset[0],
      (baseTargetOffset?.y ?? effect.targetOffset[1]) +
        particle.targetOffset[1],
      (baseTargetOffset?.z ?? effect.targetOffset[2]) +
        particle.targetOffset[2],
    );
    scratch.localPosition
      .copy(scratch.localStart)
      .lerp(scratch.localTarget, easedProgress)
      .addScaledVector(
        localDirection,
        effect.gravity *
          travelProgress *
          travelProgress *
          (1 - travelProgress),
      );

    const sway =
      Math.sin(travelProgress * Math.PI * 2 + particle.rotation[1]) *
      swayAmplitudeMeters *
      (1 - travelProgress);
    scratch.localPosition.x += sway * particle.drift[0];
    scratch.localPosition.z += sway * particle.drift[1];

    if (containmentRadiusMeters !== undefined) {
      const lateralLength = Math.hypot(
        scratch.localPosition.x,
        scratch.localPosition.z,
      );
      if (lateralLength > containmentRadiusMeters && lateralLength > 0) {
        const containmentScale = containmentRadiusMeters / lateralLength;
        scratch.localPosition.x *= containmentScale;
        scratch.localPosition.z *= containmentScale;
      }
    }

    scratch.worldPosition
      .copy(scratch.localPosition)
      .applyQuaternion(anchorQuaternion)
      .add(anchorPosition);
    dummy.position.copy(scratch.worldPosition);
    dummy.rotation.set(
      particle.rotation[0] + travelProgress * 2.2,
      particle.rotation[1] + travelProgress * 1.5,
      particle.rotation[2] + travelProgress * 2.8,
    );
    const scale = isVisible
      ? particle.scale * (1 - travelProgress * 0.08)
      : 0;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  mesh.count = particles.length;
  mesh.visible = visibleParticleCount > 0;
  mesh.instanceMatrix.needsUpdate = true;
}
