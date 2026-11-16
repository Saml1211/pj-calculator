# PJ Calculator

A web application for live event technicians and installation designers to plan multi-projector setups on various surface geometries. Visualize projector placement, throw distances, and edge blending in real-time 3D.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.164-orange)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

## Features

### 3D Scene Visualization

- **Projection Cones** -- Wireframe visualization of each projector's light path from lens to screen, including the projected image rectangle.
- **Projection Surfaces** -- Support for three surface geometries:
  - **Flat** -- Standard planar screen.
  - **Cylindrical** -- Curved surface with configurable radius derived from width and curvature.
  - **Spherical** -- Domed surface segment with configurable horizontal and vertical curvature.
- **Interactive Camera** -- Orbit, pan, and zoom the 3D scene with mouse controls.
- **Grid & Axes** -- Metric grid floor and XYZ axes helper for spatial reference.

### Projector Management

- Add and remove multiple projectors in a single scene.
- Each projector gets a unique color and editable name.
- Toggle individual projector visibility.
- Multi-select projectors with Ctrl/Cmd+click.
- **Linked Mode** -- Apply parameter changes to all selected projectors simultaneously.

### Parameter Control

- **Throw Distance** (0.3 -- 20 m) -- Distance from lens to screen center.
- **Image Width** (0.5 -- 10 m) -- Width of the projected image on the surface.
- **Throw Ratio** (0.3 -- 7.5) -- Lens-specific ratio of throw distance to image width.
- **Aspect Ratio** -- Width-to-height ratio of the projected image.
- **Lock/Unlock** -- Lock any parameter to make it the independent variable; other parameters recalculate automatically.
- **Position & Rotation** -- Fine-tune 3D coordinates (X/Y/Z) and Euler angles in radians.
- **Color Picker** -- Per-projector hex color for visual identification.
- All values can be adjusted via sliders or numeric input fields.

### Locks, Undo and Sharing

- **Locks follow the spec's Table 2.** Distance / width = throw ratio always holds. When a computed value hits its limit, it stays at the limit and the value you edited is solved back, with a message under the controls. Locking Distance disables Width and the other way round; hover a disabled control for the reason.
- **Fixed lens**: lock Throw Ratio and Aspect Ratio together (press both lock icons). Distance and width then move together and the lens values refuse edits.
- **Resets per part**: Optics has **Reset optics**; Layout has **Reset position** (square in front of the surface centre at the current throw), **Reset rotation** and **Reset all**. Each goes into its own undo history.
- **Aspect ratio presets**: 16:9, 16:10, 4:3, 17:9, 21:9.
- **Two undo histories**: header **Optics** and **Position** undo/redo separately (a slider drag is one step). Cmd/Ctrl+Z undoes whichever changed last.
- **Copy link** puts the whole scene in the URL. Opening it in any browser loads that scene; a broken link is refused with a message.
- `npm test` runs `scripts/check-spec.mjs` (lock rules incl. the fixed-lens dual lock, invariant over 204 edits, undo rings, link round-trip) with the edge-blend and scene-recovery checks.

### Edge Blending

- Toggle edge blending on/off.
- Configure overlap percentage (0 -- 50%).
- Configure feather percentage (0 -- 100%) for gradient blending.
- Optionally visualize blend regions in the UI.
- The blend receipt lists each projector's left and right ramp as a % of its image (the number for its blend menu) and warns where three or more images stack. Weights are normalised so any 2-, 3- or N-way overlap sums to 1 (`npm test` sweeps 2, 3 and 5 projectors).

### Surface Configuration

- Select surface type (Flat, Cylindrical, Spherical).
- Adjust width, height, curvature, and mesh segment count.
- Curvature slider appears automatically for non-flat surfaces.

### Model Import and Recovery

- Load a local `.gltf`/`.glb` model or the bundled sample cube alongside the projection setup. External companion files for `.gltf` assets are not resolved by the file picker.
- A malformed model shows a contained scene error. The header **Reset scene**, the fallback **Reset scene**, and **Remove** all recover from that model failure without clearing projector, surface, or edge-blend settings.
- A healthy model change does not reset the viewport. An unchanged failing asset stays contained rather than retrying in a loop.
- Scene configuration persists in browser localStorage; imported model URLs do not survive a reload.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 RC |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + tailwindcss-animate |
| Components | shadcn/ui (Radix primitives) |
| 3D Rendering | Three.js via @react-three/fiber + @react-three/drei |
| State Management | Zustand |
| Unique IDs | uuid v4 |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repository-url>
cd pj-calculator
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

### Checks

```bash
npm test
npx tsc --noEmit
```

`npm test` runs the edge-blend assertions and the scene-boundary lifecycle self-check using the existing TypeScript/Node toolchain, without a new test framework. The lifecycle check substitutes synchronous `setState`; it is not a substitute for browser/WebGL acceptance. For that check, load the sample, then a malformed local model, recover through each reset/removal control, and load the sample again; projector settings must remain intact.

### Linting

```bash
npm run lint
```

## Project Structure

```
app/
  layout.tsx              Root layout (HTML shell)
  page.tsx                Main page -- assembles all panels and 3D viewport
  globals.css             Tailwind base + CSS custom properties (shadcn theming)

components/
  projection-system.tsx   R3F Canvas host -- scene setup, lighting, grid, orchestrates 3D objects
  projection-cone.tsx     Single projector wireframe cone + body box + screen plane
  projection-surface.tsx  Dynamic surface geometry (flat / cylindrical / spherical)
  control-panel.tsx       Parameter sliders, inputs, lock buttons, position/rotation, color picker
  projector-manager.tsx   Add/remove/select/toggle projectors, linked mode toggle
  surface-manager.tsx     Surface type selector + dimension/curvature controls
  edge-blending-controls.tsx  Edge blending toggle, overlap, feather settings
  model-import.tsx        Placeholder UI for custom 3D model loading
  ui/                     shadcn/ui primitives (button, card, slider, input, label, tabs, select, switch)

lib/
  types.ts                All shared TypeScript interfaces and types
  calculations.ts         Pure math: linked parameter recalculation, clamping, wrap-around
  store.ts                Zustand global state store + all actions
  utils.ts                cn() utility (clsx + tailwind-merge)
  logger.ts               Structured logging (currently empty)
```

## Architecture Notes

- **Schema-First** -- All shared data shapes are defined in `lib/types.ts` before any logic or UI.
- **Pure Calculations** -- Projection math lives in `lib/calculations.ts` with no React or side-effect dependencies. Values are clamped to physically valid ranges.
- **Immutable State** -- Zustand actions always produce new objects/arrays via spread operators, `.map()`, and `.filter()`. Direct mutation is never used.
- **Component Isolation** -- Each component reads from the Zustand store directly via selectors. No prop drilling across multiple levels.

## Limitations & Roadmap

- `adaptProjectorsToSurface()` is stubbed out -- automatic projector positioning on curved surfaces is not yet implemented.
- Imported models are scene references, not calibrated optical projection surfaces.
- Automated checks cover edge-blend calculations and error-boundary lifecycle behavior, not physical projector accuracy.
