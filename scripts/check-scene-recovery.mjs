import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'node_modules', '.cache', 'pj-calculator-scene-check');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'node_modules', '@'), { recursive: true });
execFileSync(join(root, 'node_modules/.bin/tsc'), [
  '--project', 'tsconfig.json', '--noEmit', 'false', '--incremental', 'false',
  '--module', 'commonjs', '--moduleResolution', 'node', '--jsx', 'react-jsx',
  '--outDir', outDir,
], { cwd: root, stdio: 'inherit' });
// TypeScript preserves @/ imports; point them at this disposable compiled tree.
for (const dir of ['components', 'lib']) {
  symlinkSync(join(outDir, dir), join(outDir, 'node_modules', '@', dir), 'junction');
}
const require = createRequire(import.meta.url);
const { SceneErrorBoundary } = require(join(outDir, 'components/scene-error-boundary.js'));
const child = 'projection scene';

for (const [before, after] of [['blob:bad', null], ['blob:bad', '/sample-cube.glb'], ['blob:bad', 'blob:good']]) {
  const boundary = new SceneErrorBoundary({ children: child, resetKey: before });
  boundary.state = SceneErrorBoundary.getDerivedStateFromError(new Error('bad asset'));
  let updates = 0;
  // Unit seam: React normally applies setState; browser acceptance checks scheduling.
  boundary.setState = (update) => { updates++; boundary.state = { ...boundary.state, ...update }; };
  assert.notEqual(boundary.render(), child);
  const previous = boundary.props;
  boundary.props = { ...previous, resetKey: after };
  boundary.componentDidUpdate?.(previous);
  assert.equal(boundary.state.hasError, false, `recover ${before} -> ${after}`);
  assert.equal(boundary.state.message, undefined);
  assert.equal(boundary.render(), child);
  assert.equal(updates, 1);
  boundary.componentDidUpdate?.(boundary.props);
  assert.equal(updates, 1, 'state update must not start a retry loop');

  boundary.state = SceneErrorBoundary.getDerivedStateFromError(new Error('still broken'));
  boundary.componentDidUpdate?.(boundary.props);
  assert.equal(boundary.state.hasError, true, 'same failed asset must stay contained');
}

const healthy = new SceneErrorBoundary({ children: child, resetKey: 'blob:good' });
healthy.setState = () => assert.fail('healthy model changes must not reset the scene');
healthy.componentDidUpdate?.({ children: child, resetKey: null });
assert.equal(healthy.render(), child);

let resets = 0;
const manual = new SceneErrorBoundary({ children: child, onReset: () => resets++ });
manual.state = SceneErrorBoundary.getDerivedStateFromError('render failure');
manual.setState = (update) => { manual.state = { ...manual.state, ...update }; };
manual.componentDidUpdate?.(manual.props);
assert.equal(manual.state.hasError, true, 'unrelated renders must preserve the fallback');
manual.handleReset();
assert.equal(resets, 1);
assert.equal(manual.render(), child);
console.log('scene recovery check passed (3 model transitions, no retry loop, healthy scene, manual reset)');
