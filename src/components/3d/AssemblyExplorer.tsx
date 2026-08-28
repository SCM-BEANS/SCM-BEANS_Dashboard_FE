"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import {
  Bounds,
  Center,
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Box, Eye, EyeOff, Focus, RefreshCcw, Rotate3D } from "lucide-react";
import * as THREE from "three";
import assemblyKinematics from "@/data/Assem1.ai-assembly.json";

const PART_NAMES = [
  "mouth-1",
  "wiper-1",
  "top_block-1",
  "left_arm-2",
  "backcover-1",
  "right_arm-3",
  "12-1",
  "wiper_gear-2",
  "truc-1",
  "left_cover-2",
  "right_cover-2",
  "oc1-2",
  "base-1",
  "12-2",
  "1-4",
  "oc1-1",
  "13-1",
  "piston-1",
  "gear_piston-1",
] as const;

const PART_COLORS = [
  "#38bdf8",
  "#f97316",
  "#a78bfa",
  "#2dd4bf",
  "#fb7185",
  "#facc15",
  "#60a5fa",
  "#4ade80",
  "#c084fc",
  "#fb923c",
  "#22d3ee",
  "#f472b6",
  "#84cc16",
  "#818cf8",
  "#f59e0b",
  "#34d399",
  "#e879f9",
  "#f87171",
  "#67e8f9",
] as const;

type PartName = (typeof PART_NAMES)[number];

const WIPER_GEAR_LIMIT_RADIANS = THREE.MathUtils.degToRad(30);

const MATE_A = {
  name: "Mate A",
  rigidParts: ["truc-1", "12-1", "12-2"],
  sourceMates: ["Lock2", "Lock1"],
} as const;

const MATE_B = {
  name: "Mate B",
  rigidParts: [...MATE_A.rigidParts, "wiper_gear-2"],
  sourceMates: ["Coincident70", "Concentric16"],
} as const;

const MATE_C = {
  name: "Mate C",
  followerPairs: ["12-1 ↔ 1-4", "12-2 ↔ 13-1"],
  sourceMates: ["Concentric8", "Concentric14"],
} as const;

const MATE_D = {
  name: "Mate D",
  linkagePairs: ["1-4 ↔ oc1-1 ↔ left_cover-2", "13-1 ↔ oc1-2 ↔ right_cover-2"],
  sourceMates: ["Concentric9", "Concentric12", "PathMate8", "PathMate10"],
} as const;

function getMate(mateName: string) {
  const mate = assemblyKinematics.mates.find((candidate) => candidate.name === mateName);
  if (!mate) throw new Error(`Missing exported mate ${mateName}.`);
  return mate;
}

function assertMateParticipants(mateName: string, expectedInstanceNames: readonly string[]) {
  const participants = getMate(mateName).entities.map((entity) => entity.componentInstanceName);
  if (!expectedInstanceNames.every((name) => participants.includes(name))) {
    throw new Error(`Exported mate ${mateName} does not contain the expected components.`);
  }
}

function getMateEntity(mateName: string, componentInstanceName: string) {
  const mate = getMate(mateName);
  const entity = mate?.entities.find((candidate) => candidate.componentInstanceName === componentInstanceName);
  if (!entity?.pointMeters || !entity.direction) {
    throw new Error(`Missing kinematic geometry for ${mateName} / ${componentInstanceName}.`);
  }
  return entity;
}

function vectorFrom(values: number[]) {
  return new THREE.Vector3(values[0], values[1], values[2]);
}

// Mate A is rigid: Lock2 fixes 12-1 to truc-1 and Lock1 fixes 12-2 to truc-1.
assertMateParticipants("Lock2", ["12-1", "truc-1"]);
assertMateParticipants("Lock1", ["12-2", "truc-1"]);
// The user-defined Mate B makes Mate A and wiper_gear-2 one rigid test group.
assertMateParticipants("Coincident70", ["12-2", "wiper_gear-2"]);
assertMateParticipants("Concentric16", ["truc-1", "wiper_gear-2"]);
assertMateParticipants("Concentric8", ["12-1", "1-4"]);
assertMateParticipants("Concentric14", ["12-2", "13-1"]);
assertMateParticipants("Concentric9", ["1-4", "oc1-1"]);
assertMateParticipants("Concentric12", ["13-1", "oc1-2"]);
assertMateParticipants("PathMate8", ["oc1-1", "left_cover-2"]);
assertMateParticipants("PathMate10", ["oc1-2", "right_cover-2"]);
assertMateParticipants("Slot3", ["left_arm-2", "left_cover-2"]);
assertMateParticipants("Slot2", ["right_arm-3", "right_cover-2"]);

const wiperGearMate = getMateEntity("Concentric16", "wiper_gear-2");
const leftFollowerMate = getMateEntity("Concentric8", "1-4");
const rightFollowerMate = getMateEntity("Concentric14", "13-1");
const leftOcMate = getMateEntity("Concentric9", "1-4");
const rightOcMate = getMateEntity("Concentric12", "13-1");
const leftCoverPathCenter = getMateEntity("Slot3", "left_cover-2");
const rightCoverPathCenter = getMateEntity("Slot2", "right_cover-2");

// Read directly from Assem1.ai-assembly.json, exported by SOLIDWORKS:
// Mate A: Lock1/Lock2 fix 12-1 and 12-2 to truc-1. Mate B: Coincident70/
// Concentric16 relate that group to wiper_gear-2. For this manual test, all
// four parts are intentionally treated as one rigid rotating group.
const KINEMATIC_JOINTS = {
  mateB: {
    pivot: vectorFrom(wiperGearMate.pointMeters),
    axis: vectorFrom(wiperGearMate.direction),
  },
  mateD: {
    left: {
      outerPin: vectorFrom(leftFollowerMate.pointMeters),
      ocPin: vectorFrom(leftOcMate.pointMeters),
      coverPathCenter: vectorFrom(leftCoverPathCenter.pointMeters),
    },
    right: {
      outerPin: vectorFrom(rightFollowerMate.pointMeters),
      ocPin: vectorFrom(rightOcMate.pointMeters),
      coverPathCenter: vectorFrom(rightCoverPathCenter.pointMeters),
    },
  },
} as const;

interface JointAnchor {
  anchor: THREE.Group;
  axis: THREE.Vector3;
}

interface MateDLink {
  pinnedAssembly: JointAnchor;
  outerPin: THREE.Vector3;
  ocPin: THREE.Vector3;
  coverPathCenter: THREE.Vector3;
  linkLength: number;
  coverPathRadius: number;
  currentOcPin: THREE.Vector3;
}

function distanceYZ(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.y - b.y, a.z - b.z);
}

function angleYZ(from: THREE.Vector3, to: THREE.Vector3) {
  return Math.atan2(to.z - from.z, to.y - from.y);
}

function solveCircleIntersectionYZ(
  movingCenter: THREE.Vector3,
  movingRadius: number,
  fixedCenter: THREE.Vector3,
  fixedRadius: number,
  previousPoint: THREE.Vector3,
) {
  const dy = fixedCenter.y - movingCenter.y;
  const dz = fixedCenter.z - movingCenter.z;
  const distance = Math.hypot(dy, dz);
  if (distance < 1e-9) return previousPoint.clone();

  const along = (movingRadius ** 2 - fixedRadius ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, movingRadius ** 2 - along ** 2));
  const baseY = movingCenter.y + (along * dy) / distance;
  const baseZ = movingCenter.z + (along * dz) / distance;
  const perpendicularY = -dz / distance;
  const perpendicularZ = dy / distance;
  const first = new THREE.Vector3(previousPoint.x, baseY + height * perpendicularY, baseZ + height * perpendicularZ);
  const second = new THREE.Vector3(previousPoint.x, baseY - height * perpendicularY, baseZ - height * perpendicularZ);
  return first.distanceToSquared(previousPoint) <= second.distanceToSquared(previousPoint) ? first : second;
}

function isPartName(name: string): name is PartName {
  return PART_NAMES.includes(name as PartName);
}

function findPartName(object: THREE.Object3D, model: THREE.Object3D): PartName | null {
  let current: THREE.Object3D | null = object;

  while (current && current !== model) {
    if (isPartName(current.name)) {
      return current.name;
    }
    current = current.parent;
  }

  return null;
}

function ModelLoader() {
  return (
    <Html center>
      <div className="border-2 border-outline bg-surface px-4 py-3 font-mono text-xs font-bold uppercase text-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]">
        Loading assembly…
      </div>
    </Html>
  );
}

interface AssemblyModelProps {
  hiddenParts: ReadonlySet<PartName>;
  selectedPart: PartName | null;
  onSelectPart: (partName: PartName) => void;
}

function AssemblyModel({ hiddenParts, selectedPart, onSelectPart }: AssemblyModelProps) {
  const { scene } = useGLTF("/models/a1.glb", "/draco-gltf/");

  const model = useMemo(() => {
    const copy = scene.clone(true);

    // The selection color must not modify a material cached for another viewer.
    copy.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((material) => material.clone())
          : mesh.material.clone();
      }
    });

    return copy;
  }, [scene]);

  const joints = useMemo(() => {
    const attachPartsToJoint = (partNames: readonly PartName[], pivot: THREE.Vector3, axis: THREE.Vector3): JointAnchor | null => {
      const existingAnchor = model.getObjectByName("joint-mate-b");
      if (existingAnchor) {
        return { anchor: existingAnchor as THREE.Group, axis: axis.clone().normalize() };
      }

      const firstPart = model.getObjectByName(partNames[0]);
      if (!firstPart?.parent) return null;

      const anchor = new THREE.Group();
      anchor.name = "joint-mate-b";
      anchor.position.copy(pivot);
      firstPart.parent.add(anchor);

      for (const partName of partNames) {
        const part = model.getObjectByName(partName);
        if (part) anchor.attach(part);
      }

      return { anchor, axis: axis.clone().normalize() };
    };

    return {
      mateB: attachPartsToJoint(MATE_B.rigidParts, KINEMATIC_JOINTS.mateB.pivot, KINEMATIC_JOINTS.mateB.axis),
    };
  }, [model]);

  const mateDLinks = useMemo(() => {
    const attachPinnedAssembly = (
      linkName: "1-4" | "13-1",
      ocName: "oc1-1" | "oc1-2",
      ocPin: THREE.Vector3,
    ): JointAnchor | null => {
      const anchorName = `mate-d-pin-${ocName}`;
      const existingAnchor = model.getObjectByName(anchorName);
      if (existingAnchor) {
        return {
          anchor: existingAnchor as THREE.Group,
          axis: KINEMATIC_JOINTS.mateB.axis.clone().normalize(),
        };
      }

      const link = model.getObjectByName(linkName);
      const oc = model.getObjectByName(ocName);
      if (!link?.parent || !oc) return null;

      const anchor = new THREE.Group();
      anchor.name = anchorName;
      anchor.position.copy(ocPin);
      link.parent.add(anchor);

      // Concentric9/Concentric12 make the oc pin and the circular link hole one
      // physical joint. Keeping both nodes under this shared transform prevents
      // visual or numerical separation while the oc pin drives the link.
      anchor.attach(link);
      anchor.attach(oc);
      return { anchor, axis: KINEMATIC_JOINTS.mateB.axis.clone().normalize() };
    };

    const createLink = (
      linkName: "1-4" | "13-1",
      ocName: "oc1-1" | "oc1-2",
      geometry: typeof KINEMATIC_JOINTS.mateD.left | typeof KINEMATIC_JOINTS.mateD.right,
    ): MateDLink | null => {
      const pinnedAssembly = attachPinnedAssembly(linkName, ocName, geometry.ocPin);
      if (!pinnedAssembly) return null;
      return {
        pinnedAssembly,
        outerPin: geometry.outerPin.clone(),
        ocPin: geometry.ocPin.clone(),
        coverPathCenter: geometry.coverPathCenter.clone(),
        linkLength: distanceYZ(geometry.outerPin, geometry.ocPin),
        coverPathRadius: distanceYZ(geometry.coverPathCenter, geometry.ocPin),
        currentOcPin: geometry.ocPin.clone(),
      };
    };

    return {
      left: createLink("1-4", "oc1-1", KINEMATIC_JOINTS.mateD.left),
      right: createLink("13-1", "oc1-2", KINEMATIC_JOINTS.mateD.right),
    };
  }, [model]);

  const angle = useRef(0);
  const drag = useRef<{ pointerId: number; startX: number; startAngle: number } | null>(null);

  const applyKinematicPose = (nextAngle: number) => {
    angle.current = THREE.MathUtils.clamp(nextAngle, -WIPER_GEAR_LIMIT_RADIANS, WIPER_GEAR_LIMIT_RADIANS);
    const setJointAngle = (joint: JointAnchor | null, jointAngle: number) => {
      joint?.anchor.quaternion.setFromAxisAngle(joint.axis, jointAngle);
    };

    // Mate B is one rigid group: wiper_gear-2, truc-1, 12-1 and 12-2.
    setJointAngle(joints.mateB, angle.current);

    const pivot = KINEMATIC_JOINTS.mateB.pivot;
    const axis = KINEMATIC_JOINTS.mateB.axis.clone().normalize();
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle.current);

    // Mate C fixes each outer pin in its rotating 12-1/12-2 slot. Mate D then
    // solves the inner oc1 pin on the fixed cover arc while preserving link length.
    for (const link of Object.values(mateDLinks)) {
      if (!link) continue;
      const targetOuterPin = link.outerPin.clone().sub(pivot).applyQuaternion(rotation).add(pivot);
      const targetOcPin = solveCircleIntersectionYZ(
        targetOuterPin,
        link.linkLength,
        link.coverPathCenter,
        link.coverPathRadius,
        link.currentOcPin,
      );
      const initialLinkAngle = angleYZ(link.ocPin, link.outerPin);
      const targetLinkAngle = angleYZ(targetOcPin, targetOuterPin);

      // oc1 is the driving pin. Moving this shared anchor pulls 1-4/13-1 with
      // it, while the solved rotation keeps the opposite pin on Mate C.
      link.pinnedAssembly.anchor.position.copy(targetOcPin);
      link.pinnedAssembly.anchor.quaternion.setFromAxisAngle(
        link.pinnedAssembly.axis,
        targetLinkAngle - initialLinkAngle,
      );
      link.currentOcPin.copy(targetOcPin);
    }
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (findPartName(event.object, model) !== "wiper_gear-2") return;
    event.stopPropagation();
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startAngle: angle.current };
    (event.target as unknown as { setPointerCapture: (pointerId: number) => void }).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    applyKinematicPose(activeDrag.startAngle + (event.clientX - activeDrag.startX) * 0.012);
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    (event.target as unknown as { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  useEffect(() => {
    // Hiding the assembly root closes any renderer-only children that may not have a part name.
    const allPartsAreHidden = hiddenParts.size === PART_NAMES.length;
    model.visible = !allPartsAreHidden;

    if (allPartsAreHidden) return;

    for (const partName of PART_NAMES) {
      const part = model.getObjectByName(partName);
      if (!part) continue;

      part.visible = !hiddenParts.has(partName);
      const isSelected = partName === selectedPart;
      const partColor = PART_COLORS[PART_NAMES.indexOf(partName)];

      part.traverse((node) => {
        if (!(node as THREE.Mesh).isMesh) return;

        const mesh = node as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.color.set(isSelected ? "#fbbf24" : partColor);
            material.metalness = 0.25;
            material.roughness = 0.4;
            material.emissive.set(isSelected ? "#f59e0b" : "#0f172a");
            material.emissiveIntensity = isSelected ? 0.7 : 0.08;
          }
        }
      });
    }
  }, [hiddenParts, model, selectedPart]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const partName = findPartName(event.object, model);
    if (partName) onSelectPart(partName);
  };

  // SolidWorks exports this assembly with the opposite vertical orientation to the Three.js scene.
  return (
    <primitive
      object={model}
      rotation={[Math.PI, 0, 0]}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

export function AssemblyExplorer() {
  const [selectedPart, setSelectedPart] = useState<PartName | null>(null);
  const [hiddenParts, setHiddenParts] = useState<Set<PartName>>(() => new Set());

  const togglePartVisibility = (partName: PartName) => {
    setHiddenParts((current) => {
      const next = new Set(current);
      if (next.has(partName)) next.delete(partName);
      else next.add(partName);
      return next;
    });
  };

  const isolateSelectedPart = () => {
    if (!selectedPart) return;
    setHiddenParts(new Set(PART_NAMES.filter((partName) => partName !== selectedPart)));
  };

  const resetParts = () => {
    setHiddenParts(new Set());
    setSelectedPart(null);
  };

  const hideAllParts = () => {
    setHiddenParts(new Set(PART_NAMES));
    setSelectedPart(null);
  };

  return (
    <div className="grid min-h-[calc(100vh-11rem)] grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="relative min-h-[34rem] overflow-hidden border-2 border-outline bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,0.12)]">
        <Canvas
          camera={{ position: [2.8, 2.2, 3.8], fov: 42 }}
          dpr={[1, 1.5]}
          onPointerMissed={() => setSelectedPart(null)}
        >
          <color attach="background" args={["#0f172a"]} />
          <ambientLight intensity={0.85} />
          <hemisphereLight args={["#dbeafe", "#020617", 0.75]} />
          <directionalLight position={[5, 8, 5]} intensity={2.2} />
          <directionalLight position={[-4, 2, -3]} intensity={1.1} color="#38bdf8" />
          <Environment preset="studio" background={false} />

          <Suspense fallback={<ModelLoader />}>
            <Bounds fit clip margin={1.2}>
              <Center>
                <AssemblyModel
                  hiddenParts={hiddenParts}
                  selectedPart={selectedPart}
                  onSelectPart={setSelectedPart}
                />
              </Center>
            </Bounds>
          </Suspense>

          <ContactShadows position={[0, -1.2, 0]} opacity={0.55} scale={7} blur={2} far={4} color="#020617" resolution={256} frames={1} />
          <OrbitControls enableDamping dampingFactor={0.06} />
        </Canvas>

        <div className="pointer-events-none absolute left-4 top-4 border-2 border-primary bg-surface/90 px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)] backdrop-blur-sm">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-primary">
            <Rotate3D className="h-4 w-4" />
            Assembly inspector
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase text-on-surface-variant">
            Click a component to inspect it
          </p>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden border-2 border-outline bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,0.12)]">
        <div className="border-b-2 border-outline bg-primary p-5 text-on-primary">
          <div className="flex items-center gap-3">
            <Box className="h-6 w-6" />
            <div>
              <h1 className="font-mono text-lg font-bold uppercase tracking-wide">Assembly parts</h1>
              <p className="mt-1 font-mono text-[10px] uppercase opacity-80">19 independent GLB nodes</p>
            </div>
          </div>
        </div>

        <div className="border-b-2 border-outline bg-surface-container p-4">
          <p className="font-mono text-[11px] leading-relaxed text-on-surface-variant">
            Root <span className="font-bold text-primary">Assem1</span> contains 19 individually addressable meshes. This is an assembly, not one merged object.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase text-on-surface-variant">
            Selected: <span className="font-bold text-primary">{selectedPart ?? "None"}</span>
          </p>
          <div className="mt-3 border border-primary/40 bg-primary/5 p-3">
            <p className="font-mono text-[10px] font-bold uppercase text-primary">Kinematic preview</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-on-surface-variant">
              Drag wiper_gear-2 left or right to rotate the complete rigid Mate B group manually (±30°).
            </p>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-on-surface-variant">
              {MATE_C.name}: {MATE_C.followerPairs.join("; ")}. {MATE_D.name}: {MATE_D.linkagePairs.join("; ")}. Both arms, top block and wiper-1 remain fixed.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {PART_NAMES.map((partName, index) => {
              const isHidden = hiddenParts.has(partName);
              const isSelected = selectedPart === partName;

              return (
                <div
                  key={partName}
                  className={`flex items-center gap-2 border p-2 transition-colors ${isSelected ? "border-primary bg-primary/10" : "border-outline bg-surface-container"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPart(partName)}
                    className="min-w-0 flex-1 truncate text-left font-mono text-xs font-bold text-on-surface hover:text-primary"
                    title={`Select ${partName}`}
                  >
                    <span className="mr-2 text-on-surface-variant">{String(index + 1).padStart(2, "0")}</span>
                    {partName}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePartVisibility(partName)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center border border-outline bg-surface text-on-surface transition-colors hover:border-primary hover:text-primary"
                    title={isHidden ? `Show ${partName}` : `Hide ${partName}`}
                    aria-label={isHidden ? `Show ${partName}` : `Hide ${partName}`}
                  >
                    {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t-2 border-outline bg-surface-container p-4">
          <button
            type="button"
            onClick={isolateSelectedPart}
            disabled={!selectedPart}
            className="flex items-center justify-center gap-2 border-2 border-primary bg-primary px-3 py-2 font-mono text-xs font-bold uppercase text-on-primary transition-colors hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Focus className="h-4 w-4" />
            Isolate
          </button>
          <button
            type="button"
            onClick={hideAllParts}
            className="flex items-center justify-center gap-2 border-2 border-outline bg-surface px-3 py-2 font-mono text-xs font-bold uppercase text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            <EyeOff className="h-4 w-4" />
            Hide all
          </button>
          <button
            type="button"
            onClick={resetParts}
            className="flex items-center justify-center gap-2 border-2 border-outline bg-surface px-3 py-2 font-mono text-xs font-bold uppercase text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            <RefreshCcw className="h-4 w-4" />
            Show all
          </button>
        </div>
      </aside>
    </div>
  );
}

useGLTF.preload("/models/a1.glb", "/draco-gltf/");
