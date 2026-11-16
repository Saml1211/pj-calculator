import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const repoRoot = process.cwd();
const outDir = join(repoRoot, 'node_modules', '.cache', 'pj-calculator-edge-blend-check');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

execFileSync(
  join(repoRoot, 'node_modules/.bin/tsc'),
  [
    'lib/calculations.ts',
    '--target', 'ES2020',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--noEmit', 'false',
    '--outDir', outDir,
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

const require = createRequire(import.meta.url);
const { calculateEdgeBlendReport, blendExtents, blendWeightsAt, smoothstep } = require(join(outDir, 'calculations.js'));

const edgeBlending = { isEnabled: true, overlap: 20, feather: 50, showRegions: true };
const baseParams = {
  throwDistance: 5,
  imageWidth: 2,
  imageHeight: 1.125,
  throwRatio: 2.5,
  aspectRatio: 16 / 9,
  rotation: { x: 0, y: 0, z: 0 },
  lockedParameter: 'throwRatio',
};
const projectors = [
  { id: 'right', name: 'Right', color: '#fff', isVisible: true, parameters: { ...baseParams, position: { x: 1.6, y: 0, z: 0 } } },
  { id: 'left', name: 'Left', color: '#fff', isVisible: true, parameters: { ...baseParams, position: { x: 0, y: 0, z: 0 } } },
];

const report = calculateEdgeBlendReport(projectors, edgeBlending);
assert.equal(report.ok, true);
assert.equal(report.coverageWidthM, 3.6);
assert.equal(report.pairs.length, 1);
assert.equal(report.pairs[0].status, 'matched');
assert.equal(report.pairs[0].desiredOverlapM, 0.4);
assert.equal(report.pairs[0].actualOverlapM, 0.4);
assert.equal(report.pairs[0].featherWidthM, 0.2);

const tooNarrow = calculateEdgeBlendReport(
  [{ ...projectors[0], parameters: { ...baseParams, position: { x: 2.2, y: 0, z: 0 } } }, projectors[1]],
  edgeBlending
);
assert.equal(tooNarrow.ok, false);
assert.equal(tooNarrow.pairs[0].status, 'too_narrow');

// Places a 2 m wide projector centred on x metres.
const at = (id, x) => ({
  id,
  name: id,
  color: '#fff',
  isVisible: true,
  parameters: { ...baseParams, position: { x, y: 0, z: 0 } },
});

// Images that do not touch at all. Left spans -1..1 m, right spans 2.5..4.5 m,
// so there is a 1.5 m hole in the wall and a 0.4 m overlap still to buy on top
// of closing it. The correction is 1.9 m, not the 0.4 m a clamped overlap gives.
const gapped = calculateEdgeBlendReport([at('left', 0), at('right', 3.5)], edgeBlending);
assert.equal(gapped.ok, false);
assert.equal(gapped.pairs[0].status, 'too_narrow');
assert.equal(gapped.pairs[0].actualOverlapM, 0);
assert.equal(gapped.pairs[0].featherWidthM, 0);
assert.equal(gapped.pairs[0].deltaM, -1.9);
assert.match(gapped.pairs[0].recommendation, /1\.9 m closer/);

// Images overlapping by 1 m against a 0.4 m target.
const tooWide = calculateEdgeBlendReport([at('left', 0), at('right', 1)], edgeBlending);
assert.equal(tooWide.ok, false);
assert.equal(tooWide.pairs[0].status, 'too_wide');
assert.equal(tooWide.pairs[0].actualOverlapM, 1);
assert.equal(tooWide.pairs[0].deltaM, 0.6);
assert.equal(tooWide.pairs[0].featherWidthM, 0.5);
assert.match(tooWide.pairs[0].recommendation, /0\.6 m apart/);

// Three projectors handed over out of order: two seams, sorted west to east.
const chain = calculateEdgeBlendReport([at('c', 3.2), at('a', 0), at('b', 1.6)], edgeBlending);
assert.equal(chain.ok, true);
assert.equal(chain.pairs.length, 2);
assert.deepEqual(chain.pairs.map((pair) => pair.leftProjectorId), ['a', 'b']);
assert.equal(chain.coverageWidthM, 5.2);

// A hidden projector is not a seam, and one visible projector is not a blend.
const hidden = calculateEdgeBlendReport(
  [at('a', 0), { ...at('b', 1.6), isVisible: false }],
  edgeBlending
);
assert.equal(hidden.pairs.length, 0);
assert.equal(hidden.ok, false);
assert.ok(hidden.warnings.some((warning) => warning.includes('two visible projectors')));

// Feather off: a hard seam still measures, it just has no gradient.
const noFeather = calculateEdgeBlendReport([at('a', 0), at('b', 1.6)], { ...edgeBlending, feather: 0 });
assert.equal(noFeather.ok, true);
assert.equal(noFeather.pairs[0].featherWidthM, 0);

// Blending switched off: geometry still reported, but never signed off as ready.
const disabled = calculateEdgeBlendReport([at('a', 0), at('b', 1.6)], { ...edgeBlending, isEnabled: false });
assert.equal(disabled.ok, false);
assert.equal(disabled.pairs[0].status, 'matched');
assert.ok(disabled.warnings.some((warning) => warning.includes('disabled')));

// Per-projector blend menu: two 2 m images overlapping 0.4 m, feather 50 % -> 0.2 m ramp = 10 % on the inner edges only.
const menu = calculateEdgeBlendReport(projectors, edgeBlending).projectorBlends;
const L = menu.find((b) => b.projectorId === 'left'); const R = menu.find((b) => b.projectorId === 'right');
assert.equal(L.leftBlendPercent, 0); assert.equal(L.rightBlendPercent, 10); assert.equal(L.rightBlendM, 0.2);
assert.equal(R.leftBlendPercent, 10); assert.equal(R.rightBlendPercent, 0);

// AC6 / spec 8.4 test 2: in any 2-, 3- or N-way overlap the normalised weights sum to 1.
assert.equal(smoothstep(0, 1, 0.5), 0.5); assert.equal(smoothstep(1, 1, 0.5), 0); assert.equal(smoothstep(1, 1, 2), 1);
const EPS = 1e-6;
const sweep = (list, feather) => {
  const ex = blendExtents(list, feather);
  const lo = Math.min(...ex.map((e) => e.left)); const hi = Math.max(...ex.map((e) => e.right));
  let n = 0;
  for (let i = 0; i <= 2000; i++) {
    const x = lo + ((hi - lo) * i) / 2000;
    const w = blendWeightsAt(x, ex);
    const covered = ex.some((e) => x >= e.left && x <= e.right);
    const sum = w.reduce((a, b) => a + b.weight, 0);
    if (covered) { assert.ok(Math.abs(sum - 1) < EPS, `sum ${sum} at x=${x}`); n++; }
    assert.ok(w.every((v) => v.weight >= 0 && v.weight <= 1 + EPS));
  }
  return { ex, n };
};
const three = [at('a', 0), at('b', 0.8), at('c', 1.6)]; // 3-way overlap from 0.6 to 1.0 m
for (const f of [0, 25, 50, 100]) sweep(three, f);
const { ex: ex3 } = sweep(three, 50);
const mid = blendWeightsAt(0.8, ex3); // inside all three images
assert.ok(mid.every((v) => v.weight > 0), 'all three contribute in the 3-way zone');
assert.ok(Math.abs(mid.reduce((a, b) => a + b.weight, 0) - 1) < EPS);
const threeReport = calculateEdgeBlendReport(three, edgeBlending);
assert.ok(threeReport.warnings.some((w) => w.startsWith('3 images overlap')), '3-way stack is flagged');
sweep([at('a', 0), at('b', 1.6), at('c', 3.2), at('d', 4.8), at('e', 2.4)], 50); // 5 projectors, uneven stack
// Outside every image nothing is lit; a single image is at full weight away from its ramps.
const solo = blendExtents([at('a', 0)], 50);
assert.equal(blendWeightsAt(5, solo)[0].weight, 0);
assert.equal(blendWeightsAt(0, solo)[0].weight, 1);
assert.equal(calculateEdgeBlendReport([at('a', 0), at('b', 1.6)], edgeBlending).warnings.length, 0, 'no stack warning for a clean pair');

console.log('edge blend report check passed (AC6 sums to 1 over 2-, 3- and 5-projector sweeps)');