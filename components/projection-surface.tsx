'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SurfaceConfig } from '@/lib/types';

interface ProjectionSurfaceProps {
  surface: SurfaceConfig;
}

export function ProjectionSurface({ surface }: ProjectionSurfaceProps) {
  const { type, width, height, curvature, segments, position, rotation } = surface;

  const { geometry, zOffset } = useMemo(() => {
    let geo: THREE.BufferGeometry;
    let z = 0;

    switch (type) {
      case 'Flat': {
        geo = new THREE.PlaneGeometry(width, height, segments, segments);
        break;
      }
      case 'Cylindrical': {
        const radius = width / (2 * Math.PI * curvature);
        const thetaLength = 2 * Math.PI * curvature;
        geo = new THREE.CylinderGeometry(
          radius,
          radius,
          height,
          segments,
          1,
          true,
          -thetaLength / 2,
          thetaLength
        );
        geo.rotateX(Math.PI / 2);
        z = -radius;
        break;
      }
      case 'Spherical': {
        const radius = Math.max(width, height) / (Math.PI * curvature);
        const phiLength = Math.PI * curvature;
        const thetaLength = Math.PI * curvature;
        geo = new THREE.SphereGeometry(
          radius,
          segments,
          Math.max(1, Math.floor(segments / 2)),
          -thetaLength / 2,
          thetaLength,
          0,
          phiLength
        );
        z = -radius;
        break;
      }
      default: {
        geo = new THREE.PlaneGeometry(width, height, segments, segments);
      }
    }

    return { geometry: geo, zOffset: z };
  }, [type, width, height, curvature, segments]);

  return (
    <group
      position={[position.x, position.y, position.z + zOffset]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      <mesh>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial
          color="#94a3b8"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <primitive object={geometry.clone()} attach="geometry" />
        <meshBasicMaterial
          color="#64748b"
          wireframe
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
