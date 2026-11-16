/**
 * Shareable scene link (spec 3.7): the scene is compressed JSON in the URL hash, `#s=<base64url>`.
 * Decoding treats the link as untrusted input: anything malformed returns null, and every number
 * is clamped so a link cannot carry a broken lens or a zero curvature.
 */
import type { EdgeBlendingConfig, LockedParameter, ProjectorConfig, SurfaceConfig } from './types';
import { editOptics, OPTIC_RANGES } from './optics';

export interface SharedScene {
  projectors: ProjectorConfig[];
  surfaceConfig: SurfaceConfig;
  edgeBlendingConfig: EdgeBlendingConfig;
}

const MAX_HASH = 16_000;
const LOCKS: LockedParameter[] = ['throwDistance', 'imageWidth', 'throwRatio', 'aspectRatio', 'throwRatio+aspectRatio', null];
const SURFACES = ['Flat', 'Cylindrical', 'Spherical'] as const;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

const toB64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function encodeScene(scene: SharedScene): Promise<string> {
  const { projectors, surfaceConfig, edgeBlendingConfig } = scene;
  const json = JSON.stringify({ v: 1, projectors, surfaceConfig, edgeBlendingConfig });
  return `#s=${toB64Url(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw')))}`;
}

function num(v: unknown, lo: number, hi: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('bad number');
  return Math.min(hi, Math.max(lo, v));
}
const vec = (v: any, lim = 1000) => ({ x: num(v?.x, -lim, lim), y: num(v?.y, -lim, lim), z: num(v?.z, -lim, lim) });

function projector(p: any): ProjectorConfig {
  const q = p.parameters;
  const lock = LOCKS.includes(q.lockedParameter) ? (q.lockedParameter as LockedParameter) : null;
  const aspectRatio = num(q.aspectRatio, 0.5, 4);
  const imageWidth = num(q.imageWidth, ...OPTIC_RANGES.imageWidth);
  const seed = {
    throwDistance: num(q.throwDistance, ...OPTIC_RANGES.throwDistance),
    imageWidth,
    imageHeight: imageWidth / aspectRatio,
    throwRatio: num(q.throwRatio, ...OPTIC_RANGES.throwRatio),
    aspectRatio,
    position: vec(q.position),
    rotation: vec(q.rotation, 2 * Math.PI),
    lockedParameter: 'throwRatio' as LockedParameter,
  };
  // Re-derive distance from width and ratio so the three always agree.
  const parameters = { ...editOptics(seed, 'imageWidth', imageWidth).params, lockedParameter: lock };
  if (typeof p.id !== 'string' || typeof p.name !== 'string') throw new Error('bad projector');
  return {
    id: p.id.slice(0, 64),
    name: p.name.slice(0, 60),
    color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#3b82f6',
    isVisible: p.isVisible !== false,
    parameters,
  };
}

export async function decodeScene(hash: string): Promise<SharedScene | null> {
  const m = /^#s=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m || hash.length > MAX_HASH) return null;
  try {
    const raw = JSON.parse(new TextDecoder().decode(await pipe(fromB64Url(m[1]), new DecompressionStream('deflate-raw'))));
    if (raw?.v !== 1 || !Array.isArray(raw.projectors) || raw.projectors.length > 32) return null;
    const s = raw.surfaceConfig;
    const e = raw.edgeBlendingConfig;
    if (!SURFACES.includes(s?.type)) return null;
    return {
      projectors: raw.projectors.map(projector),
      surfaceConfig: {
        type: s.type,
        width: num(s.width, 0.1, 100),
        height: num(s.height, 0.1, 100),
        curvature: num(s.curvature, 0.001, 1),
        segments: Math.round(num(s.segments, 1, 128)),
        position: vec(s.position),
        rotation: vec(s.rotation, 2 * Math.PI),
      },
      edgeBlendingConfig: {
        isEnabled: e?.isEnabled === true,
        overlap: num(e?.overlap, 0, 50),
        feather: num(e?.feather, 0, 100),
        showRegions: e?.showRegions === true,
      },
    };
  } catch {
    return null;
  }
}
