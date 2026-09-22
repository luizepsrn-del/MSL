/**
 * Carimba o operário de serviço com a versão daquilo que foi construído.
 *
 * Existe por um defeito real: `VERSAO` era a constante `'msl-v1'`, escrita à
 * mão, e nunca mudou. Como o nome da caixa vem dela, o `activate` nunca
 * apagava nada, o `install` nunca rodava de novo — `sw.js` também não mudava
 * — e a cópia guardada do `index.html` e dos pedaços antigos ficava válida
 * para sempre. Uma falha de rede numa abertura servia o app inteiro de uma
 * versão anterior, e ele ficava ali: a pessoa abriu o calendário e a visão
 * nova simplesmente não existia, com um 504 no console para os arquivos que
 * a cópia velha não tinha.
 *
 * O carimbo é o resumo do `index.html` construído, que muda exatamente quando
 * algum pedaço muda — nem mais, nem menos.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARCA = '__VERSAO_DO_BUILD__';

/** O resumo curto de um texto. Curto porque ele só precisa ser diferente. */
export function versaoDe(indexHtml) {
  return createHash('sha256').update(indexHtml).digest('hex').slice(0, 12);
}

/**
 * Troca a marca pela versão.
 *
 * Falha alto quando a marca não está lá. Um carimbo que não pega devolve o
 * problema que este arquivo existe para resolver, e calado.
 */
export function carimbar(fonte, versao) {
  if (!fonte.includes(MARCA)) {
    throw new Error(`sw.js não tem ${MARCA}: o carimbo da versão não teria onde entrar`);
  }
  return fonte.replaceAll(MARCA, versao);
}

const esteArquivo = resolve(fileURLToPath(import.meta.url));
if (resolve(process.argv[1] ?? '') === esteArquivo) {
  const raiz = resolve(dirname(esteArquivo), '..');
  const dist = resolve(raiz, 'dist');

  const versao = versaoDe(await readFile(resolve(dist, 'index.html'), 'utf8'));
  const sw = await readFile(resolve(dist, 'sw.js'), 'utf8');
  await writeFile(resolve(dist, 'sw.js'), carimbar(sw, versao));

  console.log(`operário de serviço carimbado: ${versao}`);
}
