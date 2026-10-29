import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Bounds, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";

const MODEL_URL = "/models/digital-twin/body/coffee_machine_03_v2.glb";

interface HeroDigitalTwinProps {
  onReady: () => void;
}

class ModelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function CoffeeMachineModel({ onReady }: HeroDigitalTwinProps) {
  const { scene } = useGLTF(MODEL_URL);
  const heroScene = useMemo(() => scene.clone(true), [scene]);
  const renderedFrames = useRef(0);
  const readyRef = useRef(false);
  const checkScheduledRef = useRef(false);

  useFrame((state) => {
    if (readyRef.current) return;
    renderedFrames.current += 1;
    if (renderedFrames.current < 3 || checkScheduledRef.current) return;

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
  });

  return (
    <Bounds fit clip margin={1.15} maxDuration={0.001}>
      <primitive object={heroScene} />
    </Bounds>
  );
}

export default function HeroDigitalTwin({ onReady }: HeroDigitalTwinProps) {
  return (
    <Canvas
      camera={{ position: [6, 2.5, -3], fov: 36, near: 0.01, far: 2000 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      fallback={null}
    >
      <ambientLight intensity={1.25} />
      <directionalLight position={[-4, 7, 5]} intensity={2.1} />
      <directionalLight position={[5, 2, -4]} intensity={1.1} />
      <ModelErrorBoundary>
        <Suspense fallback={null}>
          <CoffeeMachineModel onReady={onReady} />
        </Suspense>
      </ModelErrorBoundary>
    </Canvas>
  );
}
