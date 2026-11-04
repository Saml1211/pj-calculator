// Generates a minimal valid binary glTF (.glb): one unit cube, vertex-colored.
// Run: node scripts/make-sample-glb.mjs  -> public/sample-cube.glb
// Used to smoke-test the Import Model feature without external assets.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 8 cube corners
const positions = new Float32Array([
  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  -0.5, 0.5, -0.5,
  -0.5, -0.5, 0.5,   0.5, -0.5, 0.5,   0.5, 0.5, 0.5,   -0.5, 0.5, 0.5,
]);
const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3, // back
  4, 6, 5, 4, 7, 6, // front
  0, 4, 5, 0, 5, 1, // bottom
  3, 2, 6, 3, 6, 7, // top
  0, 3, 7, 0, 7, 4, // left
  1, 5, 6, 1, 6, 2, // right
]);

const posBytes = Buffer.from(positions.buffer);
const idxBytes = Buffer.from(indices.buffer);
// 4-byte align each accessor inside the buffer
const pad = (b) => (b % 4 === 0 ? 0 : 4 - (b % 4));
const idxOffset = posBytes.length;
const idxPad = pad(idxBytes.length);
const binary = Buffer.concat([posBytes, idxBytes, Buffer.alloc(idxPad)]);

// min/max for POSITION accessor (required by spec)
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3) {
  for (let c = 0; c < 3; c++) {
    min[c] = Math.min(min[c], positions[i + c]);
    max[c] = Math.max(max[c], positions[i + c]);
  }
}

const gltf = {
  asset: { version: '2.0', generator: 'pj-calculator sample' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'SampleCube' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.25, 0.6, 1.0, 1.0], metallicFactor: 0.1, roughnessFactor: 0.6 } }],
  buffers: [{ byteLength: binary.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
    { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
  ],
};

const jsonStr = JSON.stringify(gltf);
let jsonBuf = Buffer.from(jsonStr, 'utf8');
const jsonPad = pad(jsonBuf.length);
if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.from(' '.repeat(jsonPad))]);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // 'glTF'
header.writeUInt32LE(2, 4); // version
const total = 12 + 8 + jsonBuf.length + 8 + binary.length;
header.writeUInt32LE(total, 8);

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0);
jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binChunkHeader = Buffer.alloc(8);
binChunkHeader.writeUInt32LE(binary.length, 0);
binChunkHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

const glb = Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binary]);

const out = resolve(__dirname, '..', 'public', 'sample-cube.glb');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, glb);
console.log(`Wrote ${out} (${glb.length} bytes)`);
