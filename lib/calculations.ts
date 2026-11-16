import type { EdgeBlendingConfig, EdgeBlendPairStatus, EdgeBlendReport, ProjectionParameters, ProjectorConfig, SurfaceConfig } from './types';
import * as THREE from 'three';

function roundMetres(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Calculates the optimal position and rotation for a projector to align with a
 * projection surface. Supports flat, cylindrical, and spherical surfaces.
 *
 * The projector is placed at `throwDistance` from the surface, positioned along
 * the surface's width based on `horizontalOffset`, and oriented to face the
 * surface center (or arc normal for curved surfaces).
 *
 * @param surface The configuration of the projection surface.
 * @param projectorParams The parameters of the projector being positioned.
 * @param horizontalOffset A normalized value (-0.5 to 0.5) for positioning along the curve.
 * @returns An object containing the calculated 3D position and rotation.
 */
export function calculateProjectorWrapAround(
  surface: SurfaceConfig,
  projectorParams: ProjectionParameters,
  horizontalOffset: number = 0
): { position: THREE.Vector3; rotation: THREE.Euler } {
  const { throwDistance } = projectorParams;
  const surfaceCenter = new THREE.Vector3(
    surface.position.x,
    surface.position.y,
    surface.position.z
  );

  switch (surface.type) {
    case 'Cylindrical': {
      // The curvature parameter (0.001–1.0) maps to a total arc angle.
      // At curvature=1 the arc spans 2*PI (full cylinder); at 0.001 nearly flat.
      const totalAngle = surface.curvature * Math.PI * 2;
      // Angle for this projector along the arc.
      const angle = horizontalOffset * totalAngle;
      // Radius of the cylinder: the surface curves outward from its center plane.
      const radius = surface.width / (2 * totalAngle);

      // Position on the arc at `throwDistance` behind the surface curve.
      const arcX = surfaceCenter.x + Math.sin(angle) * (radius + throwDistance);
      const arcZ = surfaceCenter.z - Math.cos(angle) * (radius + throwDistance);
      const position = new THREE.Vector3(arcX, surfaceCenter.y, arcZ);

      // Rotation: face toward the surface center along the arc normal.
      const lookTarget = new THREE.Vector3(
        surfaceCenter.x + Math.sin(angle) * radius,
        surfaceCenter.y,
        surfaceCenter.z - Math.cos(angle) * radius
      );
      const rotationEuler = new THREE.Euler();
      const m = new THREE.Matrix4().lookAt(position, lookTarget, new THREE.Vector3(0, 1, 0));
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      rotationEuler.setFromQuaternion(q);

      return { position, rotation: rotationEuler };
    }

    case 'Spherical': {
      // Spherical surface: projectors sit on a hemisphere at throwDistance from the surface.
      // Use curvature to control how much of the sphere is covered.
      const maxPhi = surface.curvature * Math.PI * 0.5; // half-sphere max
      const phi = horizontalOffset * maxPhi; // horizontal angle
      const theta = 0; // vertical center — could be parameterised later
      const sphereRadius = surface.width / (2 * Math.PI * surface.curvature);

      const dist = sphereRadius + throwDistance;
      const sphX = surfaceCenter.x + Math.sin(phi) * Math.cos(theta) * dist;
      const sphY = surfaceCenter.y + Math.sin(theta) * dist;
      const sphZ = surfaceCenter.z - Math.cos(phi) * Math.cos(theta) * dist;
      const position = new THREE.Vector3(sphX, sphY, sphZ);

      // Look target: the corresponding point on the sphere surface.
      const surfPoint = new THREE.Vector3(
        surfaceCenter.x + Math.sin(phi) * Math.cos(theta) * sphereRadius,
        surfaceCenter.y + Math.sin(theta) * sphereRadius,
        surfaceCenter.z - Math.cos(phi) * Math.cos(theta) * sphereRadius
      );
      const rotationEuler = new THREE.Euler();
      const m = new THREE.Matrix4().lookAt(position, surfPoint, new THREE.Vector3(0, 1, 0));
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      rotationEuler.setFromQuaternion(q);

      return { position, rotation: rotationEuler };
    }

    case 'Flat':
    default: {
      // Flat surface: projectors sit at a uniform distance behind the surface,
      // evenly spread along the X axis.
      const x = surfaceCenter.x + horizontalOffset * surface.width;
      const position = new THREE.Vector3(x, surfaceCenter.y, surfaceCenter.z + throwDistance);
      // Default Three.js forward is -Z. The projector is at +Z looking toward -Z.
      const rotation = new THREE.Euler(0, 0, 0);

      return { position, rotation };
    }
  }
}

/**
 * Distributes a set of projectors evenly across the projection surface.
 * Each projector is placed at an equal horizontal offset from -0.5 (left edge)
 * to +0.5 (right edge), oriented to face the surface.
 *
 * @param surface The projection surface configuration.
 * @param projectors The array of projector configurations.
 * @returns A new array of ProjectorConfig with updated position/rotation parameters.
 */
export function adaptProjectorsToSurface(
  surface: SurfaceConfig,
  projectors: ProjectorConfig[]
): ProjectorConfig[] {
  const count = projectors.length;
  if (count === 0) return projectors;

  return projectors.map((projector, index) => {
    // Distribute evenly from -0.5 (left) to +0.5 (right).
    // For a single projector, offset = 0 (centered).
    const horizontalOffset = count > 1 ? index / (count - 1) - 0.5 : 0;

    const { position, rotation } = calculateProjectorWrapAround(
      surface,
      projector.parameters,
      horizontalOffset
    );

    return {
      ...projector,
      parameters: {
        ...projector.parameters,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      },
    };
  });
}

export function calculateEdgeBlendReport(
  projectors: ProjectorConfig[],
  edgeBlending: EdgeBlendingConfig
): EdgeBlendReport {
  const visibleProjectors = projectors
    .filter((projector) => projector.isVisible)
    .sort((a, b) => a.parameters.position.x - b.parameters.position.x);

  const extents = visibleProjectors.map((projector) => {
    const halfWidth = projector.parameters.imageWidth / 2;
    return {
      projector,
      left: projector.parameters.position.x - halfWidth,
      right: projector.parameters.position.x + halfWidth,
    };
  });

  const coverageWidthM = extents.length
    ? Math.max(...extents.map((extent) => extent.right)) - Math.min(...extents.map((extent) => extent.left))
    : 0;

  const warnings: string[] = [];
  if (!edgeBlending.isEnabled) {
    warnings.push('Edge blending is disabled; report is a geometry preview only.');
  }
  if (visibleProjectors.length < 2) {
    warnings.push('At least two visible projectors are required to validate a blend seam.');
  }

  const pairs = extents.slice(0, -1).map((leftExtent, index) => {
    const rightExtent = extents[index + 1];
    const desiredOverlap = Math.min(
      leftExtent.projector.parameters.imageWidth,
      rightExtent.projector.parameters.imageWidth
    ) * (edgeBlending.overlap / 100);
    // Signed: negative when the two images do not touch, and its magnitude is
    // then the width of the hole in the wall. Clamping this to zero before the
    // delta hides the gap and under-reports the move by exactly that width.
    const signedOverlap = leftExtent.right - rightExtent.left;
    const actualOverlap = Math.max(0, signedOverlap);
    const delta = signedOverlap - desiredOverlap;
    const tolerance = Math.max(0.05, desiredOverlap * 0.1);
    const status: EdgeBlendPairStatus = delta < -tolerance ? 'too_narrow' : delta > tolerance ? 'too_wide' : 'matched';
    const recommendation = status === 'matched'
      ? 'Within tolerance; keep this seam.'
      : status === 'too_narrow'
        ? `Move projectors ${roundMetres(Math.abs(delta))} m closer or reduce image width.`
        : `Move projectors ${roundMetres(delta)} m apart or reduce overlap.`;

    return {
      leftProjectorId: leftExtent.projector.id,
      leftProjectorName: leftExtent.projector.name,
      rightProjectorId: rightExtent.projector.id,
      rightProjectorName: rightExtent.projector.name,
      desiredOverlapM: roundMetres(desiredOverlap),
      actualOverlapM: roundMetres(actualOverlap),
      deltaM: roundMetres(delta),
      featherWidthM: roundMetres(actualOverlap * (edgeBlending.feather / 100)),
      status,
      recommendation,
    };
  });

  return {
    ok: edgeBlending.isEnabled && pairs.length > 0 && pairs.every((pair) => pair.status === 'matched'),
    coverageWidthM: roundMetres(coverageWidthM),
    targetOverlapPercent: edgeBlending.overlap,
    targetFeatherPercent: edgeBlending.feather,
    pairs,
    warnings,
  };
}
