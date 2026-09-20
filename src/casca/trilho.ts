import type React from 'react';

/**
 * O trilho de tiles.
 *
 * Uma fileira de indicadores tem dois comportamentos certos, e nenhum dos dois
 * é "grade que quebra em todo lugar":
 *
 * - **No telefone**, um trilho que transborda com encaixe. Empilhados, três
 *   tiles comem a tela inteira e o conteúdo de verdade só aparece depois de
 *   rolar — medido na tela de Metas antes desta extração.
 * - **No desktop**, flex que quebra e estica. O trilho ali não tem barra de
 *   rolagem, então o que passa da dobra fica simplesmente invisível: cinco
 *   tiles de `--grid-min` já não cabiam. E flex em vez de grade porque a grade
 *   deixava a última fileira com dois tiles e um vão do tamanho de dois.
 *
 * Isto é estilo compartilhado, não componente: não entra em `design-system/`
 * porque não há nada para desenhar — são três objetos de layout que `StatCard`
 * já sabe receber.
 */

export const GRADE_DE_TILES: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--card-gap)',
};

export const TRILHO_DE_TILES: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--card-gap)',
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  margin: '0 calc(-1 * var(--shell-gutter))',
  padding: '0 var(--shell-gutter)',
  // Sem isto o encaixe ignora a goteira e cola o primeiro tile na borda da
  // tela, desalinhado de todos os outros cartões. Medido: 16px viraram −4px.
  scrollPaddingLeft: 'var(--shell-gutter)',
  scrollbarWidth: 'none',
};

/** Cresce para preencher no desktop, transborda em trilho no telefone. */
export const ITEM_TRILHO: React.CSSProperties = {
  flex: '1 0 var(--grid-min)',
  scrollSnapAlign: 'start',
};
