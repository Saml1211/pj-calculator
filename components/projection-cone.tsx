'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { ProjectorConfig } from '@/lib/types';

interface ProjectionConeProps {
  projector: ProjectorConfig;
}

export function ProjectionCone({ projector }: ProjectionConeProps) {
  const { parameters, color, isVisible } = projector;
  const {
    position,
    rotation,
    throwDistance,
    imageWidth: width,
    imageHeight: height,
  } = parameters;

  const halfW = width / 2;
  const halfH = height / 2;

  const corners = useMemo(() => {
    const z = -throwDistance;
    return {
      tl: [-halfW, halfH, z] as [number, number, number],
      tr: [halfW, halfH, z] as [number, number, number],
      br: [halfW, -halfH, z] as [number, number, number],
      bl: [-halfW, -halfH, z] as [number, number, number],
    };
  }, [halfW, halfH, throwDistance]);

  const apexPoint: [number, number, number] = [0, 0, 0];

  const lighterColor = useMemo(() => {
    const c = new THREE.Color(color);
    c.offsetHSL(0, 0, 0.15);
    return '#' + c.getHexString();
  }, [color]);

  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      visible={isVisible}
    >
      {/* Projector body */}
      <mesh>
        <boxGeometry args={[0.25, 0.15, 0.35]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>

      {/* Projector lens */}
      <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
        <meshStandardMaterial color={lighterColor} roughness={0.3} />
      </mesh>

      {/* Wireframe cone lines: apex to each corner */}
      <Line points={[apexPoint, corners.tl]} color={color} lineWidth={1.5} />
      <Line points={[apexPoint, corners.tr]} color={color} lineWidth={1.5} />
      <Line points={[apexPoint, corners.br]} color={color} lineWidth={1.5} />
      <Line points={[apexPoint, corners.bl]} color={color} lineWidth={1.5} />

      {/* Screen rectangle outline */}
      <Line
        points={[corners.tl, corners.tr, corners.br, corners.bl, corners.tl]}
        color={color}
        lineWidth={1.5}
      />

      {/* Semi-transparent screen plane */}
      <mesh position={[0, 0, -throwDistance]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
