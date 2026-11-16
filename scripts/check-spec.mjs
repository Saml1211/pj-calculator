// Checks the parts of Sam's spec ("3D Projection Mapping Calculator Specification", vault
// 40_Reference) that the store relies on: Table 2 lock rules and the throw-ratio invariant
// (AC1), Optics never touching Transform (AC2), separate undo rings (AC5), and the
// shareable scene link (3.7).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'node_modules', '.cache', 'pj-calculator-spec-check');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
execFileSync(join(root, 'node_modules/.bin/tsc'), [
  'lib/optics.ts', 'lib/history.ts', 'lib/scene-link.ts',
  '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node',
  '--esModuleInterop', '--skipLibCheck', '--noEmit', 'false', '--outDir', outDir,
], { cwd: root, stdio: 'inherit' });
const require = createRequire(import.meta.url);
const { editOptics, disabledReason, OPTIC_RANGES, toggleLock, isLocked } = require(join(outDir, 'optics.js'));
const history = require(join(outDir, 'history.js'));
const { encodeScene, decodeScene } = require(join(outDir, 'scene-link.js'));

const EPS = 1e-6;
const base = (lock, over = {}) => ({
  throwDistance: 5, imageWidth: 2, imageHeight: 2 / (16 / 9), throwRatio: 2.5, aspectRatio: 16 / 9,
  position: { x: 1, y: 1.5, z: 5 }, rotation: { x: 0.1, y: 0.2, z: 0 }, lockedParameter: lock, ...over,
});
const invariant = (p) => Math.abs(p.throwDistance / p.imageWidth - p.throwRatio) < EPS;

// Table 2, row by row.
let r = editOptics(base('throwRatio'), 'throwDistance', 6);
assert.equal(r.error, undefined); assert.ok(Math.abs(r.params.imageWidth - 6 / 2.5) < EPS);
r = editOptics(base('imageWidth'), 'throwDistance', 6);
assert.equal(r.error, 'OverConstrained'); assert.equal(r.params.throwDistance, 5);
r = editOptics(base('throwRatio'), 'imageWidth', 3);
assert.ok(Math.abs(r.params.throwDistance - 7.5) < EPS);
r = editOptics(base('throwDistance'), 'imageWidth', 3);
assert.equal(r.error, 'OverConstrained'); assert.equal(r.params.imageWidth, 2);
r = editOptics(base('throwDistance'), 'throwRatio', 2);
assert.ok(Math.abs(r.params.imageWidth - 2.5) < EPS);
r = editOptics(base('imageWidth'), 'throwRatio', 2);
assert.ok(Math.abs(r.params.throwDistance - 4) < EPS);
r = editOptics(base('throwRatio'), 'throwRatio', 2);
assert.equal(r.error, 'OverConstrained', 'a locked value cannot be edited');
r = editOptics(base('throwRatio'), 'aspectRatio', 16 / 10);
assert.equal(r.params.throwDistance, 5); assert.ok(Math.abs(r.params.imageHeight - 2 / 1.6) < EPS);

// The bug this replaces: clamping after the maths broke the invariant
// (ratio 2.5 locked, width 10 -> distance 25 clamped to 20, ratio still 2.5).
r = editOptics(base('throwRatio'), 'imageWidth', 10);
assert.ok(invariant(r.params), 'invariant holds when the computed value hits its limit');
assert.equal(r.params.throwDistance, 20); assert.ok(Math.abs(r.params.imageWidth - 8) < EPS);
assert.match(r.message, /limit/i);
r = editOptics(base(null), 'throwRatio', 99);
assert.equal(r.params.throwRatio, OPTIC_RANGES.throwRatio[1]); assert.match(r.message, /Clamped/);
r = editOptics(base(null), 'throwDistance', Number.NaN);
assert.equal(r.error, 'InvalidInput'); assert.equal(r.params.throwDistance, 5);

// AC1 + AC2 + idempotency over a grid of edits and locks.
const locks = [null, 'throwDistance', 'imageWidth', 'throwRatio', 'aspectRatio', 'throwRatio+aspectRatio'];
const edits = { throwDistance: [0.1, 0.3, 1, 7.3, 20, 40], imageWidth: [0.2, 0.5, 1.7, 10, 11], throwRatio: [0.1, 0.3, 0.8, 4.4, 7.5, 9] };
let cases = 0;
for (const lock of locks) for (const [param, values] of Object.entries(edits)) for (const v of values) {
  for (const start of [base(lock), base(lock, { throwDistance: 19, imageWidth: 9.5, throwRatio: 2 })]) {
    const once = editOptics(start, param, v);
    assert.ok(invariant(once.params), `invariant: lock ${lock} edit ${param}=${v}`);
    for (const [k, [lo, hi]] of Object.entries(OPTIC_RANGES)) assert.ok(once.params[k] >= lo - EPS && once.params[k] <= hi + EPS, `${k} in range`);
    assert.deepEqual(once.params.position, start.position); assert.deepEqual(once.params.rotation, start.rotation);
    assert.deepEqual(editOptics(once.params, param, v).params, once.params, 'idempotent');
    cases++;
  }
}

// 6.4: disabled controls follow Table 2.
assert.match(disabledReason('throwDistance', 'imageWidth'), /Image Width is locked/);
assert.match(disabledReason('imageWidth', 'throwDistance'), /Throw Distance is locked/);
assert.equal(disabledReason('throwDistance', 'throwRatio'), null);
assert.match(disabledReason('throwRatio', 'throwRatio'), /locked/);

// Fixed-lens dual lock (spec 3.3, Table 2 last four rows).
const FL = 'throwRatio+aspectRatio';
r = editOptics(base(FL), 'imageWidth', 3);
assert.equal(r.error, undefined); assert.ok(Math.abs(r.params.throwDistance - 7.5) < EPS);
r = editOptics(base(FL), 'throwDistance', 6);
assert.equal(r.error, undefined); assert.ok(Math.abs(r.params.imageWidth - 2.4) < EPS);
r = editOptics(base(FL), 'throwRatio', 2);
assert.equal(r.error, 'OverConstrained'); assert.equal(r.params.throwRatio, 2.5);
r = editOptics(base(FL), 'aspectRatio', 4 / 3);
assert.equal(r.error, 'OverConstrained'); assert.equal(r.params.aspectRatio, 16 / 9);
assert.match(disabledReason('aspectRatio', FL), /fixed by the lens lock/);
assert.match(disabledReason('throwRatio', FL), /fixed by the lens lock/);
assert.equal(disabledReason('imageWidth', FL), null);
assert.equal(disabledReason('throwDistance', FL), null);
assert.ok(isLocked('aspectRatio', FL) && isLocked('throwRatio', FL) && !isLocked('imageWidth', FL));
// 6.3: pressing a lock icon. One lock at a time, except ratio + aspect, which combine.
assert.equal(toggleLock(null, 'throwRatio'), 'throwRatio');
assert.equal(toggleLock('throwRatio', 'throwRatio'), null);
assert.equal(toggleLock('throwRatio', 'imageWidth'), 'imageWidth');
assert.equal(toggleLock('throwDistance', 'imageWidth'), 'imageWidth', 'distance and width never both lock');
assert.equal(toggleLock('throwRatio', 'aspectRatio'), FL);
assert.equal(toggleLock('aspectRatio', 'throwRatio'), FL);
assert.equal(toggleLock(FL, 'aspectRatio'), 'throwRatio');
assert.equal(toggleLock(FL, 'throwRatio'), 'aspectRatio');
assert.equal(toggleLock(FL, 'throwDistance'), 'throwDistance');

// AC5: separate undo rings (spec 8.3 scenario 2).
let h = history.emptyHistory();
const s0 = { projectors: [{ id: 'a', parameters: base('throwRatio', { position: { x: 0, y: 1.5, z: 5 } }) }], surfaceConfig: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } } };
const s1 = history.applyTransforms(s0, { ...history.takeTransforms(s0), 'projector:a': { position: { x: 5, y: 1.5, z: 5 }, rotation: { x: 0, y: 0, z: 0 } } });
h = history.record(h, 'transforms', s0, s1, 0);
const s2 = { ...s1, projectors: [{ ...s1.projectors[0], parameters: editOptics(s1.projectors[0].parameters, 'throwRatio', 1.5).params }] };
h = history.record(h, 'optics', s1, s2, 10_000);
let u = history.undo(h, 'transforms', s2);
assert.equal(u.scene.projectors[0].parameters.position.x, 0);
assert.equal(u.scene.projectors[0].parameters.throwRatio, s2.projectors[0].parameters.throwRatio);
u = history.undo(u.history, 'optics', u.scene);
assert.equal(u.scene.projectors[0].parameters.throwRatio, 2.5);
assert.equal(u.scene.projectors[0].parameters.position.x, 0);
const redo = history.redo(u.history, 'optics', u.scene);
assert.equal(redo.scene.projectors[0].parameters.throwRatio, s2.projectors[0].parameters.throwRatio);
// A slider drag is one step: edits within the coalesce window merge.
let d = history.emptyHistory(); let cur = s0;
for (let i = 1; i <= 30; i++) { const nx = history.applyTransforms(cur, { ...history.takeTransforms(cur), 'projector:a': { position: { x: i, y: 1.5, z: 5 }, rotation: { x: 0, y: 0, z: 0 } } }); d = history.record(d, 'transforms', cur, nx, i * 50, 'drag'); cur = nx; }
assert.equal(d.transforms.past.length, 1, 'one drag is one undo step');
// Each ring keeps at least 20 steps.
d = history.emptyHistory(); cur = s0;
for (let i = 1; i <= 25; i++) { const nx = history.applyTransforms(cur, { ...history.takeTransforms(cur), 'projector:a': { position: { x: i, y: 1.5, z: 5 }, rotation: { x: 0, y: 0, z: 0 } } }); d = history.record(d, 'transforms', cur, nx, i * 10_000); cur = nx; }
assert.ok(d.transforms.past.length >= 20);

// 3.7: share link round-trips the scene and rejects junk.
const scene = {
  projectors: [{ id: 'a', name: 'Left', color: '#3b82f6', isVisible: true, parameters: base('throwRatio') }],
  surfaceConfig: { type: 'Cylindrical', width: 5, height: 3, curvature: 0.2, segments: 32, position: { x: 0, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
  edgeBlendingConfig: { isEnabled: true, overlap: 20, feather: 50, showRegions: false },
};
const hash = await encodeScene(scene);
assert.match(hash, /^#s=[A-Za-z0-9_-]+$/);
assert.deepEqual(await decodeScene(hash), scene);
assert.equal(await decodeScene('#s=not-a-scene'), null);
assert.equal(await decodeScene(''), null);
const bad = structuredClone(scene); bad.surfaceConfig.curvature = 0; bad.projectors[0].parameters.throwRatio = 2.5; bad.projectors[0].parameters.throwDistance = 50;
const fixed = await decodeScene(await encodeScene(bad));
assert.equal(fixed.surfaceConfig.curvature, 0.001, 'curvature clamped off zero');
assert.ok(invariant(fixed.projectors[0].parameters), 'a shared link cannot carry broken optics');

console.log(`spec check passed (Table 2 rows, ${cases} invariant cases, undo rings, share link ${hash.length} chars)`);
