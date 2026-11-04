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
const { calculateEdgeBlendReport } = require(join(outDir, 'calculations.js'));

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

console.log('edge blend report check passed');