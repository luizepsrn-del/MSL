import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { carimbar, versaoDe, MARCA } from './carimbar-operario.mjs';

/**
 * O carimbo da versão do operário de serviço.
 *
 * O que ele previne é concreto: com a versão escrita à mão, o nome da caixa
 * nunca mudava, o `activate` nunca apagava nada, e a cópia guardada de uma
 * versão anterior ficava válida para sempre. Uma falha de rede numa abertura
 * servia o app inteiro do mês passado — e ele ficava.
 */
describe('carimbar o operário', () => {
  it('troca a marca pela versão', () => {
    expect(carimbar(`const VERSAO = '${MARCA}';`, 'abc123')).toBe("const VERSAO = 'abc123';");
  });

  it('troca todas as marcas, e não só a primeira', () => {
    expect(carimbar(`${MARCA} e ${MARCA}`, 'x')).toBe('x e x');
  });

  it('falha alto quando não há onde carimbar', () => {
    // Um carimbo que não pega devolve, calado, o defeito que ele existe para
    // resolver. Melhor quebrar o build.
    expect(() => carimbar("const VERSAO = 'msl-v1';", 'abc123')).toThrow(/carimbo/);
  });

  it('o operário de verdade tem a marca', () => {
    // Renomear a constante no `sw.js` sem mexer aqui quebraria o build, o que
    // é o desejado — mas quebrar no teste custa menos.
    expect(readFileSync('public/sw.js', 'utf8')).toContain(MARCA);
  });
});

describe('a versão', () => {
  it('muda quando o index muda', () => {
    // O index nomeia os pedaços com hash: ele muda exatamente quando algum
    // pedaço muda, nem mais nem menos.
    expect(versaoDe('<script src="/assets/a.js">')).not.toBe(
      versaoDe('<script src="/assets/b.js">'),
    );
  });

  it('é a mesma para o mesmo index', () => {
    expect(versaoDe('igual')).toBe(versaoDe('igual'));
  });

  it('é curta, para o nome da caixa não virar um parágrafo', () => {
    expect(versaoDe('qualquer')).toHaveLength(12);
  });
});
