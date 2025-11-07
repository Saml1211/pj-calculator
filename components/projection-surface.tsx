'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SurfaceConfig } from '@/lib/types';

interface ProjectionSurfaceProps {
  surface: SurfaceConfig;
}

export function ProjectionSurface({ surface }: ProjectionSurfaceProps) {
  const { type, width, height, curvature, segments, position, rotation } = surface;

  const geometry = useMemo(() => {
    switch (type) {
      case 'Cylindrical':
        const radiusCyl = width / (2 * Math.PI * curvature);
        const thetaLength = 2 * Math.PI * curvature;
        return new THREE.CylinderGeometry(radiusCyl, radiusCyl, height, segments, 1, true, -thetaLength / 2, thetaLength);
      case 'Spherical':
        const radiusSph = Math.max(width, height) / (Math.PI * curvature);
        const phiLength = Math.PI * curvature; // Vertical curve
        const thetaLengthSph = Math.PI * curvature; // Horizontal curve
        return new THREE.SphereGeometry(radiusSph, segments, Math.round(segments / 2), -thetaLengthSph / 2, thetaLengthSph, 0, phiLength);
      case 'Flat':
      default:
        return new THREE.PlaneGeometry(width, height, segments, segments);
    }
  }, [type, width, height, curvature, segments]);

  // For curved surfaces, we need to offset the mesh so its front face is at z=0
  const zOffset = useMemo(() => {
    if (type === 'Cylindrical') {
        const radius = width / (2 * Math.PI * curvature);
        return -radius;
    }
    if (type === 'Spherical') {
        const radius = Math.max(width, height) / (Math.PI * curvature);
        return -radius;
    }
    return 0;
  }, [type, width, height, curvature]);

  return (
    <mesh
      position={[position.x, position.y, position.z + zOffset]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      geometry={geometry}
    >
      <meshStandardMaterial color="#cccccc" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}
