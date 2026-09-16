import { defineConfig, devices } from '@playwright/test';

const PORTA = 5174;
const BASE = `http://localhost:${PORTA}`;

/**
 * Testes de ponta a ponta.
 *
 * Dois alvos, porque o sistema tem dois clientes de verdade:
 *
 *   mac     — Chromium em viewport de desktop
 *   iphone  — WebKit no descritor do iPhone 15, com emulação de toque
 *
 * O iPhone roda WebKit, não Chromium. Testar o viewport do iPhone num motor
 * Blink daria um verde que não significa nada sobre o aparelho real, por isso
 * o projeto `iphone` usa WebKit de propósito.
 *
 * O `webServer` sobe o Vite sozinho numa porta própria (5174), para não
 * disputar com o dev server que você deixa aberto no 5173.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
    command: `npx vite --port ${PORTA} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
