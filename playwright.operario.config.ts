import { defineConfig, devices } from '@playwright/test';

/**
 * O operário de serviço, em separado.
 *
 * A suíte principal bloqueia o operário — ele atrapalha a interceptação das
 * rotas `/api/` no WebKit. Aqui ele é o assunto, então ele é permitido; e como
 * o teste reescreve arquivos de `dist/` enquanto o servidor os serve, ele roda
 * sozinho, numa porta própria e num arquivo só.
 */
const PORTA = 5175;
const BASE = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: './e2e-operario',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE,
    serviceWorkers: 'allow',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Um motor só: o que se prova aqui é o ciclo de vida do operário, que é o
  // mesmo nos dois. As armadilhas de WebKit estão na suíte principal.
  projects: [{ name: 'mac', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    url: BASE,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
