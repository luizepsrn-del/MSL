import { defineConfig, devices } from '@playwright/test';

const PORTA = 5175;
const BASE = `http://localhost:${PORTA}`;

/**
 * Os testes do sistema instalado.
 *
 * Separados dos outros porque precisam do que foi **construído**: o operário
 * de serviço não é registrado em desenvolvimento, e sem ele não há como
 * provar que o sistema abre sem rede. Rodam com `npm run test:instalado`.
 */
export default defineConfig({
  testDir: './e2e-instalado',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'mac', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],

  webServer: {
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    url: BASE,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
