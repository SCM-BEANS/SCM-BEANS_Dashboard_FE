import { Suspense, useEffect, useLayoutEffect, useMemo } from "react";
import { Bounds, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Box3, Group, Material, Mesh, Object3D, Vector3 } from "three";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import { DIGITAL_TWIN_PART_NODES, getPartEntrance, getPartVisibility, getPartYaw, getWholeVisibility } from "./digital-twin-story";

const MODEL_URL = "/models/digital-twin/body/coffee_machine_03_v2.glb";

interface FadeMaterial {
  material: Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

function cloneMaterials(root: Object3D): FadeMaterial[] {
  const result: FadeMaterial[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const cloned = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
    child.material = cloned;
    const materials = Array.isArray(cloned) ? cloned : [cloned];
    materials.forEach((material) => result.push({
      material,
      opacity: material.opacity,
      transparent: material.transparent,
      depthWrite: material.depthWrite,
    }));
  });
  return result;
}

function showAtOpacity(root: Object3D, materials: FadeMaterial[], weight: number) {
  root.visible = weight > 0.001;
  if (!root.visible) return;
  materials.forEach(({ material, opacity, transparent, depthWrite }) => {
    const shouldBeTransparent = transparent || weight < 0.999;
    if (material.transparent !== shouldBeTransparent) {
      material.transparent = shouldBeTransparent;
      material.needsUpdate = true;
    }
    material.opacity = opacity * weight;
    material.depthWrite = depthWrite && weight >= 0.999;
  });
}

function CoffeeMachineModel({ progress }: { progress: number }) {
  const { scene } = useGLTF(MODEL_URL);
  const { invalidate } = useThree();
  const visuals = useMemo(() => {
    const whole = scene.clone(true);
    const fullBox = new Box3().setFromObject(whole);
    const fullCenter = fullBox.getCenter(new Vector3());
    const fullSize = fullBox.getSize(new Vector3());
    const fullExtent = Math.max(fullSize.x, fullSize.y, fullSize.z);
    const wholeMaterials = cloneMaterials(whole);

    const parts = DIGITAL_TWIN_PART_NODES.map((name) => {
      const source = scene.getObjectByName(name);
      if (!source) return null;

      const part = source.clone(true);
      const box = new Box3().setFromObject(part);
      const center = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      const extent = Math.max(size.x, size.y, size.z, 0.001);
      part.position.sub(center);

      const group = new Group();
      group.add(part);
      group.position.copy(fullCenter);
      const baseScale = Math.min(4.2, Math.max(0.8, (fullExtent / extent) * 0.85));
      group.scale.setScalar(baseScale);
      group.visible = false;
      return { group, materials: cloneMaterials(group), baseScale, centerY: fullCenter.y, lift: fullSize.y * 0.07 };
    });

    return { whole, wholeMaterials, parts };
  }, [scene]);

  useLayoutEffect(() => {
    showAtOpacity(visuals.whole, visuals.wholeMaterials, getWholeVisibility(progress));
    visuals.parts.forEach((part, index) => {
      if (!part) return;
      const entrance = getPartEntrance(progress, index);
      part.group.position.y = part.centerY - part.lift * (1 - entrance);
      part.group.scale.setScalar(part.baseScale * (0.9 + 0.1 * entrance));
      part.group.rotation.y = getPartYaw(progress, index);
      showAtOpacity(part.group, part.materials, getPartVisibility(progress, index));
    });
    invalidate();
  }, [invalidate, progress, visuals]);

  useEffect(() => () => {
    visuals.wholeMaterials.forEach(({ material }) => material.dispose());
    visuals.parts.forEach((part) => part?.materials.forEach(({ material }) => material.dispose()));
  }, [visuals]);

  return (
    <>
      <Bounds fit clip margin={1.2}>
        <primitive object={visuals.whole} dispose={null} />
      </Bounds>
      {visuals.parts.map((part, index) => part && (
        <primitive key={DIGITAL_TWIN_PART_NODES[index]} object={part.group} dispose={null} />
      ))}
    </>
  );
}

export default function DigitalTwinViewer({ progress }: { progress: number }) {
  const { active, progress: loadProgress } = useProgress();

  return (
    <>
      <Canvas
        camera={{ position: [6, 2.5, -3], fov: 36, near: 0.01, far: 2000 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ alpha: false, antialias: true, powerPreference: "low-power" }}
        fallback={<div className="digital-twin-loader">{HOME_MESSAGES.DIGITAL_TWIN.UNSUPPORTED}</div>}
      >
        <color attach="background" args={["#f8f6f3"]} />
        <ambientLight intensity={1.25} />
        <directionalLight position={[-4, 7, 5]} intensity={2.1} />
        <directionalLight position={[5, 2, -4]} intensity={1.1} />
        <Suspense fallback={null}>
          <CoffeeMachineModel progress={progress} />
        </Suspense>
      </Canvas>

      {active && (
        <div className="digital-twin-progress" role="status" aria-live="polite">
          <span>{HOME_MESSAGES.DIGITAL_TWIN.LOAD_PROGRESS}</span>
          <strong>{Math.round(loadProgress)}%</strong>
        </div>
      )}
    </>
  );
}
