Section 1: Project Initialization and Foundational Schema DefinitionThis initial phase establishes the project's complete context, technology stack, and, most critically, the application's data contract. By defining the data schema first, we establish a single source of truth that will govern all subsequent component and logic development, preventing data-shape inconsistencies and ensuring architectural integrity from the outset.Directive 1.1: Master Objective & Technology Stack DeclarationYour primary objective is to create a web application for live event technicians and installation designers to plan multi-projector setups on various surface geometries.First, initialize a new Next.js project. Configure it according to the following specifications:Framework: Next.js 15 (App Router)Language: TypeScript (Strict Mode Enabled)Styling: Tailwind CSS3D Rendering: Three.js, accessed via @react-three/fiber and @react-three/dreiUI Components: shadcn/uiState Management: ZustandGenerate the package.json with the following dependencies:next@15react@19react-dom@19typescripttailwindcssthree@react-three/fiber@react-three/dreizustandclsx, tailwind-mergelucide-reactConfigure shadcn/ui and initialize the following components: button, card, slider, switch, input, label, tabs, select.Next, create the following directory and file structure. This structure provides a clear separation of concerns and will be followed for all subsequent development.Plaintext/

|-- app/
| |-- page.tsx                          # Main page component and layout root
|-- components/
| |-- projection-system.tsx             # Root 3D orchestrator component containing the R3F Canvas
| |-- projection-cone.tsx               # 3D visualization of a single projector's light cone
| |-- projection-surface.tsx            # 3D geometry for the projection surface (flat, cylindrical, spherical)
| |-- control-panel.tsx                 # UI panel for controlling selected projector parameters
| |-- projector-manager.tsx             # UI for managing the list of projectors (add, remove, select)
| |-- surface-manager.tsx               # UI for configuring the projection surface's geometry and position
| |-- edge-blending-controls.tsx        # UI for managing edge blending settings
| |-- model-import.tsx                  # (Optional) UI for loading custom 3D models as surfaces
| |-- ui/                               # Directory for all shadcn/ui components
|-- lib/
| |-- types.ts                          # Centralized TypeScript interface definitions (DATA SCHEMA)
| |-- calculations.ts                   # Pure functions for projection mathematics
| |-- store.ts                          # Zustand global state store definition
| |-- logger.ts                         # Utility for structured error and event logging
Directive 1.2: Schema-First Implementation (lib/types.ts)Before writing any application logic or UI components, you will first create the foundational data schema in lib/types.ts. This "Schema-First" approach is critical; it creates a "Data Constitution" for the application, ensuring that all components and functions operate on consistent, predictable, and type-safe data structures. This prevents a significant class of errors related to data shape mismatches and establishes a clear contract for the entire system.Populate lib/types.ts with the following TypeScript interfaces. Include the JSDoc comments exactly as provided, as they clarify the purpose and constraints of each property.TypeScript// lib/types.ts

/**

* @file Centralized TypeScript interface definitions for the application.
* This file serves as the single source of truth for all data structures.
 */

/**

* Represents the set of parameters that can be locked by the user.
* Locking a parameter makes it the independent variable in calculations.
 */
export type LockedParameter = 'throwDistance' | 'imageWidth' | 'throwRatio' | 'aspectRatio' | null;

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

/**

* Defines the shape of the global application state managed by Zustand.
 */
export interface AppState {
  projectors: ProjectorConfig;
  selectedProjectorIds: string;
  isLinkedMode: boolean;
  surfaceConfig: SurfaceConfig;
  edgeBlendingConfig: EdgeBlendingConfig;
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
  setSelectedProjectorIds: (ids: string) => void;
  toggleLinkedMode: () => void;
  setSurfaceConfig: (newConfig: Partial<SurfaceConfig>) => void;
  setEdgeBlendingConfig: (newConfig: Partial<EdgeBlendingConfig>) => void;
  adaptProjectorsToSurface: () => void;
}
Section 2: Core Logic and State Management ImplementationThis section focuses exclusively on the application's "brain." By deliberately isolating pure logic from UI and 3D rendering, we prevent context clash and ensure the foundational calculations are correct before any visual representation is attempted. This approach results in a "testable-by-construction" architecture, where the core engine can be validated independently of the presentation layer.Directive 2.1: The Projection Mathematics Engine (lib/calculations.ts)You will now implement the core mathematical logic in lib/calculations.ts. This file will contain pure functions responsible for all projection-related calculations.First, implement the calculateLinkedParameters function. This function is the heart of the application's interactivity. It must correctly recalculate unlocked parameters based on the single parameter that the user has locked. Adhere to the provided logic precisely to ensure mathematical consistency.TypeScript// lib/calculations.ts
import { ProjectionParameters, SurfaceConfig } from './types';
import* as THREE from 'three';

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
  const newParams = {...params, [updatedParam]: updatedValue };

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
        newParams.throwDistance = newParams.imageWidth *newParams.throwRatio;
      }
      break;
    case 'throwRatio':
      // Throw ratio is fixed. Changes to distance or width affect the other.
      if (updatedParam === 'throwDistance') {
        newParams.imageWidth = newParams.throwDistance / newParams.throwRatio;
      } else if (updatedParam === 'imageWidth') {
        newParams.throwDistance = newParams.imageWidth* newParams.throwRatio;
      }
      break;
    case 'aspectRatio':
      // Aspect ratio lock only affects height, which is always dependent.
      // The other three parameters behave as if nothing is locked.
      // Fallthrough to default is intentional.
    default:
      // No lock, or aspect ratio lock. The last changed parameter dictates the calculation.
      if (updatedParam === 'throwDistance' |

| updatedParam === 'imageWidth') {
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
Directive 2.2: The Global State Store (lib/store.ts)Now, set up the Zustand store in lib/store.ts. This store will be the single source of truth for the application's state, providing a centralized and reactive data layer.Define the store's state shape using the interfaces from lib/types.ts. Implement the initial state and all required actions. Ensure all state updates are immutable (i.e., always return new objects or arrays, never mutate the existing state).TypeScript// lib/store.ts
import { create } from 'zustand';
import { AppState, ProjectorConfig, ProjectionParameters } from './types';
import { calculateLinkedParameters, calculateProjectorWrapAround } from './calculations';
import { v4 as uuidv4 } from 'uuid'; // You may need to install uuid: npm install uuid @types/uuid

const initialProjectorParams: ProjectionParameters = {
  throwDistance: 3,
  imageWidth: 2,
  imageHeight: 2 / (16 / 9),
  throwRatio: 1.5,
  aspectRatio: 16 / 9,
  position: { x: 0, y: 1.5, z: 3 },
  rotation: { x: 0, y: Math.PI, z: 0 },
  lockedParameter: 'throwRatio',
};

const projectorColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export const useAppStore = create<AppState>((set, get) => ({
  projectors: [
    {
      id: uuidv4(),
      name: 'Projector 1',
      color: projectorColors,
      isVisible: true,
      parameters: initialProjectorParams,
    },
  ],
  selectedProjectorIds:,
  isLinkedMode: false,
  surfaceConfig: {
    type: 'Flat',
    width: 5,
    height: 3,
    curvature: 0.1,
    segments: 32,
    position: { x: 0, y: 1.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  edgeBlendingConfig: {
    isEnabled: false,
    overlap: 20,
    feather: 50,
    showRegions: false,
  },
  actions: {
    addProjector: () =>
      set((state) => {
        const newProjector: ProjectorConfig = {
          id: uuidv4(),
          name: `Projector ${state.projectors.length + 1}`,
          color: projectorColors[state.projectors.length % projectorColors.length],
          isVisible: true,
          parameters: initialProjectorParams,
        };
        return { projectors: [...state.projectors, newProjector] };
      }),
    removeProjector: (id) =>
      set((state) => ({
        projectors: state.projectors.filter((p) => p.id!== id),
        selectedProjectorIds: state.selectedProjectorIds.filter((selectedId) => selectedId!== id),
      })),
    updateProjector: (id, newConfig) =>
      set((state) => ({
        projectors: state.projectors.map((p) =>
          p.id === id? {...p,...newConfig } : p
        ),
      })),
    updateProjectorParameter: (id, param, value) =>
      set((state) => {
        const targetProjectors = state.isLinkedMode? state.projectors : state.projectors.filter(p => p.id === id);
        const updatedProjectors = [...state.projectors];

        targetProjectors.forEach(proj => {
            const newParams = calculateLinkedParameters(proj.parameters, param, value);
            const projIndex = updatedProjectors.findIndex(p => p.id === proj.id);
            if (projIndex!== -1) {
                updatedProjectors[projIndex] = {...updatedProjectors[projIndex], parameters: newParams };
            }
        });

        return { projectors: updatedProjectors };
      }),
    setSelectedProjectorIds: (ids) => set({ selectedProjectorIds: ids }),
    toggleLinkedMode: () => set((state) => ({ isLinkedMode:!state.isLinkedMode })),
    setSurfaceConfig: (newConfig) =>
      set((state) => ({
        surfaceConfig: {...state.surfaceConfig,...newConfig },
      })),
    setEdgeBlendingConfig: (newConfig) =>
      set((state) => ({
        edgeBlendingConfig: {...state.edgeBlendingConfig,...newConfig },
      })),
    adaptProjectorsToSurface: () => {
      // This will be implemented fully in Section 6
      console.log("Adapting projectors to surface...");
    },
  },
}));
Section 3: 3D Visualization Primitives and Scene SetupWith the data schema and core logic established, we now transition to the visual domain. This section focuses on creating the fundamental, reusable 3D building blocks of the application within the React Three Fiber ecosystem.Directive 3.1: The Main 3D Canvas (components/projection-system.tsx)Create the projection-system.tsx component. This component will host the main @react-three/fiber Canvas and set up the entire 3D environment. It will be responsible for orchestrating the rendering of all 3D objects based on the global state.Implement the component with the following scene configuration:Canvas: Set the background color to a dark gray (#1a1a1a).Camera: Use a PerspectiveCamera with a Field of View (FOV) of 50 degrees. Set its initial position to and make it look at the origin.Controls: Use <OrbitControls /> from @react-three/drei to allow camera manipulation.Lighting:An <ambientLight /> with an intensity of 0.5.A <directionalLight /> with an intensity of 1.0, positioned at ``.Environment:An infinite <Grid /> helper from @react-three/drei at y=0 to represent the floor. Configure it with a cell size of 1m, 20x20 cells, darker grid lines (#444), and brighter section lines every 5m (#888).An <axesHelper /> with a length of 5 units to show the XYZ orientation.This component will initially be a static scene setup. In Section 5, we will enhance it to become the central orchestrator that reads from the Zustand store and dynamically renders the projectors and surface.TypeScript// components/projection-system.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, AxesHelper } from '@react-three/drei';

export function ProjectionSystem() {
  return (
    <Canvas
      camera={{ position: , fov: 50 }}
      style={{ background: '#1a1a1a' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={} intensity={1.0} />
      <Grid
        position={}
        args={}
        cellSize={1}
        cellThickness={1}
        cellColor={'#444'}
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor={'#888'}
        fadeDistance={50}
        infiniteGrid
      />
      <AxesHelper args={} />
      <OrbitControls />
      {/*Projector and Surface components will be rendered here later*/}
    </Canvas>
  );
}
Directive 3.2: The Projection Cone Component (components/projection-cone.tsx)Create a dedicated component, projection-cone.tsx, to visualize a single projector's light cone. This component must be modular and reusable for every projector in the scene.The component will accept a ProjectorConfig object as a prop. From this prop, it will derive the necessary parameters to construct the 3D geometry.The visualization should consist of:Projector Body: A simple <Box /> geometry (0.3 x 0.2 x 0.4 units) to represent the projector itself. Position and rotate this box according to the projector.parameters.position and projector.parameters.rotation. Use the projector.color for its material.Projection Cone: A wireframe pyramid representing the light path. The apex of the pyramid is at the projector's position. The base of the pyramid is a rectangle representing the projected image on the screen.Calculate the four corner vertices of the screen rectangle based on throwDistance, imageWidth, and imageHeight. The center of this rectangle is throwDistance away from the projector along its local forward vector.Use <Line /> components from @react-three/drei to draw the four edges of the pyramid connecting the apex to the screen corners, and the four edges of the screen rectangle itself. Use the projector.color for these lines.Screen Plane: A semi-transparent <Plane /> at the screen's position to visualize the projected image area.TypeScript// components/projection-cone.tsx
'use client';

import { Box, Line } from '@react-three/drei';
import { GroupProps } from '@react-three/fiber';
import * as THREE from 'three';
import { ProjectorConfig } from '@/lib/types';

interface ProjectionConeProps extends GroupProps {
  projector: ProjectorConfig;
}

export function ProjectionCone({ projector,...props }: ProjectionConeProps) {
  const { position, rotation, imageWidth, imageHeight, throwDistance } = projector.parameters;

  // Calculate screen corner points relative to the projector's local space
  const halfW = imageWidth / 2;
  const halfH = imageHeight / 2;
  const screenCenter = new THREE.Vector3(0, 0, -throwDistance);

  const screenCorners =;

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
      <Line points={[...screenCorners, screenCorners]} color={projector.color} lineWidth={1} />

      {/* Screen Plane */}
      <mesh position={screenCenter}>
        <planeGeometry args={} />
        <meshBasicMaterial color={projector.color} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
Directive 3.3: The Projection Surface Component (components/projection-surface.tsx)Create the projection-surface.tsx component. This component will be responsible for rendering the projection surface geometry. It must be able to dynamically generate one of three different shapes based on its props.The component will accept a SurfaceConfig object as a prop. It will use a conditional rendering approach based on surface.type.Implement the geometry generation for each surface type:Flat: Use a standard <planeGeometry /> with the specified width, height, and segments.Cylindrical: Use a <cylinderGeometry />. The radius must be calculated from the width and curvature using the formula: $radius = width / (2 \cdot \pi \cdot curvature)$. The thetaLength of the cylinder segment will be $2 \cdot \pi \cdot curvature$. Ensure the geometry is open-ended.Spherical: Use a <sphereGeometry />. The radius will be calculated as $radius = \max(width, height) / (\pi \cdot curvature)$. The phiLength and thetaLength will be controlled by curvature to create a segment of a sphere.Position and rotate the entire mesh according to surface.position and surface.rotation. Use a semi-transparent meshStandardMaterial for visualization. Ensure that UV coordinates and normals are generated correctly for potential future texturing or lighting effects.TypeScript// components/projection-surface.tsx
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
        const radiusCyl = width / (2 *Math.PI* curvature);
        const thetaLength = 2 *Math.PI* curvature;
        return new THREE.CylinderGeometry(radiusCyl, radiusCyl, height, segments, 1, true, -thetaLength / 2, thetaLength);
      case 'Spherical':
        const radiusSph = Math.max(width, height) / (Math.PI *curvature);
        const phiLength = Math.PI* curvature; // Vertical curve
        const thetaLengthSph = Math.PI * curvature; // Horizontal curve
        return new THREE.SphereGeometry(radiusSph, segments, Math.round(segments / 2), -thetaLengthSph/2, thetaLengthSph, 0, phiLength);
      case 'Flat':
      default:
        return new THREE.PlaneGeometry(width, height, segments, segments);
    }
  }, [type, width, height, curvature, segments]);

  // For curved surfaces, we need to offset the mesh so its front face is at z=0
  const zOffset = useMemo(() => {
    if (type === 'Cylindrical') {
        const radius = width / (2 *Math.PI* curvature);
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
Section 4: Modular UI Control Panel ConstructionThis section directs the creation of the entire user-facing interface in a modular fashion. Each component is a separate, self-contained sub-task that connects to the central Zustand store to read data and dispatch actions. Use shadcn/ui components for a professional and consistent look and feel.Directive 4.1: Projector Manager (components/projector-manager.tsx)Build the UI for managing the list of projectors. This component is the primary interface for adding, deleting, and selecting projectors.Layout: A vertical stack within a card.Header: A title "Projector Manager" and a Button to toggle the "Link/Unlink" state (isLinkedMode in the store).Projector List: Render a list of cards, one for each projector in the projectors array from the store.Each card should display a color dot (using projector.color), the projector's name, and action buttons.The card for a selected projector (its ID is in selectedProjectorIds) must have a highlighted background (#334155).Support multi-select using Ctrl/Cmd+click.Action Buttons: Each projector card needs buttons for:Visibility toggle (using Eye/EyeOff icons).Delete (using Trash2 icon).Footer: An "Add Projector" button (with Plus icon) at the bottom to dispatch the addProjector action. An "Adapt to Curved Screen" button to dispatch adaptProjectorsToSurface.Directive 4.2: Main Control Panel (components/control-panel.tsx)Build the main control panel for editing the parameters of the currently selected projector(s). This component will be disabled if no projector is selected.Structure: Use a Tabs component with three tabs: "Basic", "Advanced", and "Position".Basic Tab:For Throw Distance, Image Width, and Throw Ratio, create a control group consisting of:A Label.A Slider with the specified range (e.g., 0.3-10m for distance).A number Input for precise value entry.A Button with a Lock/Unlock icon. This button's appearance must change when its corresponding parameter is the lockedParameter for the selected projector. Clicking it dispatches an action to update lockedParameter.For Aspect Ratio, provide a set of Buttons for standard presets (16:9, 16:10, 4:3, 2.35:1) and a Lock/Unlock button.Advanced Tab:Include Switch components for "Show Projection Cone" and "Show Measurements".Display read-only calculated values like "Image Height" and "Projection Angle".Position Tab:Provide number Input fields for Position (X, Y, Z) and Rotation (X, Y, Z). Note: The UI should display rotation in degrees, but the state and Three.js use radians. Perform the conversion.A "Reset Position" button.All interactive elements in this panel must read their values from the selected projector's state and dispatch the updateProjectorParameter action on change. If isLinkedMode is active, changes should apply to all projectors.Directive 4.3: Surface and Edge Blending PanelsCreate the final two UI panels.components/surface-manager.tsx:Structure: A card with a Tabs component ("Dimensions", "Position").Controls:A Select dropdown for "Surface Type" (Flat, Cylindrical, Spherical).In the Dimensions tab: Slider controls for Width, Height, and Segments.For curved surfaces, add a Slider for Curvature. Implement a toggle to switch its representation between percentage (0-100%) and degrees (0-360).In the Position tab: Input fields for Position (X, Y, Z) and Rotation (X, Y, Z) in degrees.State Connection: All controls read from and update the surfaceConfig object in the Zustand store via the setSurfaceConfig action.components/edge-blending-controls.tsx:Structure: A simple card.Controls:A master Switch to "Enable Edge Blending".A Slider for "Overlap Percentage" (0-50%).A Slider for "Feathering Percentage" (0-100%).A Switch to "Show Overlap Regions".State Connection: All controls are disabled if the master switch is off. They read from and update the edgeBlendingConfig object in the store via the setEdgeBlendingConfig action.Section 5: System Orchestration and Final AssemblyThis section integrates all previously generated parts—logic, 3D primitives, and UI controls—into a fully functional, reactive application.Directive 5.1: Assembling the Main Page (app/page.tsx)Implement the main page component. This component defines the overall application layout.Layout: Use Flexbox to create a two-column layout.Left Sidebar: A fixed-width div (320px) with a dark background (#1e293b). It should be scrollable.Main Canvas: A div that takes the remaining width (flex-grow).Component Placement:Inside the sidebar, stack the UI panel components vertically: ProjectorManager, ControlPanel, SurfaceManager, EdgeBlendingControls.Inside the main content area, render the ProjectionSystem component, which contains the 3D canvas.This component serves as the static layout container. The reactivity will be handled within the child components.Directive 5.2: The Orchestrator (components/projection-system.tsx)This is the critical integration step. Enhance the projection-system.tsx component to make it fully dynamic and state-driven.State Subscription: Use the useAppStore hook to subscribe to the projectors and surfaceConfig state.Dynamic Rendering:Map over the projectors array from the store. For each projector object, render a <ProjectionCone /> component, passing the entire projector object as a prop. Assign a unique key to each instance (e.g., key={projector.id}).Render a single <ProjectionSurface /> component, passing the surfaceConfig object from the store as its prop.Reactive Loop: This setup establishes the core reactive loop of the application:The UI panels dispatch actions to the Zustand store.The Zustand store updates its state.The ProjectionSystem component re-renders because its subscribed state has changed.The 3D scene updates with new props passed to ProjectionCone and ProjectionSurface, reflecting the new state visually.To ensure unambiguous implementation of the state flow, adhere to the following data flow matrix. This table provides the formal architectural blueprint for the application's reactivity, defining exactly which components read from and write to the global state.ComponentState Subscriptions (Reads)State Actions (Writes)projector-manager.tsxprojectors, selectedProjectorIds, isLinkedModeaddProjector, removeProjector, updateProjector (for visibility), setSelectedProjectorIds, toggleLinkedMode, adaptProjectorsToSurfacecontrol-panel.tsxprojectors[selectedId], selectedProjectorIds, isLinkedModeupdateProjectorParametersurface-manager.tsxsurfaceConfigsetSurfaceConfigedge-blending-controls.tsxedgeBlendingConfigsetEdgeBlendingConfigprojection-system.tsxprojectors, surfaceConfig(None)Section 6: Finalization, Validation, and Constraint ReinforcementThis final phase implements advanced features and acts as a Quality Assurance pass, forcing a review of the generated code against the project's most critical constraints.Directive 6.1: Implementing Curved Surface AlignmentReturn to lib/calculations.ts and fully implement the calculateProjectorWrapAround function.The logic must correctly position projectors around curved surfaces:For Cylindrical surfaces:Calculate the surface radius: $radius = width / (2 \cdot \pi \cdot curvature)$.Calculate the total angle subtended by the surface: $totalAngle = 2 \cdot \pi \cdot curvature$.Determine the projector's angle based on its horizontal offset: $angle = horizontalOffset \cdot totalAngle$.The projector's distance from the world origin is $distance = radius + throwDistance$.Calculate the final position: $x = \sin(angle) \cdot distance$, $y = surface.position.y$, $z = \cos(angle) \cdot distance - radius$.Calculate the final rotation to point towards the curve's center: $y_{rotation} = angle + \pi$.For Spherical surfaces: Implement a similar calculation accounting for both horizontal and vertical curvature.Next, implement the adaptProjectorsToSurface action in lib/store.ts. When dispatched (by clicking the "Adapt to Curved Screen" button), this action should:Get the current surfaceConfig and the array of projectors.Iterate through the projectors.For each projector, calculate its horizontal offset (e.g., for 3 projectors, offsets would be -0.33, 0, 0.33).Call calculateProjectorWrapAround to get the new position and rotation.Update each projector's state with the new position and rotation.Directive 6.2: Final Polish and Measurement OverlaysAdd the final visual details to enhance usability.Measurement Overlays: In projection-cone.tsx, use components from @react-three/drei like <Line> and <Text> to display measurement indicators.Draw a colored line from the projector to the screen center and label it with the throwDistance.Draw a line across the screen's width and label it with imageWidth.Draw a line along the screen's height and label it with imageHeight.Input Validation: Ensure all numeric inputs in the UI panels have appropriate validation to prevent non-numeric or out-of-range values from being entered.Directive 6.3: Constraint Re-priming and Final ReviewThis final directive serves as a mandatory quality check. The process of generating the preceding code is complex, and it is crucial to re-assert the global constraints to ensure the final output is coherent and robust.Review the entire codebase you have generated against the following checklist. Correct any discrepancies before concluding the task.Validation Criteria Checklist:Mathematical Correctness:Is throwRatio always equal to throwDistance / imageWidth (unless throwRatio is locked)?Is imageHeight always equal to imageWidth / aspectRatio?Does the locked parameter remain constant when other parameters are adjusted?Are unlocked parameters recalculated correctly in all four lock scenarios?Visual Accuracy:Do the projection cone's vertices perfectly align with the screen plane's corners?Does the 3D representation of each projector accurately reflect its position and rotation data?Do curved surfaces bend outwards in the positive Z direction from their origin point?Are measurement labels accurate and clearly legible?User Experience:Do all UI controls provide immediate visual feedback in the 3D scene?Is the state of locked parameters clearly indicated in the UI?Does multi-select (Ctrl/Cmd+click) function correctly in the projector list?Does "Linked Mode" correctly apply parameter changes to all projectors simultaneously?Code Quality:Is the entire codebase strongly typed with TypeScript, with no any types?Are complex mathematical functions (especially in calculations.ts) accompanied by explanatory comments?Are all state updates in the Zustand store immutable?Are there no errors or warnings in the browser's developer console?Common Pitfalls to Avoid (Final Check):State Mutation: Verify that no state object or array is ever mutated directly.Circular Calculations: Ensure the calculateLinkedParameters function never attempts to recalculate the parameter that is currently locked.Degrees vs. Radians: Confirm that all rotation values from the UI (in degrees) are converted to radians before being stored in the state or used by Three.js.Projector/Surface Collision: The calculateProjectorWrapAround function must always add the throwDistance to the surface radius to prevent positioning the projector inside the surface geometry.Invalid Curvature: Ensure curvature values are clamped to a minimum of 0.001 to prevent division-by-zero or Infinity radius values.Implement this system with production-quality code. The final product should be a robust, intuitive, and mathematically accurate tool for professionals in the live events industry.
