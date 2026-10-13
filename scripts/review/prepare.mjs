import { createHash } from 'node:crypto';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Run from the repo root after materializing the exact selected Library board.
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/review/prepare.mjs <local panel-05 reference PNG>');
const bytes = await readFile(source);
const expected = '7417fd81e5e7de14c4fa0cd003e57196ff04b1d434e19cbab10b9a62b963065c';
if (createHash('sha256').update(bytes).digest('hex') !== expected) {
  throw new Error('Reference bytes do not match the selected panel-05 board; resolve the pinned Library file.');
}
const destination = resolve('output/playwright');
await mkdir(destination, { recursive: true });
await copyFile(source, resolve(destination, 'cyber-reference-board.png'));
for (const name of ['cyber-fidelity.html', 'sticker-material-native.html', 'sticker-material-comparison.html']) {
  await copyFile(resolve('scripts/review/templates', name), resolve(destination, name));
}
console.log(`Prepared local review pages in ${destination}; source PNG hash verified.`);
