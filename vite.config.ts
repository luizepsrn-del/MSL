import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const REFERENCE_BASE = '/design-system/reference/';

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jsx': 'text/babel',
  '.css': 'text/css',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * Serve design-system/reference/** byte-for-byte.
 *
 * Those pages are self-contained: they load React, Babel and the design-system
 * bundle from script tags and compile their own JSX in the browser. Vite's dev
 * pipeline would rewrite the .jsx files into ES modules first, and Babel would
 * then be handed already-transformed code referencing a JSX runtime that isn't
 * there — the pages load but render nothing. Static files, served raw, before
 * the transform middleware.
 *
 * The production build needs no equivalent: scripts/copy-reference.mjs copies
 * the folder into dist/ and `vite preview` serves it without transforming.
 */
function serveReferenceRaw(): Plugin {
  return {
    name: 'serve-design-system-reference-raw',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith(REFERENCE_BASE)) return next();

        // normalize() collapses any ../ before the path is joined to the root,
        // so a crafted URL cannot escape the reference folder.
        const rel = normalize(decodeURIComponent(url)).replace(/^(\.\.[/\\])+/, '');
        if (!rel.startsWith(REFERENCE_BASE)) return next();

        const file = join(process.cwd(), rel);
        readFile(file)
          .then((buf) => {
            res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(buf);
          })
          .catch(next);
      });
    },
  };
}

export default defineConfig({
  plugins: [serveReferenceRaw(), react()],
});
