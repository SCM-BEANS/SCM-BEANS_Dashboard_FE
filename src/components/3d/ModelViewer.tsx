"use client";

import React, { Suspense, useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Center, Html, ContactShadows, GizmoHelper, GizmoViewcube, Bounds, useBounds } from "@react-three/drei";
import { Activity, Layers, Settings, Eye, EyeOff, Home } from "lucide-react";
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface ModelViewerProps {
  url: string;
  machineName?: string;
  status?: string;
  version?: string;
  show3DInfo?: boolean;
}

const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);

  React.useLayoutEffect(() => {
    scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Nhận diện màn hình dựa trên số lượng đỉnh (đặc trưng của mesh màn hình trong file này là 7094)
        const isScreen = mesh.geometry?.attributes?.position?.count === 7094;

        if (isScreen) {
          // Vật liệu cho màn hình: Đen hoàn toàn (Kính đen bóng)
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: '#000000',
            roughness: 0.1,
            metalness: 0.8,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide
          });
        } else {
          // Vật liệu cho vỏ máy: Xám đen (Dark Gray)
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#2d3748', // Xám đen
            roughness: 0.5,
            metalness: 0.6,
            side: THREE.DoubleSide
          });
        }

        // Thêm viền (edges) cho từng chi tiết để làm nổi bật hình khối (đặc trưng CAD)
        if (!mesh.userData.hasEdges) {
          const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 15); // Góc 15 độ để tạo viền
          const edgeColor = isScreen ? '#1f2937' : '#111827'; // Viền đen nhạt cho màn hình, đen đậm cho thân máy
          const edgesMaterial = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.6 });
          const lineSegments = new THREE.LineSegments(edgesGeometry, edgesMaterial);
          mesh.add(lineSegments);
          mesh.userData.hasEdges = true;
        }
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
};

function BoundsFitter({ fitBoundsRef }: { fitBoundsRef: React.MutableRefObject<(() => void) | null> }) {
  const bounds = useBounds();
  React.useEffect(() => {
    fitBoundsRef.current = () => {
      bounds.refresh().clip().fit();
    };
  }, [bounds, fitBoundsRef]);
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



export const ModelViewer: React.FC<ModelViewerProps> = ({
  url,
  machineName = "DEER_01",
  status = "Online",
  version = "v4.0.2",
  show3DInfo = true
}) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false); // Mặc định đóng
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const fitBoundsRef = useRef<(() => void) | null>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset(); // Đưa camera về góc xem ban đầu
    }
    if (fitBoundsRef.current) {
      fitBoundsRef.current(); // Scale vừa khung hình theo góc nhìn ban đầu
    }
  };

  return (
    <div className="w-full h-full relative bg-surface-container overflow-hidden font-sans">
      <Canvas camera={{ position: [1.2, 0.8, 2.2], fov: 45 }}>
        <Suspense fallback={<Loader />}>

          {/* Màu nền giống phần mềm CAD */}
          <color attach="background" args={['#eaedf2']} />

          {/* Môi trường 3D tạo phản xạ ánh sáng */}
          <Environment preset="studio" />

          {/* Đèn tạo điểm nhấn */}
          <ambientLight intensity={0.4} />
          <spotLight position={[5, 10, 5]} intensity={2} angle={0.3} penumbra={1} castShadow />
          <spotLight position={[-5, 5, -5]} intensity={1} color="#60a5fa" angle={0.5} penumbra={1} />
          <spotLight position={[0, 5, 5]} intensity={1} color="#f472b6" angle={0.5} penumbra={1} />

          <Bounds fit clip observe margin={1.2}>
            <Center>
              <Model url={url} />
            </Center>
            <BoundsFitter fitBoundsRef={fitBoundsRef} />
          </Bounds>

          {/* Bóng dưới mặt đất chân thực */}
          <ContactShadows position={[0, -1.2, 0]} opacity={0.6} scale={10} blur={2.5} far={4} color="#000000" />

          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            makeDefault
            minDistance={0.5}
            maxDistance={10}
          />

          {/* 3D Orientation Cube */}
          <GizmoHelper
            alignment="bottom-right"
            margin={[60, 60]}
          >
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

      {/* Nút Home để reset camera */}
      <button
        onClick={handleResetCamera}
        className="absolute bottom-8 left-8 z-50 w-10 h-10 bg-surface border-2 border-outline rounded-full shadow-lg flex items-center justify-center hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300"
        title="Reset View"
      >
        <Home className="w-5 h-5" />
      </button>

      {/* 2D Overlay: Menu góc phải - Luôn hiển thị khi show3DInfo là true */}
      {show3DInfo && (
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-50 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 slide-in-from-right-4 duration-300">

          {/* Info Card - Chỉ hiện khi đang Open */}
          {isInfoOpen && (
            <div className="relative animate-in fade-in zoom-in duration-300">
              <InfoCard machineName={machineName} status={status} version={version} is2D={true} />
              <div className="absolute top-4 -right-[10px] w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-primary"></div>
            </div>
          )}

          {/* 2D Eye Toggle luôn hiển thị để bật tắt Menu góc phải */}
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
