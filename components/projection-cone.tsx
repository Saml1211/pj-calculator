import { Box, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ProjectorConfig } from '@/lib/types';

interface ProjectionConeProps {
  projector: ProjectorConfig;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  visible?: boolean;
  // Add other common group props as needed
}

export function ProjectionCone({ projector, ...props }: ProjectionConeProps) {
  const { position, rotation, imageWidth, imageHeight, throwDistance } = projector.parameters;

  // Calculate screen corner points relative to the projector's local space
  const halfW = imageWidth / 2;
  const halfH = imageHeight / 2;

  const screenCorners = [
    new THREE.Vector3(halfW, halfH, -throwDistance),
    new THREE.Vector3(-halfW, halfH, -throwDistance),
    new THREE.Vector3(-halfW, -halfH, -throwDistance),
    new THREE.Vector3(halfW, -halfH, -throwDistance)
  ];

  const apex = new THREE.Vector3(0, 0, 0);

  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      visible={projector.isVisible}
      {...props}
    >
      {/*Projector Body*/}
      <Box args={[0.3, 0.2, 0.4]}>
        <meshStandardMaterial color={projector.color} />
      </Box>

      {/* Wireframe Cone */}
      {screenCorners.map((corner, i) => (
        <Line key={`edge-${i}`} points={[apex, corner]} color={projector.color} lineWidth={1} />
      ))}
      <Line points={[screenCorners[0], screenCorners[1], screenCorners[2], screenCorners[3], screenCorners[0]]} color={projector.color} lineWidth={1} />

      {/* Screen Plane */}
      <mesh position-z={-throwDistance}>
        <planeGeometry args={[imageWidth, imageHeight]} />
        <meshBasicMaterial color={projector.color} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
