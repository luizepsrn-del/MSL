import { defineConfig } from 'vitest/config';

/**
 * Testes de lógica de domínio.
 *
 * Ambiente Node puro, sem DOM: aqui moram recorrência de rotina, cálculo de
 * saldo, prazo e migração de schema — a lógica cujo defeito perde dado. A
 * camada visual é coberta pelo /design-system e pelos testes de ponta a ponta.
 *
 * Config separada da do Vite de propósito: os testes de domínio não precisam
 * do plugin do React nem da transformação de JSX.
 */
export default defineConfig({
  test: {
    // `scripts` entrou porque o carimbo do operário de serviço decide o que
    // chega ao aparelho de quem usa: um script de build sem teste é um passo
    // do build que ninguém conferiu.
    include: ['{src,design-system}/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.mjs'],
    environment: 'node',
    // Sem globals: cada teste importa o que usa, o que mantém o ESLint honesto.
    globals: false,
  },
});
