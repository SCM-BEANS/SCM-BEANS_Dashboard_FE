import { Suspense, useEffect, useRef, useState } from "react";
import { Bounds, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { HOME_MESSAGES } from "@/text/home/home-messages";

const MODEL_URL = "/models/digital-twin/body/coffee_machine_03_v2.glb";

function CoffeeMachineModel() {
  const { scene } = useGLTF(MODEL_URL);

  return (
    <Bounds fit clip margin={1.2}>
      <primitive object={scene} />
    </Bounds>
  );
}

export default function DigitalTwinViewer() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const { active, progress } = useProgress();

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateAutoRotate = () => setAutoRotate(!motionPreference.matches);

    updateAutoRotate();
    motionPreference.addEventListener("change", updateAutoRotate);
    return () => motionPreference.removeEventListener("change", updateAutoRotate);
  }, []);

  const rotateModel = (direction: -1 | 1) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const offset = controls.object.position
      .clone()
      .sub(controls.target)
      .applyAxisAngle(new Vector3(0, 1, 0), direction * Math.PI / 6);

    controls.object.position.copy(controls.target).add(offset);
    controls.update();
  };

  return (
    <>
      <Canvas
        camera={{ position: [4, 3, 4], fov: 36, near: 0.01, far: 2000 }}
        dpr={[1, 1.5]}
        gl={{ alpha: false, antialias: true, powerPreference: "low-power" }}
        fallback={<div className="digital-twin-loader">{HOME_MESSAGES.DIGITAL_TWIN.UNSUPPORTED}</div>}
      >
        <color attach="background" args={["#f8f6f3"]} />
        <ambientLight intensity={1.25} />
        <directionalLight position={[-4, 7, 5]} intensity={2.1} />
        <directionalLight position={[5, 2, -4]} intensity={1.1} />
        <Suspense fallback={null}>
          <CoffeeMachineModel />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={0.35}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
        />
      </Canvas>

      {active && (
        <div className="digital-twin-progress" role="status" aria-live="polite">
          <span>{HOME_MESSAGES.DIGITAL_TWIN.LOAD_PROGRESS}</span>
          <strong>{Math.round(progress)}%</strong>
        </div>
      )}

      <div
        className="digital-twin-controls"
        role="group"
        aria-label={HOME_MESSAGES.DIGITAL_TWIN.CONTROL_GROUP_LABEL}
      >
        <button type="button" onClick={() => rotateModel(-1)} aria-label={HOME_MESSAGES.DIGITAL_TWIN.ROTATE_LEFT}>
          <span aria-hidden="true">↶</span>
        </button>
        <button type="button" onClick={() => rotateModel(1)} aria-label={HOME_MESSAGES.DIGITAL_TWIN.ROTATE_RIGHT}>
          <span aria-hidden="true">↷</span>
        </button>
      </div>

      <p className="digital-twin-hint">{HOME_MESSAGES.DIGITAL_TWIN.INTERACTION_HINT}</p>
    </>
  );
}
