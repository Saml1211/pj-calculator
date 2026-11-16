/**
 * @file Centralized TypeScript interface definitions for the application.
 * This file serves as the single source of truth for all data structures.
 */

/**
 * Represents the set of parameters that can be locked by the user.
 * Locking a parameter makes it the independent variable in calculations.
 */
export type LockedParameter =
  | 'throwDistance'
  | 'imageWidth'
  | 'throwRatio'
  | 'aspectRatio'
  | 'throwRatio+aspectRatio' // fixed lens: the only permitted dual lock (spec 3.3)
  | null;

/**
 * Defines the geometric and optical properties of a single projector.
 * These parameters are interconnected and managed by the calculation engine.
 */
export interface ProjectionParameters {
  throwDistance: number;  // Distance from projector lens to screen center (in meters)
  imageWidth: number;     // Width of the projected image on the screen (in meters)
  imageHeight: number;    // Calculated height of the projected image (in meters)
  throwRatio: number;     // Ratio of throw distance to image width (lens-specific)
  aspectRatio: number;    // Ratio of image width to image height
  position: { x: number; y: number; z: number }; // 3D coordinates of the projector
  rotation: { x: number; y: number; z: number }; // Euler rotation of the projector (in radians)
  lockedParameter: LockedParameter; // The parameter currently locked by the user
}

/**
 * Represents a single projector instance in the scene.
 * Includes its configuration, unique identifier, and visual properties.
 */
export interface ProjectorConfig {
  id: string;             // Unique identifier (e.g., UUID)
  name: string;           // User-editable name (e.g., "Projector 1")
  color: string;          // Hex color code for visual identification in the UI and 3D scene
  isVisible: boolean;     // Toggles visibility in the 3D scene without deleting
  parameters: ProjectionParameters; // The core mathematical parameters for this projector
}

/**
 * Defines the available types of projection surfaces.
 */
export type SurfaceType = 'Flat' | 'Cylindrical' | 'Spherical';

/**
 * Defines the geometric properties and configuration of the projection surface.
 */
export interface SurfaceConfig {
  type: SurfaceType;      // The geometry type of the surface
  width: number;          // The overall width of the surface (in meters)
  height: number;         // The overall height of the surface (in meters)
  curvature: number;      // A normalized value (0.001 to 1.0) controlling the curve intensity
  segments: number;       // The number of segments for the surface mesh (controls smoothness)
  position: { x: number; y: number; z: number }; // 3D coordinates of the surface's center
  rotation: { x: number; y: number; z: number }; // Euler rotation of the surface (in radians)
}

/**
 * Defines the settings for visualizing edge blending between projectors.
 */
export interface EdgeBlendingConfig {
  isEnabled: boolean;     // Master toggle for the edge blending feature
  overlap: number;        // Percentage of image width that overlaps with the adjacent projector (0-50)
  feather: number;        // Percentage of the overlap region used for feathering/gradient (0-100)
  showRegions: boolean;   // Toggles the visibility of the blend zone visual overlay
}

export type EdgeBlendPairStatus = 'matched' | 'too_narrow' | 'too_wide';

export interface EdgeBlendPairReport {
  leftProjectorId: string;
  leftProjectorName: string;
  rightProjectorId: string;
  rightProjectorName: string;
  desiredOverlapM: number;
  actualOverlapM: number;   // Never negative; separated images read as 0 overlap
  deltaM: number;           // Signed distance to correct by; counts any gap between the images
  featherWidthM: number;
  status: EdgeBlendPairStatus;
  recommendation: string;
}

export interface ProjectorBlend {
  projectorId: string;
  projectorName: string;
  leftBlendM: number;
  rightBlendM: number;
  leftBlendPercent: number;  // share of this projector's image width
  rightBlendPercent: number;
}

export interface EdgeBlendReport {
  ok: boolean;
  projectorBlends: ProjectorBlend[];
  coverageWidthM: number;
  targetOverlapPercent: number;
  targetFeatherPercent: number;
  pairs: EdgeBlendPairReport[];
  warnings: string[];
}

/**
 * Defines the shape of the global application state managed by Zustand.
 */
export interface AppState {
  projectors: ProjectorConfig[];
  selectedProjectorIds: string[];
  isLinkedMode: boolean;
  surfaceConfig: SurfaceConfig;
  edgeBlendingConfig: EdgeBlendingConfig;
  customModelUrl: string | null;
  /** Two separate undo rings (optics, transforms); not persisted. */
  history: import('./history').History;
  /** Last clamp or refusal from an optics edit, shown under the optics controls. */
  opticsMessage: string | null;
  actions: AppActions;
}

/**
 * Defines the actions that can be dispatched to modify the global state.
 * All state modifications must occur through these actions to ensure consistency.
 */
export interface AppActions {
  addProjector: () => void;
  removeProjector: (id: string) => void;
  updateProjector: (id: string, newConfig: Partial<ProjectorConfig>) => void;
  updateProjectorParameter: (id: string, param: keyof ProjectionParameters, value: any) => void;
  setSelectedProjectorIds: (ids: string[]) => void;
  toggleLinkedMode: () => void;
  setSurfaceConfig: (newConfig: Partial<SurfaceConfig>) => void;
  setEdgeBlendingConfig: (newConfig: Partial<EdgeBlendingConfig>) => void;
  adaptProjectorsToSurface: () => void;
  setCustomModelUrl: (url: string | null) => void;
  setProjectorTransform: (id: string, t: { position?: { x: number; y: number; z: number }; rotation?: { x: number; y: number; z: number } }) => void;
  setLock: (id: string, lock: LockedParameter) => void;
  /** Granular resets (spec 6.5): each part goes to its own undo ring; 'all' records in both. */
  resetProjector: (id: string, part: 'position' | 'rotation' | 'optics' | 'all') => void;
  undo: (ring: 'optics' | 'transforms') => void;
  redo: (ring: 'optics' | 'transforms') => void;
  loadScene: (scene: Pick<AppState, 'projectors' | 'surfaceConfig' | 'edgeBlendingConfig'>) => void;
}
