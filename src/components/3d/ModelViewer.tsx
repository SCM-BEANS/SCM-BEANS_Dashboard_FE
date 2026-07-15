"use client";

import { Suspense, useState, useRef, useCallback, useEffect, useLayoutEffect, type MutableRefObject, type FC } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Center, Html, ContactShadows, GizmoHelper, GizmoViewcube, Bounds, useBounds } from "@react-three/drei";
import { Activity, Layers, Settings, Eye, EyeOff, Home } from "lucide-react";
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Pre-create shared materials to avoid re-creation on every render
const screenMaterial = new THREE.MeshStandardMaterial({
  color: '#0a0a0a',
  roughness: 0.05,
  metalness: 0.9,
  side: THREE.FrontSide,
});

const bodyMaterial = new THREE.MeshStandardMaterial({
  color: '#2d3748',
  roughness: 0.5,
  metalness: 0.6,
  side: THREE.FrontSide, // FrontSide only — halves polygon count
});

interface ModelViewerProps {
  url: string;
  machineName?: string;
  status?: string;
  version?: string;
  show3DInfo?: boolean;
}

const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);

  useLayoutEffect(() => {
    scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        // Disable shadow casting/receiving for performance (ContactShadows handles this)
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        // Frustum culling — skip rendering meshes outside the camera view
        mesh.frustumCulled = true;

        // Screen mesh identification (vertex count 7094 is unique to this model's screen)
        const isScreen = mesh.geometry?.attributes?.position?.count === 7094;
        // Reuse shared materials — no new allocations per mesh
        mesh.material = isScreen ? screenMaterial : bodyMaterial;
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
};

function BoundsFitter({ fitBoundsRef }: { fitBoundsRef: MutableRefObject<(() => void) | null> }) {
  const bounds = useBounds();
  useEffect(() => {
    fitBoundsRef.current = () => {
      bounds.refresh().clip().fit();
    };
  }, [bounds, fitBoundsRef]);
  return null;
}

// Exposes invalidate() from inside the Canvas context to the outer component
function SceneInvalidator({ invalidateRef }: { invalidateRef: MutableRefObject<(() => void) | null> }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidateRef.current = invalidate;
  }, [invalidate, invalidateRef]);
  return null;
}

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-surface/80 backdrop-blur-md border-2 border-outline shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-on-surface font-mono text-sm uppercase tracking-wider font-bold">Loading Model...</div>
      </div>
    </Html>
  );
}

const InfoCard = ({ machineName, status, version, is2D = false }: { machineName: string, status: string, version: string, is2D?: boolean }) => (
  <div className={`bg-surface/80 backdrop-blur-xl border-2 border-primary shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-3 w-48 rounded-sm flex flex-col pointer-events-auto ${is2D ? '' : 'transition-transform hover:scale-105'}`}>
    <div className="flex items-center gap-1.5 border-b-2 border-outline pb-1.5 mb-1.5">
      <Layers className="w-4 h-4 text-primary" />
      <h2 className="font-mono font-bold uppercase tracking-wider text-sm text-primary">
        {machineName}
      </h2>
    </div>

    <div className="flex justify-between items-center bg-background p-1.5 border border-outline">
      <div className="flex items-center gap-1">
        <Activity className="w-3 h-3 text-tertiary" />
        <span className="font-mono text-[9px] uppercase text-on-surface-variant">Status</span>
      </div>
      <span className="font-bold font-mono text-[10px] uppercase text-tertiary">{status}</span>
    </div>

    <div className="flex justify-between items-center bg-background p-1.5 border border-outline mt-1">
      <div className="flex items-center gap-1">
        <Settings className="w-3 h-3 text-secondary" />
        <span className="font-mono text-[9px] uppercase text-on-surface-variant">Version</span>
      </div>
      <span className="font-bold font-mono text-[10px] uppercase text-secondary">{version}</span>
    </div>
  </div>
);



export const ModelViewer: FC<ModelViewerProps> = ({
  url,
  machineName = "DEER_01",
  status = "Online",
  version = "v4.0.2",
  show3DInfo = true
}) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const fitBoundsRef = useRef<(() => void) | null>(null);
  const invalidateRef = useRef<(() => void) | null>(null);

  const handleResetCamera = useCallback(() => {
    const controls = controlsRef.current;
    if (controls) {
      // Reset orbit pivot (target) back to world center — fixes off-center rotation
      controls.target.set(0, 0, 0);
      controls.update();
    }
    // Re-fit the camera to the model bounding box
    if (fitBoundsRef.current) {
      fitBoundsRef.current();
    }
    // demand mode: manually trigger a re-render after reset
    if (invalidateRef.current) {
      invalidateRef.current();
    }
  }, []);

  return (
    <div className="w-full h-full relative bg-surface-container overflow-hidden font-sans">
      <Canvas
        camera={{ position: [1.2, 0.8, 2.2], fov: 45 }}
        // Only re-render when user interacts — biggest FPS win when idle
        frameloop="demand"
        // Cap pixel ratio: 1 on low-end, 1.5 max (prevents GPU overload on Retina/4K)
        dpr={[1, 1.5]}
        gl={{
          // Disable antialiasing via gl — let post-process or DPR handle it
          antialias: false,
          // Powerpreference hint for discrete GPU
          powerPreference: "high-performance",
          // Disable logarithmic depth buffer (not needed here, saves cost)
          logarithmicDepthBuffer: false,
        }}
      >
        <Suspense fallback={<Loader />}>

          {/* CAD-style background */}
          <color attach="background" args={['#eaedf2']} />

          {/* Environment — backgroundIntensity=0 means only reflections, no bg render */}
          <Environment preset="studio" background={false} />

          {/* Simple lights — no castShadow on spot lights (very expensive) */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
          <directionalLight position={[-5, 5, -5]} intensity={0.6} color="#60a5fa" />

          <Bounds fit clip observe margin={1.2}>
            <Center>
              <Model url={url} />
            </Center>
            <BoundsFitter fitBoundsRef={fitBoundsRef} />
          </Bounds>

          <SceneInvalidator invalidateRef={invalidateRef} />

          {/* Baked shadow (frames=1): rendered once, not per-frame */}
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.5}
            scale={8}
            blur={2}
            far={4}
            color="#000000"
            resolution={256}
            frames={1}
          />

          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            enableDamping={false}
            makeDefault
            minDistance={0.5}
            maxDistance={10}
            // regress: drop quality during interaction for smoother dragging
            regress
          />

          {/* 3D Orientation Cube */}
          <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
            <GizmoViewcube
              color="gray"
              strokeColor="white"
              textColor="white"
              hoverColor="#f472b6"
              faces={['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back']}
            />
          </GizmoHelper>
        </Suspense>
      </Canvas>

      {/* Reset camera button */}
      <button
        onClick={handleResetCamera}
        className="absolute bottom-8 left-8 z-50 w-10 h-10 bg-surface border-2 border-outline rounded-full shadow-lg flex items-center justify-center hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300"
        title="Reset View"
      >
        <Home className="w-5 h-5" />
      </button>

      {/* 2D Overlay — only when show3DInfo is true */}
      {show3DInfo && (
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-50 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 slide-in-from-right-4 duration-300">

          {isInfoOpen && (
            <div className="relative animate-in fade-in zoom-in duration-300">
              <InfoCard machineName={machineName} status={status} version={version} is2D={true} />
              <div className="absolute top-4 -right-[10px] w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-primary"></div>
            </div>
          )}

          <button
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300 hover:scale-105 ${isInfoOpen ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-on-surface border-outline hover:border-primary'
              }`}
            title={isInfoOpen ? "Hide Info" : "Show Info"}
          >
            {isInfoOpen ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
          </button>
        </div>
      )}
    </div>
  );
};
