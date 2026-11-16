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

  // What a tech types into each projector's blend menu: the ramp on each edge, as a share of its image.
  const extentsForBlend = blendExtents(visibleProjectors, edgeBlending.feather);
  const projectorBlends = extentsForBlend.map((e) => {
    const width = e.right - e.left;
    return {
      projectorId: e.id,
      projectorName: e.name,
      leftBlendM: roundMetres(e.rampLeft),
      rightBlendM: roundMetres(e.rampRight),
      leftBlendPercent: Math.round((e.rampLeft / width) * 1000) / 10,
      rightBlendPercent: Math.round((e.rampRight / width) * 1000) / 10,
    };
  });
  // Where three or more images stack, flag it: weights still normalise, but each projector's
  // own blend menu only has a left and a right ramp, so the stack needs care on site.
  const edges = extents.flatMap((e) => [e.left, e.right]).sort((a, b) => a - b);
  for (let i = 0; i < edges.length - 1; i++) {
    const mid = (edges[i] + edges[i + 1]) / 2;
    const depth = extents.filter((e) => mid > e.left && mid < e.right).length;
    if (depth >= 3) {
      warnings.push(`${depth} images overlap between ${roundMetres(edges[i])} m and ${roundMetres(edges[i + 1])} m; weights are normalised there.`);
      break;
    }
  }

  return {
    ok: edgeBlending.isEnabled && pairs.length > 0 && pairs.every((pair) => pair.status === 'matched'),
    projectorBlends,
    coverageWidthM: roundMetres(coverageWidthM),
    targetOverlapPercent: edgeBlending.overlap,
    targetFeatherPercent: edgeBlending.feather,
    pairs,
    warnings,
  };
}

/** Hermite smoothstep (spec 3.6 default feather profile); a zero-width ramp is a hard step. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface BlendExtent { id: string; name: string; left: number; right: number; rampLeft: number; rampRight: number }

/**
 * Each visible projector's image span on the wall (along x) and the width of the feather ramp on
 * each edge: the deepest overlap with any other image on that side, times the feather percentage.
 * An edge that overlaps nothing has no ramp, so the outer edges of the wall stay at full brightness.
 */
export function blendExtents(projectors: ProjectorConfig[], featherPercent: number): BlendExtent[] {
  const spans = projectors
    .filter((p) => p.isVisible)
    .map((p) => ({ id: p.id, name: p.name, left: p.parameters.position.x - p.parameters.imageWidth / 2, right: p.parameters.position.x + p.parameters.imageWidth / 2 }));
  const k = Math.min(1, Math.max(0, featherPercent / 100));
  return spans.map((a) => {
    const width = a.right - a.left;
    let leftOverlap = 0;
    let rightOverlap = 0;
    for (const b of spans) {
      if (b === a) continue;
      // b covers a's left edge from the left, or a's right edge from the right.
      if (b.left < a.left && b.right > a.left) leftOverlap = Math.max(leftOverlap, Math.min(b.right, a.right) - a.left);
      if (b.right > a.right && b.left < a.right) rightOverlap = Math.max(rightOverlap, a.right - Math.max(b.left, a.left));
    }
    return { ...a, rampLeft: Math.min(width, leftOverlap) * k, rampRight: Math.min(width, rightOverlap) * k };
  });
}

/**
 * Normalised blend weights at wall position `x` (spec 5.4, AC6): each projector's smoothstep ramp,
 * divided by the sum over every projector lighting that point, so any 2-, 3- or N-way overlap adds up
 * to exactly 1 and shows no bright band. A point no image reaches returns all zeros.
 */
export function blendWeightsAt(x: number, extents: BlendExtent[]): { id: string; weight: number }[] {
  const raw = extents.map((e) => {
    if (x < e.left || x > e.right) return 0;
    return smoothstep(e.left, e.left + e.rampLeft, x) * (1 - smoothstep(e.right - e.rampRight, e.right, x));
  });
  let sum = raw.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    // Exactly on a ramp's zero end with no other weight: the images that contain x share it evenly.
    raw.forEach((_, i) => { if (x >= extents[i].left && x <= extents[i].right) raw[i] = 1; });
    sum = raw.reduce((a, b) => a + b, 0);
  }
  return extents.map((e, i) => ({ id: e.id, weight: sum > 0 ? raw[i] / sum : 0 }));
}
