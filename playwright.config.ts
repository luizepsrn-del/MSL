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

  /*
   * Serve o **build**, e não o servidor de desenvolvimento.
   *
   * Duas razões, e a segunda importa mais:
   *
   * 1. O Vite em desenvolvimento compila sob demanda. Com 250 testes em dois
   *    motores batendo na mesma instância, ele engasgava e o WebKit caía no
   *    meio — `Target page, context or browser has been closed`, em testes
   *    diferentes a cada rodada, enquanto cada arquivo passava inteiro quando
   *    rodado sozinho.
   * 2. É o que de fato é publicado. Testar o desenvolvimento e publicar o
   *    build é testar uma coisa e entregar outra — e esta sessão já teve dois
   *    defeitos que só o artefato publicado revelou.
   */
  webServer: {
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
