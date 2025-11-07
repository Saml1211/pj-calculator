import { ProjectionParameters, SurfaceConfig } from './types';
import * as THREE from 'three';

/**
 * Recalculates dependent projection parameters based on which parameter is locked.
 * This function ensures that the mathematical relationships between throw distance,
 * image width, throw ratio, and aspect ratio are always maintained.
 *
 * @param params The current parameters of the projector.
 * @param updatedParam The key of the parameter that was just changed by the user.
 * @param updatedValue The new value of the changed parameter.
 * @returns A new ProjectionParameters object with all values recalculated and consistent.
 */
export function calculateLinkedParameters(
  params: ProjectionParameters,
  updatedParam: keyof ProjectionParameters,
  updatedValue: any
): ProjectionParameters {
  const newParams = { ...params, [updatedParam]: updatedValue };

  switch (newParams.lockedParameter) {
    case 'throwDistance':
      // Throw distance is fixed. Changes to ratio or width affect the other.
      if (updatedParam === 'imageWidth') {
        newParams.throwRatio = newParams.throwDistance / newParams.imageWidth;
      } else if (updatedParam === 'throwRatio') {
        newParams.imageWidth = newParams.throwDistance / newParams.throwRatio;
      }
      break;
    case 'imageWidth':
      // Image width is fixed. Changes to ratio or distance affect the other.
      if (updatedParam === 'throwDistance') {
        newParams.throwRatio = newParams.throwDistance / newParams.imageWidth;
      } else if (updatedParam === 'throwRatio') {
        newParams.throwDistance = newParams.imageWidth * newParams.throwRatio;
      }
      break;
    case 'throwRatio':
      // Throw ratio is fixed. Changes to distance or width affect the other.
      if (updatedParam === 'throwDistance') {
        newParams.imageWidth = newParams.throwDistance / newParams.throwRatio;
      } else if (updatedParam === 'imageWidth') {
        newParams.throwDistance = newParams.imageWidth * newParams.throwRatio;
      }
      break;
    case 'aspectRatio':
      // Aspect ratio lock only affects height, which is always dependent.
      // The other three parameters behave as if nothing is locked.
      // Fallthrough to default is intentional.
    default:
      // No lock, or aspect ratio lock. The last changed parameter dictates the calculation.
      if (updatedParam === 'throwDistance' || updatedParam === 'imageWidth') {
        newParams.throwRatio = newParams.throwDistance / newParams.imageWidth;
      } else if (updatedParam === 'throwRatio') {
        newParams.throwDistance = newParams.imageWidth * newParams.throwRatio;
      }
      break;
  }

  // Image height is always a dependent variable.
  newParams.imageHeight = newParams.imageWidth / newParams.aspectRatio;

  // Clamp values to prevent non-physical results.
  newParams.throwDistance = Math.max(0.3, Math.min(20, newParams.throwDistance));
  newParams.imageWidth = Math.max(0.5, Math.min(10, newParams.imageWidth));
  newParams.throwRatio = Math.max(0.3, Math.min(7.5, newParams.throwRatio));

  return newParams;
}

/**
 * Calculates the optimal position and rotation for a projector to align with a curved surface.
 * This function will be fully implemented in a later step. For now, define the signature
 * and a basic implementation for flat surfaces.
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
  const position = new THREE.Vector3(
    surface.position.x,
    surface.position.y,
    surface.position.z + projectorParams.throwDistance
  );
  const rotation = new THREE.Euler(0, Math.PI, 0); // Pointing towards -Z

  // Placeholder for future curved surface logic
  // if (surface.type === 'Cylindrical') {... }
  // if (surface.type === 'Spherical') {... }

  return { position, rotation };
}
