// Gera os ícones do aplicativo instalado a partir da marca do DESIGN.md.
//
// A marca é a do `design-system/assets/favicon.svg`: um ponto roxo com brilho
// sobre a tela do sistema. As proporções vêm de lá, e as duas cores são as da
// folha original — #682EC7 sobre #06071A. Nada aqui é inventado.
//
// Rode com `node scripts/gerar-icones.mjs` depois de mexer na marca.

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'public', 'icones');

const TINTA = '#682EC7';
const TELA = '#06071A';

/**
 * As proporções do favicon, em fração do lado: brilho em 34,4% de raio e ponto
 * em 20,3%, os dois no centro.
 *
 * O brilho cabe dentro do círculo de 40% que as máscaras do Android respeitam,
 * então a mesma marca serve para o ícone comum e para o mascarável — muda só o
 * canto arredondado, que a plataforma desenha por conta no mascarável.
 */
const RAIO_DO_BRILHO = 0.344;
const RAIO_DO_PONTO = 0.203;

function marca(lado, { canto }) {
  const r = (fracao) => (lado * fracao).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" rx="${(lado * canto).toFixed(2)}" fill="${TELA}"/>
  <circle cx="${lado / 2}" cy="${lado / 2}" r="${r(RAIO_DO_BRILHO)}" fill="${TINTA}" opacity=".22"/>
  <circle cx="${lado / 2}" cy="${lado / 2}" r="${r(RAIO_DO_PONTO)}" fill="${TINTA}"/>
</svg>`;
}

const PECAS = [
  // O canto de 22% é o do favicon (rx 7 de 32).
  { arquivo: 'icone-192.png', lado: 192, canto: 0.22 },
  { arquivo: 'icone-512.png', lado: 512, canto: 0.22 },
  // Mascarável: quadrado cheio, porque quem recorta é o sistema.
  { arquivo: 'icone-mascaravel-512.png', lado: 512, canto: 0 },
  // O iOS arredonda sozinho e não aceita transparência.
  { arquivo: 'apple-touch-icon.png', lado: 180, canto: 0 },
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await mkdir(DESTINO, { recursive: true });

for (const { arquivo, lado, canto } of PECAS) {
  const svg = marca(lado, { canto });
  await pagina.setViewportSize({ width: lado, height: lado });
  await pagina.setContent(
    `<body style="margin:0;background:${TELA}">${svg}</body>`,
    { waitUntil: 'load' },
  );
  const png = await pagina.screenshot({ omitBackground: false });
  await writeFile(join(DESTINO, arquivo), png);
  console.log(`${arquivo} — ${lado}×${lado}, ${(png.length / 1024).toFixed(1)} KB`);
}

await navegador.close();
