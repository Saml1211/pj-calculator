'use client';

import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useAppStore } from '@/lib/store';
import { ProjectionCone } from './projection-cone';
import { ProjectionSurface } from './projection-surface';

export function ProjectionSystem() {
  const projectors = useAppStore((state) => state.projectors);
  const surfaceConfig = useAppStore((state) => state.surfaceConfig);

  return (
    <Canvas
      camera={{ position: [0, 5, 10], fov: 50 }}
      style={{ background: '#1a1a1a' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} />
      <Grid
        position={[0, 0, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={1}
        cellColor={'#444'}
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor={'#888'}
        fadeDistance={50}
        infiniteGrid
      />
      <primitive object={new THREE.AxesHelper(5)} />
      <OrbitControls />
      
      {projectors.map(projector => (
        <ProjectionCone key={projector.id} projector={projector} />
      ))}
      <ProjectionSurface surface={surfaceConfig} />

    </Canvas>
  );
}
