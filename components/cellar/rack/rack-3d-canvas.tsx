'use client';

import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { RackScene } from './rack-scene';
import type { Rack } from '@/lib/cellar/types';

interface Rack3DCanvasProps {
  rack: Rack;
}

export function Rack3DCanvas({ rack }: Rack3DCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const cameraPosition = useMemo<[number, number, number]>(() => {
    const maxDim = Math.max(rack.columns, rack.rows);
    const dist = maxDim * 1.2 + 4;
    return [dist * 0.7, dist * 0.5, dist * 0.7];
  }, [rack.columns, rack.rows]);

  const targetPosition = useMemo<[number, number, number]>(() => {
    return [rack.columns / 2, rack.rows / 2, 0];
  }, [rack.columns, rack.rows]);

  return (
    <div ref={canvasRef} role="img" aria-label={rack.name} className="w-full h-[400px] md:h-[500px] lg:h-[560px] rounded-2xl bg-card shadow-soft overflow-hidden">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera
          makeDefault
          position={cameraPosition}
          fov={45}
          near={0.1}
          far={200}
        />

        <OrbitControls
          target={targetPosition}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={Math.max(rack.columns, rack.rows) * 3}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0.2}
          dampingFactor={0.1}
          enableDamping={true}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} />

        <Suspense>
          <RackScene rack={rack} />
        </Suspense>
      </Canvas>
    </div>
  );
}
