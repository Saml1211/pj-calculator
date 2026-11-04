# AGENTS.md

This file provides guidance for AI coding agents working in the **pj-calculator** repository — a Next.js 15 web application for live event technicians to plan multi-projector setups on various surface geometries.

## Project Overview

- **Framework**: Next.js 15 (App Router) with React 19 RC
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with `tailwindcss-animate`; `cn()` utility from `lib/utils.ts` (clsx + tailwind-merge)
- **UI Components**: shadcn/ui (Radix primitives) — components live in `components/ui/`
- **3D Rendering**: Three.js via `@react-three/fiber` and `@react-three/drei`
- **State Management**: Zustand — single store in `lib/store.ts`, exported as `useAppStore`
- **Unique IDs**: `uuid` (v4)

## Directory Structure

```
app/                  # Next.js App Router: layout.tsx, page.tsx, globals.css
components/           # Feature components (projection-system, control-panel, etc.)
components/ui/        # shadcn/ui primitives (button, card, slider, input, etc.)
lib/                  # Core logic
  types.ts            # All TypeScript interfaces — the "data constitution"
  calculations.ts     # Pure math functions (no side effects)
  store.ts            # Zustand global state store
  utils.ts            # cn() class-merge utility
  logger.ts           # Logging utility (currently empty)
```

## Build / Dev / Lint Commands

| Command               | Description                    |
|-----------------------|--------------------------------|
| `npm run dev`         | Start dev server (Turbopack)   |
| `npm run build`       | Production build               |
| `npm run start`       | Start production server        |
| `npm run lint`        | Run ESLint (next lint)         |

**There is no test framework configured.** No test runner (Jest, Vitest, Playwright, etc.) is present. If you add tests, install Vitest or Jest and add a `test` script to `package.json`. To run a hypothetical single test: `npx vitest run path/to/test.test.ts`.

## Code Style Guidelines

### Imports
- Use the `@/` path alias for all project imports (maps to repo root via `tsconfig.json` paths).
- External libraries first, then `@/` imports, then relative imports.
- Named exports preferred over default exports for components.
- `import * as THREE from 'three'` for Three.js; do not use named imports from `three`.

```tsx
import { useState } from 'react';                    // external
import { Canvas } from '@react-three/fiber';          // external
import { useAppStore } from '@/lib/store';             // project alias
import { ProjectionCone } from './projection-cone';   // relative
```

### TypeScript
- Strict mode is enabled (`"strict": true` in tsconfig).
- Define shared types/interfaces in `lib/types.ts` — this is the single source of truth.
- Use explicit return types on exported functions.
- Prefer `interface` for object shapes; use `type` for unions and aliases (e.g., `LockedParameter`, `SurfaceType`).
- Avoid `any` where possible; use `unknown` or proper generics instead.
- Use `Partial<T>` for partial update payloads in Zustand actions.

### Naming Conventions
- **Files**: kebab-case (`projection-cone.tsx`, `control-panel.tsx`)
- **Components**: PascalCase (`ProjectionCone`, `ControlPanel`)
- **Hooks/Functions**: camelCase (`useAppStore`, `calculateLinkedParameters`)
- **Types/Interfaces**: PascalCase (`ProjectorConfig`, `AppState`)
- **Constants**: camelCase for module-scoped (`projectorColors`, `initialProjectorParams`)
- **Props interfaces**: `{ComponentName}Props` (e.g., `ProjectionConeProps`)

### Components
- All interactive/client components must have `'use client';` as the first line.
- Server components (in `app/`) omit the directive.
- Component props are defined as interfaces immediately above the component.
- Prefer function declarations for exported components: `export function Foo() {}`
- Use `React.FC<Props>` only when extending `GroupProps` or similar R3F types.

### Styling
- Use Tailwind utility classes exclusively. No CSS modules or styled-components.
- Use `cn()` from `@/lib/utils` for conditional/merged class names.
- shadcn/ui components are pre-styled; customize via `className` prop and `cn()`.
- Dark background (`bg-gray-800 text-white`) for the main layout.

### State Management (Zustand)
- Single store in `lib/store.ts` — exported as `useAppStore`.
- Actions are nested under `state.actions` — access via `useAppStore((s) => s.actions)`.
- All state mutations must be **immutable** — spread operators, `.filter()`, `.map()`, never direct mutation.
- Parameter calculations go through `calculateLinkedParameters()` from `lib/calculations.ts`.

### 3D / Three.js
- All 3D components live inside an R3F `<Canvas>` in `components/projection-system.tsx`.
- Use `@react-three/drei` helpers (`OrbitControls`, `Grid`, `Line`, `Box`) instead of raw Three.js where available.
- Use `useMemo` for geometry creation with dependency arrays to avoid re-creating on every render.
- Access Three.js classes via `THREE.*` namespace import.
- Colors are hex strings (e.g., `'#3b82f6'`).

### Error Handling
- Pure calculation functions in `lib/calculations.ts` clamp values with `Math.max`/`Math.min` to prevent non-physical results.
- Use guard clauses for missing state (e.g., `if (!selectedProjector) return <Placeholder />`).
- The `lib/logger.ts` file exists for structured logging — use it for non-trivial error/event logging.

### shadcn/ui Components
- Located in `components/ui/`. Do not edit these directly unless intentionally patching.
- Add new shadcn components with: `npx shadcn-ui@latest add <component>`
- Configuration in `components.json` — aliases map to `@/components` and `@/lib/utils`.

## Key Interfaces (from `lib/types.ts`)

| Interface              | Purpose                                           |
|------------------------|---------------------------------------------------|
| `ProjectorConfig`      | Single projector instance (id, name, color, params)|
| `ProjectionParameters` | Throw distance, width, ratio, position, rotation   |
| `SurfaceConfig`        | Projection surface geometry (flat/cylindrical/spherical) |
| `EdgeBlendingConfig`   | Edge blending overlap and feather settings         |
| `AppState`             | Root Zustand state shape                           |
| `AppActions`           | All state-modifying actions                        |

## Patterns to Follow

1. **Schema-First**: Define or update types in `lib/types.ts` before changing logic or UI.
2. **Pure Calculations**: Math logic goes in `lib/calculations.ts` — no side effects, no React imports.
3. **Immutable State**: Zustand updates always produce new objects/arrays.
4. **Component Isolation**: Each 3D or UI component receives its data via props or Zustand selectors — no prop drilling through multiple levels.
5. **Derived State**: Calculate derived values (e.g., `imageHeight = imageWidth / aspectRatio`) inside the calculation engine, not in components.
