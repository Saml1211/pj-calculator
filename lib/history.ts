/**
 * Two independent undo rings (spec 3.7, 4.4, AC5): one for projector optics, one for
 * transforms (projector and surface position/rotation). Undoing one never touches the other.
 */
import type { ProjectionParameters } from './types';

type Vec3 = { x: number; y: number; z: number };
export type Ring = 'optics' | 'transforms';
type Optics = Pick<ProjectionParameters, 'throwDistance' | 'imageWidth' | 'imageHeight' | 'throwRatio' | 'aspectRatio' | 'lockedParameter'>;
type Transform = { position: Vec3; rotation: Vec3 };
type Slice = Record<string, Optics> | Record<string, Transform>;

interface SceneLike {
  projectors: { id: string; parameters: ProjectionParameters }[];
  surfaceConfig: { position: Vec3; rotation: Vec3 };
}

interface RingState { past: Slice[]; future: Slice[]; lastKey?: string; lastAt?: number }
export interface History { optics: RingState; transforms: RingState }

const LIMIT = 50; // the spec asks for at least 20 steps per ring
const COALESCE_MS = 800; // one slider drag or typed number is one step

export const emptyHistory = (): History => ({ optics: { past: [], future: [] }, transforms: { past: [], future: [] } });

export function takeOptics(scene: SceneLike): Record<string, Optics> {
  const out: Record<string, Optics> = {};
  for (const p of scene.projectors) {
    const { throwDistance, imageWidth, imageHeight, throwRatio, aspectRatio, lockedParameter } = p.parameters;
    out[p.id] = { throwDistance, imageWidth, imageHeight, throwRatio, aspectRatio, lockedParameter };
  }
  return out;
}

export function takeTransforms(scene: SceneLike): Record<string, Transform> {
  const out: Record<string, Transform> = {
    surface: { position: { ...scene.surfaceConfig.position }, rotation: { ...scene.surfaceConfig.rotation } },
  };
  for (const p of scene.projectors) {
    out[`projector:${p.id}`] = { position: { ...p.parameters.position }, rotation: { ...p.parameters.rotation } };
  }
  return out;
}

export function applyOptics<S extends SceneLike>(scene: S, slice: Record<string, Optics>): S {
  return {
    ...scene,
    projectors: scene.projectors.map((p) => (slice[p.id] ? { ...p, parameters: { ...p.parameters, ...slice[p.id] } } : p)),
  };
}

export function applyTransforms<S extends SceneLike>(scene: S, slice: Record<string, Transform>): S {
  const surface = slice.surface;
  return {
    ...scene,
    surfaceConfig: surface ? { ...scene.surfaceConfig, ...surface } : scene.surfaceConfig,
    projectors: scene.projectors.map((p) => {
      const t = slice[`projector:${p.id}`];
      return t ? { ...p, parameters: { ...p.parameters, ...t } } : p;
    }),
  };
}

const take = (ring: Ring, scene: SceneLike): Slice => (ring === 'optics' ? takeOptics(scene) : takeTransforms(scene));
const apply = <S extends SceneLike>(ring: Ring, scene: S, slice: Slice): S =>
  ring === 'optics' ? applyOptics(scene, slice as Record<string, Optics>) : applyTransforms(scene, slice as Record<string, Transform>);
const same = (a: Slice, b: Slice) => JSON.stringify(a) === JSON.stringify(b);

/** Record a change in `ring`. Edits with the same `key` inside the coalesce window merge into one step. */
export function record(h: History, ring: Ring, before: SceneLike, after: SceneLike, now: number, key?: string): History {
  const prev = take(ring, before);
  if (same(prev, take(ring, after))) return h;
  const r = h[ring];
  if (key && r.lastKey === key && r.lastAt !== undefined && now - r.lastAt < COALESCE_MS) {
    return { ...h, [ring]: { ...r, future: [], lastAt: now } };
  }
  return { ...h, [ring]: { past: [...r.past, prev].slice(-LIMIT), future: [], lastKey: key, lastAt: now } };
}

function step<S extends SceneLike>(h: History, ring: Ring, scene: S, from: 'past' | 'future'): { history: History; scene: S } {
  const r = h[ring];
  const stack = r[from];
  if (stack.length === 0) return { history: h, scene };
  const target = stack[stack.length - 1];
  const current = take(ring, scene);
  const to = from === 'past' ? 'future' : 'past';
  return {
    history: { ...h, [ring]: { [from]: stack.slice(0, -1), [to]: [...r[to], current].slice(-LIMIT) } as unknown as RingState },
    scene: apply(ring, scene, target),
  };
}

export const undo = <S extends SceneLike>(h: History, ring: Ring, scene: S) => step(h, ring, scene, 'past');
export const redo = <S extends SceneLike>(h: History, ring: Ring, scene: S) => step(h, ring, scene, 'future');
