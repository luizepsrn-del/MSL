import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { promisify } from 'node:util';

const rodar = promisify(execFile);

/**
 * As funções precisam carregar em Node puro, não só no Vitest.
 *
 * O Vitest resolve os imports pelo Vite, que adivinha a extensão que falta. A
 * Vercel não adivinha: `import '../src/servidor/rotas'` sem `.ts` quebrou lá
 * com `FUNCTION_INVOCATION_FAILED` e nenhuma pista, enquanto os 486 testes
 * daqui continuavam verdes. Este arquivo existe para essa diferença nunca mais
 * chegar publicada.
 *
 * Também pega o que a remoção pura de tipos recusa — propriedade de parâmetro
 * no construtor, `enum`, `namespace` — que são exatamente as construções que
 * falham só na hora de rodar.
 */

const FUNCOES = readdirSync('api')
  .filter((arquivo) => arquivo.endsWith('.ts'))
  .sort();

/** Os métodos HTTP que cada função precisa expor para a Vercel achar. */
const METODOS: Record<string, string[]> = {
  'cadastro.ts': ['POST'],
  'entrar.ts': ['POST'],
  'google-callback.ts': ['GET'],
  'google-conectar.ts': ['POST'],
  'google-desconectar.ts': ['POST'],
  'google-estado.ts': ['GET'],
  'google-sincronizar.ts': ['POST'],
  'agenda.ts': ['POST'],
  'sair.ts': ['POST'],
  'saude.ts': ['GET'],
  'sessoes.ts': ['GET', 'DELETE'],
  'sincronizar.ts': ['POST'],
};

describe('as funções da Vercel', () => {
  it('nenhum arquivo com underline em api/', () => {
    // A Vercel exclui da publicação os arquivos com underline. Eles sumiam do
    // pacote e a função quebrava ao carregar, sem pista nenhuma.
    expect(FUNCOES.filter((a) => a.startsWith('_'))).toEqual([]);
  });

  it('a lista de funções é a esperada', () => {
    // Função nova sem entrada aqui passaria sem ser conferida.
    expect(FUNCOES).toEqual(Object.keys(METODOS).sort());
  });

  it.each(FUNCOES)('%s carrega em Node puro e exporta só o método certo', async (arquivo) => {
    const { stdout } = await rodar(process.execPath, [
      '--experimental-strip-types',
      '--no-warnings',
      '-e',
      `import('./api/${arquivo}')
         .then((m) => console.log(JSON.stringify(Object.keys(m))))
         .catch((e) => { console.log('ERRO: ' + e.message); process.exitCode = 1; });`,
    ]);

    expect(stdout, `carregando api/${arquivo}`).not.toContain('ERRO:');

    const exportados = JSON.parse(stdout.trim()) as string[];

    // A igualdade já diz as duas coisas: que os métodos certos estão lá e que
    // **nada mais** está — inclusive `default`. Com `export default` a Vercel
    // pode entregar os objetos do Node em vez de um `Request`, e aí o
    // `Response` devolvido é ignorado calado.
    //
    // Antes isto eram dois testes, e o segundo gerava um processo Node por
    // função só para reconferir o `default`. Com doze funções ele passou a
    // estourar o tempo padrão e a falhar sozinho — trabalho duplicado que
    // virou instabilidade.
    expect(exportados.sort()).toEqual([...METODOS[arquivo]].sort());
    expect(exportados, `api/${arquivo} exporta default`).not.toContain('default');
  });
});
