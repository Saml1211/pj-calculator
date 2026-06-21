'use client';

import React, { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useAppStore } from '@/lib/store';
import { logger } from '@/lib/logger';
import { ProjectionCone } from './projection-cone';
import { ProjectionSurface } from './projection-surface';
import { CustomModel } from './custom-model';

export function ProjectionSystem() {
  const projectors = useAppStore((s) => s.projectors);
  const surfaceConfig = useAppStore((s) => s.surfaceConfig);
  const customModelUrl = useAppStore((s) => s.customModelUrl);

  return (
    <Canvas
      camera={{ position: [0, 8, 15], fov: 45, near: 0.1, far: 200 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <hemisphereLight
          args={['#87ceeb', '#362907', 0.3]}
        />

        <Grid
          position={[0, 0, 0]}
          args={[40, 40]}
          cellSize={1}
          cellColor="#333"
          sectionSize={5}
          sectionColor="#555"
          fadeDistance={60}
          infiniteGrid
        />

        <primitive object={new THREE.AxesHelper(3)} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          target={[0, 2, 0]}
          maxPolarAngle={Math.PI * 0.85}
          minDistance={2}
          maxDistance={50}
        />

        {projectors.map((p) => (
          <ProjectionCone key={p.id} projector={p} />
        ))}

        <ProjectionSurface surface={surfaceConfig} />

        {customModelUrl && <CustomModel key={customModelUrl} url={customModelUrl} />}
      </Suspense>
    </Canvas>
  );
}
