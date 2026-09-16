/**
 * Vite bundles the app but ignores design-system/reference/ — those pages are
 * static specimens that compile their own JSX in the browser. Copy them, and
 * the tokens and assets they resolve relative paths into, so the reference set
 * works from dist/ exactly as it does from the source tree.
 */
import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist/design-system');

const PARTS = ['reference', 'tokens', 'assets', 'styles.css'];

await mkdir(out, { recursive: true });
for (const part of PARTS) {
  await cp(resolve(root, 'design-system', part), resolve(out, part), { recursive: true });
}

console.log(`copied ${PARTS.join(', ')} → dist/design-system/`);
