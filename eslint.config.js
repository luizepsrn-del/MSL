import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import adherence from './adherence.rules.json' with { type: 'json' };

/**
 * Lint config.
 *
 * The design-system adherence rules came with the export and are the reason
 * this project lints at all: they stop raw hex colours, raw px values, unknown
 * fonts and undeclared component props from reaching the code. The 52
 * selectors in adherence.rules.json are lifted verbatim from the export's
 * _adherence.oxlintrc.json — edit that file, not this one, to change them.
 *
 * (The export shipped an oxlint config, but oxlint does not implement
 * no-restricted-syntax, which is what 52 of the 53 rules are written as. ESLint
 * runs them all, so the rules survived and the runner changed.)
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      // Static specimen pages and the vendored runtime they load. Preserved
      // verbatim as documentation — not application code.
      'design-system/reference/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        getComputedStyle: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        SVGElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLDivElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Node: 'readonly',
      },
    },
    rules: {
      // Application code imports from the barrel, never from internals.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/design-system/components/*/*', '**/design-system/patterns/*/*'],
              message:
                "Import design-system components from 'design-system' (the barrel), not component internals.",
            },
          ],
        },
      ],
      // The design-system adherence checks.
      'no-restricted-syntax': ['error', ...adherence.noRestrictedSyntax],
    },
  },

  {
    // The barrels re-export the internals by definition.
    files: [
      'design-system/index.ts',
      'design-system/components/index.ts',
      'design-system/patterns/index.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    // The library is where tokens are DEFINED, and where raw geometry is
    // legitimate — icon sizes, 1px hairlines, CSS grid tracks. The no-raw-value
    // rules exist to police code that CONSUMES the system, so they are off here.
    // Everything outside design-system/ is still held to them.
    files: ['design-system/components/**', 'design-system/patterns/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    // The showcase DOCUMENTS the system rather than consuming it, so the
    // raw-value rules misfire here in two ways: its prose quotes real values
    // ("2px → 64px", "#682EC7 is the source value") and its specimen grids use
    // CSS track sizes (minmax(240px, 1fr)) that no spacing token covers.
    // Everything it actually styles already goes through tokens. Product code
    // under src/ outside these files is still held to the full rule set.
    files: ['src/routes/Showcase.tsx', 'src/routes/showcase-*.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    // Arquivos de teste asseveram sobre valores de design literais — é o
    // trabalho deles. Um teste que garante que #682EC7 é a marca precisa
    // escrever #682EC7. As regras de valor cru continuam valendo para todo
    // o resto de src/.
    files: ['**/*.{test,spec}.ts', 'e2e/**', 'e2e-instalado/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    // O operário de serviço roda num worker, não na janela: `self`, `caches`,
    // `fetch` e `Request` são globais dele, e `window` não existe.
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
        Response: 'readonly',
      },
    },
  },

  {
    // Build scripts run in Node, not the browser.
    files: ['scripts/**', 'e2e/**', 'e2e-instalado/**', '*.config.js', '*.config.ts'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
);
