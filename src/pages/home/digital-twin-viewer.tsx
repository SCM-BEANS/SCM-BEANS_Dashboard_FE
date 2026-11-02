import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Bounds, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Box3, Group, Material, Mesh, Object3D, Vector3 } from "three";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import {
  DIGITAL_TWIN_PART_NODES,
  DIGITAL_TWIN_SHELL_NODES,
  getCutaway,
  getFocusedPartIndex,
  getOverviewTurnProgress,
  getWholeVisibility,
} from "./digital-twin-story";

const MODEL_URL = "/models/digital-twin/body/coffee_machine_03_v2.glb";
const PART_ROTATION_DURATION_SECONDS = 24;
const PART_ROTATION_SPEED = (Math.PI * 2) / PART_ROTATION_DURATION_SECONDS;
interface FadeMaterial {
  material: Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

function cloneMaterials(root: Object3D) {
  const records: FadeMaterial[] = [];
  const recordsByObject = new WeakMap<Object3D, FadeMaterial[]>();
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const cloned = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
    child.material = cloned;
    const materials = Array.isArray(cloned) ? cloned : [cloned];
    const meshRecords = materials.map((material) => {
      const record: FadeMaterial = {
        material,
        opacity: material.opacity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      };
      records.push(record);
      return record;
    });
    recordsByObject.set(child, meshRecords);
  });
  return { records, recordsByObject };
}

function collectRecords(root: Object3D | undefined, recordsByObject: WeakMap<Object3D, FadeMaterial[]>) {
  const records: FadeMaterial[] = [];
  root?.traverse((child) => records.push(...(recordsByObject.get(child) ?? [])));
  return records;
}

function setOpacity(records: FadeMaterial[], amount: number, object?: Object3D) {
  if (object) object.visible = amount > 0.001;
  records.forEach(({ material, opacity, transparent, depthWrite }) => {
    const shouldBeTransparent = transparent || amount < 0.999;
    if (material.transparent !== shouldBeTransparent) {
      material.transparent = shouldBeTransparent;
      material.needsUpdate = true;
    }
    material.opacity = opacity * amount;
    material.depthWrite = depthWrite && amount >= 0.999;
  });
}

function CoffeeMachineModel({ progress, rotationEnabled, onReady }: { progress: number; rotationEnabled: boolean; onReady: () => void }) {
  const { scene } = useGLTF(MODEL_URL, "/draco-gltf/");
  const { invalidate } = useThree();
  const renderedFrames = useRef(0);
  const readyRef = useRef(false);
  const checkScheduledRef = useRef(false);
  const activePartIndexRef = useRef(-1);
  const visuals = useMemo(() => {
    scene.updateMatrixWorld(true);
    const wholeModel = scene.clone(true);
    wholeModel.updateMatrixWorld(true);
    const wholeMaterialsData = cloneMaterials(wholeModel);
    const box = new Box3().setFromObject(wholeModel);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    const shells = DIGITAL_TWIN_SHELL_NODES.flatMap((name) => collectRecords(
      wholeModel.getObjectByName(name), wholeMaterialsData.recordsByObject,
    ));
    const wholeCentering = new Group();
    wholeCentering.position.copy(center).negate();
    wholeCentering.add(wholeModel);
    const whole = new Group();
    whole.position.copy(center);
    whole.add(wholeCentering);

    // Focused component models remain separate, as in the source assembly.
    const parts = DIGITAL_TWIN_PART_NODES.map((name) => {
      const source = scene.getObjectByName(name);
      if (!source) return null;
      const part = source.clone(true);
      const partWorld = source.matrixWorld.clone();
      part.matrix.identity();
      part.matrixAutoUpdate = true;
      part.position.set(0, 0, 0);
      part.quaternion.identity();
      part.scale.set(1, 1, 1);
      part.updateMatrix();

      const worldPart = new Group();
      worldPart.matrix.copy(partWorld);
      worldPart.matrixAutoUpdate = false;
      worldPart.add(part);
      worldPart.updateMatrixWorld(true);

      const partBox = new Box3().setFromObject(worldPart);
      const partCenter = partBox.getCenter(new Vector3());
      const partExtent = partBox.getSize(new Vector3());
      const maxPartExtent = Math.max(partExtent.x, partExtent.y, partExtent.z, 0.001);
      const pivot = new Group();
      pivot.position.copy(partCenter).negate();
      pivot.add(worldPart);
      const group = new Group();
      group.add(pivot);
      const baseScale = Math.min(4.2, Math.max(0.8, (extent / maxPartExtent) * 0.85));
      group.scale.setScalar(baseScale);
      group.position.copy(center);
      return { group };
    });

    return {
      whole,
      wholeMaterials: wholeMaterialsData.records,
      shells,
      parts,
    };
  }, [scene]);

  useLayoutEffect(() => {
    const overview = getWholeVisibility(progress);
    const cutaway = getCutaway(progress);
    const focusedIndex = getFocusedPartIndex(progress);
    visuals.whole.visible = overview > 0;
    visuals.whole.rotation.y = getOverviewTurnProgress(progress) * Math.PI * 2;
    setOpacity(visuals.wholeMaterials, overview);
    setOpacity(visuals.shells, overview * (1 - cutaway * 0.84));
    visuals.parts.forEach((part, index) => {
      if (!part) return;
      const focused = focusedIndex === index;
      part.group.visible = focused;
      if (focused && activePartIndexRef.current !== focusedIndex) {
        part.group.rotation.y = 0;
      }
    });
    activePartIndexRef.current = focusedIndex;
    invalidate();
  }, [invalidate, progress, rotationEnabled, visuals]);

  useEffect(() => () => {
    visuals.wholeMaterials.forEach(({ material }) => material.dispose());
  }, [visuals]);

  useFrame((state, delta) => {
    if (!readyRef.current) {
      state.invalidate();
      renderedFrames.current += 1;
      if (renderedFrames.current >= 3 && !checkScheduledRef.current) {
        checkScheduledRef.current = true;
        window.requestAnimationFrame(() => {
          checkScheduledRef.current = false;
          if (readyRef.current) return;
          if (state.gl.info.render.calls > 0) {
            readyRef.current = true;
            onReady();
          } else if (renderedFrames.current < 12) {
            state.invalidate();
          }
        });
      }
    }

    if (readyRef.current && rotationEnabled) {
      const activePart = visuals.parts.find((part) => part?.group.visible);
      if (activePart) {
        activePart.group.rotation.y = (activePart.group.rotation.y + Math.min(delta, 0.05) * PART_ROTATION_SPEED) % (Math.PI * 2);
        state.invalidate();
      }
    }
  });

  return (
    <>
      <Bounds fit clip margin={1.2} maxDuration={0.001}>
        <primitive object={visuals.whole} dispose={null} />
      </Bounds>
      {visuals.parts.map((part, index) => part && (
        <primitive key={DIGITAL_TWIN_PART_NODES[index]} object={part.group} dispose={null} />
      ))}
    </>
  );
}

export default function DigitalTwinViewer({ progress, rotationEnabled, onReady }: { progress: number; rotationEnabled: boolean; onReady: () => void }) {
  return (
    <Canvas
      camera={{ position: [4.5, 2.5, 8], fov: 36, near: 0.01, far: 2000 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      fallback={<div className="digital-twin-loader">{HOME_MESSAGES.DIGITAL_TWIN.UNSUPPORTED}</div>}
    >
      <ambientLight intensity={1.25} />
      <directionalLight position={[-4, 7, 5]} intensity={2.1} />
      <directionalLight position={[5, 2, -4]} intensity={1.1} />
      <Suspense fallback={null}>
        <CoffeeMachineModel progress={progress} rotationEnabled={rotationEnabled} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
