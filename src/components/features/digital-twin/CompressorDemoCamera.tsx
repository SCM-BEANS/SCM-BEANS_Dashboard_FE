"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls } from "three-stdlib";

// Periodic curves keep position and velocity continuous across each orbit.
const ORBIT_DURATION = 40;

export function CompressorDemoCamera({ bounds, controls, playing }: {
  bounds: THREE.Box3;
  controls: React.RefObject<OrbitControls | null>;
  playing: boolean;
}) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const entry = useRef(0);
  const frame = useMemo(() => ({
    center: bounds.getCenter(new THREE.Vector3()),
    radius: bounds.getBoundingSphere(new THREE.Sphere()).radius,
    position: new THREE.Vector3(),
    upRotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), camera.up),
    startPosition: camera.position.clone(),
    startTarget: controls.current?.target.clone() ?? new THREE.Vector3(),
  }), [bounds, camera, controls]);

  useEffect(() => {
    if (playing) {
      frame.startPosition.copy(camera.position);
      if (controls.current) frame.startTarget.copy(controls.current.target);
      entry.current = 0;
    }
  }, [playing, camera, controls, frame]);

  useFrame((_, delta) => {
    if (!playing || !controls.current || !(camera instanceof THREE.PerspectiveCamera)) return;
    // Avoid jumping after returning from a background tab.
    const step = Math.min(delta, 0.05);
    entry.current = Math.min(1, entry.current + step / 1.8);
    elapsed.current = (elapsed.current + step) % ORBIT_DURATION;
    const phase = elapsed.current / ORBIT_DURATION * Math.PI * 2;
    const azimuth = Math.PI / 4 + phase;
    const elevation = THREE.MathUtils.degToRad(28 + 10 * Math.sin(phase));
    const distanceScale = 1.12 + 0.04 * Math.cos(phase);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const limitingFov = Math.min(verticalFov, Math.atan(Math.tan(verticalFov) * camera.aspect));
    const distance = frame.radius / Math.sin(limitingFov) * distanceScale;
    frame.position
      .setFromSphericalCoords(distance, Math.PI / 2 - elevation, azimuth)
      .applyQuaternion(frame.upRotation)
      .add(frame.center);
    const easeIn = entry.current * entry.current * (3 - 2 * entry.current);
    camera.position.lerpVectors(frame.startPosition, frame.position, easeIn);
    controls.current.target.lerpVectors(frame.startTarget, frame.center, easeIn);
    camera.lookAt(controls.current.target);
    controls.current.update();
  });

  return null;
}
