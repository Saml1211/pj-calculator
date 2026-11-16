/**
 * Projector optics edits, per the spec's Table 2 ("Optical Parameter Lock Propagation Logic").
 * Invariant (AC1): throwRatio = throwDistance / imageWidth after every edit, within 1e-6.
 * An optics edit never touches position or rotation (AC2).
 */
import type { LockedParameter, ProjectionParameters } from './types';

export type OpticParam = 'throwDistance' | 'imageWidth' | 'throwRatio' | 'aspectRatio';
export type OpticsError = 'OverConstrained' | 'InvalidInput';

export interface OpticsEdit {
  params: ProjectionParameters;
  error?: OpticsError;
  message?: string;
}

export const OPTIC_RANGES: Record<'throwDistance' | 'imageWidth' | 'throwRatio', [number, number]> = {
  throwDistance: [0.3, 20],
  imageWidth: [0.5, 10],
  throwRatio: [0.3, 7.5],
};
const ASPECT_RANGE: [number, number] = [0.5, 4];

const LABEL: Record<OpticParam, string> = {
  throwDistance: 'Throw Distance',
  imageWidth: 'Image Width',
  throwRatio: 'Throw Ratio',
  aspectRatio: 'Aspect Ratio',
};

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export const FIXED_LENS = 'throwRatio+aspectRatio' as const;

/** True when `param` is held by `lock` (the fixed-lens dual lock holds both ratio and aspect). */
export function isLocked(param: OpticParam, lock: LockedParameter): boolean {
  return lock === param || (lock === FIXED_LENS && (param === 'throwRatio' || param === 'aspectRatio'));
}

/**
 * The lock after the user presses `param`'s lock icon (spec 6.3). Pressing a free parameter locks it
 * and frees the previous one, except that throw ratio and aspect ratio combine into the fixed-lens
 * dual lock. Pressing a locked parameter frees only that one.
 */
export function toggleLock(lock: LockedParameter, param: OpticParam): LockedParameter {
  if (lock === FIXED_LENS) {
    if (param === 'throwRatio') return 'aspectRatio';
    if (param === 'aspectRatio') return 'throwRatio';
    return param;
  }
  if (lock === param) return null;
  const pair = (a: LockedParameter, b: OpticParam) =>
    (a === 'throwRatio' && b === 'aspectRatio') || (a === 'aspectRatio' && b === 'throwRatio');
  return pair(lock, param) ? FIXED_LENS : param;
}

/** Why a control is disabled under the current lock, or null when it is editable. */
export function disabledReason(param: OpticParam, lock: LockedParameter): string | null {
  if (lock === FIXED_LENS && isLocked(param, lock)) return `${LABEL[param]} is fixed by the lens lock`;
  if (lock === param) return `${LABEL[param]} is locked`;
  if (param === 'throwDistance' && lock === 'imageWidth') return 'Disabled because Image Width is locked';
  if (param === 'imageWidth' && lock === 'throwDistance') return 'Disabled because Throw Distance is locked';
  return null;
}

type Linear = 'throwDistance' | 'imageWidth' | 'throwRatio';

/** The parameter Table 2 recomputes when `edited` changes under `lock`. */
function dependentOf(edited: Linear, lock: LockedParameter): Linear {
  if (lock === 'throwRatio' || lock === FIXED_LENS) return edited === 'throwDistance' ? 'imageWidth' : 'throwDistance';
  if (lock === 'throwDistance') return 'imageWidth'; // only throwRatio is editable here
  if (lock === 'imageWidth') return 'throwDistance'; // only throwRatio is editable here
  return edited === 'throwRatio' ? 'throwDistance' : 'throwRatio';
}

/** Solve `target` from the other two so that throwRatio = throwDistance / imageWidth. */
function solve(p: ProjectionParameters, target: Linear): number {
  if (target === 'throwRatio') return p.throwDistance / p.imageWidth;
  if (target === 'throwDistance') return p.imageWidth * p.throwRatio;
  return p.throwDistance / p.throwRatio;
}

export function editOptics(params: ProjectionParameters, param: OpticParam, value: number): OpticsEdit {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { params, error: 'InvalidInput', message: `${LABEL[param]} must be a number` };
  }
  const lock = params.lockedParameter;
  if (isLocked(param, lock)) {
    return { params, error: 'OverConstrained', message: `Cannot edit ${LABEL[param]}: it is locked` };
  }
  const conflict = disabledReason(param, lock);
  if (conflict) {
    return { params, error: 'OverConstrained', message: `Cannot edit ${LABEL[param]} when ${LABEL[lock as OpticParam]} is locked` };
  }

  if (param === 'aspectRatio') {
    const aspectRatio = clamp(value, ASPECT_RANGE);
    return {
      params: { ...params, aspectRatio, imageHeight: params.imageWidth / aspectRatio },
      message: aspectRatio !== value ? `Clamped to ${ASPECT_RANGE[0]}-${ASPECT_RANGE[1]}` : undefined,
    };
  }

  const range = OPTIC_RANGES[param];
  const edited = clamp(value, range);
  let message = edited !== value ? `Clamped to ${range[0]}-${range[1]}` : undefined;
  const next: ProjectionParameters = { ...params, [param]: edited };
  const dep = dependentOf(param, lock);
  const raw = solve(next, dep);
  next[dep] = clamp(raw, OPTIC_RANGES[dep]);
  if (next[dep] !== raw) {
    // The computed value hit its limit: hold it there and back-solve the edited one,
    // so the three numbers still agree rather than showing an impossible lens.
    next[param] = clamp(solve(next, param), range);
    message = `${LABEL[dep]} is at its limit; ${LABEL[param]} set to ${next[param].toFixed(2)}`;
  }
  next.imageHeight = next.imageWidth / next.aspectRatio;
  return { params: next, message };
}
