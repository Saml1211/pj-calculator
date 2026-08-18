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

console.log('edge blend report check passed');