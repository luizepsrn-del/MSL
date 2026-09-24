# Acervo na Criação — plano de implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à Criação uma área de documentação onde arquivos de verdade — imagens, PDFs, HTML — ficam guardados no MSL, abríveis depois, e ligados às peças.

**Architecture:** O banco (JSON em `localStorage`, espelhado como blob único no Redis) guarda só a **ficha** do arquivo; os bytes moram no Vercel Blob, atrás da sessão, alcançados por três rotas novas. Uma coleção `arquivos` entra em `COLECOES` e ganha sincronização de graça, porque `juntar` é genérico. O tipo do arquivo é derivado do `mime`, nunca gravado.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Playwright, Vercel Functions, Upstash Redis (já existente), Vercel Blob (novo, via `fetch` sem SDK).

**Spec:** `docs/superpowers/specs/2026-09-24-acervo-na-criacao-design.md`

---

## Leia isto antes de começar

Cinco regras deste repositório que este plano obedece o tempo todo. Quebrar
qualquer uma delas é bug, não estilo:

1. **`DESIGN.md` é o contrato visual.** Token novo se declara em
   `design-system/tokens/` e se registra no `DESIGN.md` **antes** do código.
2. **Componente novo nasce em `design-system/`**, com um `.prompt.md` ao lado.
   Nunca ao lado da tela.
3. **Nenhuma cor, fonte, espaçamento ou raio escrito à mão.** Sempre
   `var(--...)`.
4. **Importe do barrel:** `import { Button } from '../../design-system'`.
5. **Domínio testado em Vitest antes da tela.** Mudança de formato sobe
   `VERSAO_ESQUEMA` e ganha migração aditiva.

A interface e o domínio são em **pt-BR**; nomes de tipo, função e arquivo em
português. Formatação de data, hora, moeda, número e tamanho passa por
`src/formato`, nunca por `Intl` direto na tela.

Comentários neste repositório explicam **por que**, não o que. Um comentário que
parafraseia a linha abaixo dele deve ser apagado. Os blocos de comentário nos
trechos de código abaixo fazem parte da entrega: copie-os.

O portão é `npm run verificar` (lint + typecheck + testes). Há um hook de
pre-commit que roda os três — um commit só passa com tudo verde.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `src/formato/index.ts` *(modificar)* | ganha `formatarTamanho(bytes)` |
| `src/dados/esquema.ts` *(modificar)* | `Arquivo`, `Peca.anexos`, `COLECOES`, `VERSAO_ESQUEMA` 19 |
| `src/dados/migracoes.ts` *(modificar)* | migração 18 → 19, aditiva |
| `src/dominio/acervo.ts` *(criar)* | todas as decisões puras sobre arquivo |
| `src/dominio/acervo.test.ts` *(criar)* | prova do acima |
| `src/dominio/criacao.ts` *(modificar)* | uma linha: `'./rotina'` vira `'./rotina.ts'` |
| `src/servidor/acervo.ts` *(criar)* | contrato `Acervo`, `AcervoMemoria`, `AcervoBlob` |
| `src/servidor/acervo.test.ts` *(criar)* | prova do contrato com o acervo em memória |
| `src/servidor/rotas.ts` *(modificar)* | `rotaEnviarArquivo`, `rotaLerArquivo`, `rotaApagarArquivo` |
| `src/servidor/rotas.test.ts` *(modificar)* | `comSessao` ganha e-mail, e as provas das três rotas |
| `src/servidor/vercel.ts` *(modificar)* | `acervo()` ao lado de `armazem()` |
| `api/arquivo.ts` *(criar)* | os três adaptadores da Vercel |
| `src/servidor/api.test.ts` *(modificar)* | a entrada nova no mapa `METODOS` |
| `README.md` *(modificar)* | a seção de variáveis de ambiente, que ainda não existe |
| `src/dados/sincronia.ts` *(modificar)* | `enviarArquivo`, `lerArquivo`, `apagarArquivo` no cliente que já existe |
| `src/dados/BancoContexto.tsx` *(modificar)* | as cinco ações, e `importar` aceitando binário |
| `design-system/components/forms/FileDrop.tsx` *(criar)* | a zona de receber arquivo |
| `design-system/components/forms/FileDrop.prompt.md` *(criar)* | quando usar |
| `design-system/components/index.ts` *(modificar)* | o barrel |
| `DESIGN.md` *(modificar)* | registra o `FileDrop`, a borda tracejada e o token novo |
| `design-system/tokens/radius.css` *(modificar)* | `--bs-dashed` |
| `src/telas/criacao/Acervo.tsx` *(criar)* | a vista do acervo, fora da tela de 799 linhas |
| `src/telas/Criacao.tsx` *(modificar)* | a troca de vista, a faixa de anexos, `baixar` aceitando `Blob` |
| `src/dominio/zip.ts` *(criar)* | montar **e** abrir o `.zip`, à mão, sem dependência |
| `src/telas/Ajustes.tsx` *(modificar)* | exportar em zip, importar binário |
| `e2e/acervo.spec.ts` *(criar)* | a superfície, de ponta a ponta |

**Não** existe `src/dados/arquivos.ts`. O cliente do acervo entra em
`src/dados/sincronia.ts`, na classe que já guarda o token e já trata 401 — veja
a Task 13.

---

## Chunk 1: O dado e o domínio

Nenhuma tela, nenhuma rede. Ao fim deste chunk o sistema sabe o que é um
arquivo, sabe migrar um banco antigo e sabe responder toda pergunta sobre
acervo — sem ter onde guardar um byte ainda.

### Task 1: `formatarTamanho` em `src/formato`

Formatação não mora no domínio nem na tela. `1.048.576` bytes precisa virar
`1 MB` num lugar só.

**Files:**
- Modify: `src/formato/index.ts` (no fim da seção `── Números ──`)
- Test: `src/formato/formato.test.ts`

- [ ] **Step 1: Write the failing test**

Adicione ao fim de `src/formato/formato.test.ts`:

```ts
describe('o tamanho de arquivo', () => {
  it('mostra bytes crus abaixo de um quilo', () => {
    expect(formatarTamanho(0)).toBe('0 B');
    expect(formatarTamanho(999)).toBe('999 B');
  });

  it('sobe de unidade a cada mil e vinte e quatro', () => {
    expect(formatarTamanho(1024)).toBe('1 KB');
    expect(formatarTamanho(1024 * 1024)).toBe('1 MB');
    expect(formatarTamanho(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('usa uma casa decimal com vírgula, que é o separador daqui', () => {
    expect(formatarTamanho(1536)).toBe('1,5 KB');
    expect(formatarTamanho(2.5 * 1024 * 1024)).toBe('2,5 MB');
  });

  it('não inventa casa decimal em número redondo', () => {
    expect(formatarTamanho(2048)).toBe('2 KB');
  });

  it('recusa tamanho negativo, que é erro de conta e não dado', () => {
    expect(() => formatarTamanho(-1)).toThrow(TypeError);
  });
});
```

E acrescente `formatarTamanho` à lista de imports no topo do arquivo de teste.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/formato/formato.test.ts`
Expected: FAIL — `formatarTamanho is not a function` (ou erro de import).

- [ ] **Step 3: Write minimal implementation**

Em `src/formato/index.ts`, no fim da seção `── Números ──`:

```ts
const UNIDADES = ['B', 'KB', 'MB', 'GB'] as const;

const tamanhoFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/**
 * `1,5 MB` — o tamanho de um arquivo.
 *
 * Mil e vinte e quatro, e não mil: é o número que o Finder e o iOS mostram, e
 * divergir deles faria o mesmo arquivo ter dois tamanhos diferentes na mesma
 * mesa. Uma casa decimal só — a segunda não muda decisão nenhuma e só polui a
 * grade.
 */
export function formatarTamanho(bytes: number): string {
  if (bytes < 0) {
    throw new TypeError(`tamanho de arquivo não pode ser negativo, recebi ${bytes}`);
  }
  let valor = bytes;
  let unidade = 0;
  while (valor >= 1024 && unidade < UNIDADES.length - 1) {
    valor /= 1024;
    unidade += 1;
  }
  return `${tamanhoFmt.format(valor)} ${UNIDADES[unidade]}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/formato/formato.test.ts`
Expected: PASS — todos os testes do arquivo verdes.

- [ ] **Step 5: Commit**

```bash
git add src/formato/index.ts src/formato/formato.test.ts
git commit -m "formato: o tamanho de um arquivo, em mil e vinte e quatro"
```

---

### Task 2: A ficha do arquivo no esquema

**Files:**
- Modify: `src/dados/esquema.ts`
- Test: `src/dados/esquema.test.ts`

- [ ] **Step 1: Write the failing test**

Em `src/dados/esquema.test.ts`, acrescente:

```ts
describe('o acervo no esquema', () => {
  it('nasce vazio como toda coleção', () => {
    expect(bancoVazio().arquivos).toEqual([]);
  });

  it('entra em COLECOES, que é o que dá sincronização e contagem de graça', () => {
    expect(COLECOES).toContain('arquivos');
  });

  it('tem nome em português no singular e no plural', () => {
    expect(nomearColecao('arquivos', 1)).toBe('1 arquivo');
    expect(nomearColecao('arquivos', 3)).toBe('3 arquivos');
  });
});
```

Garanta que `COLECOES` e `nomearColecao` estão importados no arquivo de teste.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dados/esquema.test.ts`
Expected: FAIL — `expected undefined to deeply equal []`. A primeira asserção
(`bancoVazio().arquivos`) dispara antes da de `COLECOES`.

- [ ] **Step 3: Write minimal implementation**

Em `src/dados/esquema.ts`:

**(a)** Suba a versão:

```ts
export const VERSAO_ESQUEMA = 19;
```

**(b)** Nova seção, depois de `── Criação ──` e antes de `── Regras ──`:

```ts
/* ── Acervo ──────────────────────────────────────────────────────────────── */

/**
 * A ficha de um arquivo meu.
 *
 * **Aqui não tem byte nenhum.** O binário mora no acervo do servidor; isto é
 * só o que o sistema precisa para achar, mostrar e reabrir. Guardar o arquivo
 * dentro do banco encheria os 5 MB do `localStorage` com duas fotos, e a
 * sincronização passaria a mandar o acervo inteiro a cada toque.
 */
export interface Arquivo extends Registro {
  /** o nome que eu vejo e posso trocar */
  titulo: string;
  /**
   * O nome de origem, preservado.
   *
   * Fica ao lado do título porque é por ele que eu reconheço o arquivo na
   * pasta de Downloads — renomear aqui não pode apagar de onde ele veio.
   */
  nomeOriginal: string;
  /** o media type declarado no envio: `image/png`, `application/pdf` */
  mime: string;
  /** bytes. Guardado porque o acervo não diz o tamanho sem uma ida à rede */
  tamanho: number;
  /**
   * O endereço no acervo.
   *
   * Uma chave, e nunca uma URL: URL de acervo é credencial e envelhece, e
   * gravada aqui viajaria no arquivo exportado e no banco de sincronização.
   */
  chave: string;
  contexto: Contexto;
  descricao?: string;
  /** palavras minhas para achar depois, como na peça */
  etiquetas?: string[];
  rotuloId?: string;
  projetoId?: string;
}
```

**(c)** Na interface `Peca`, depois de `etiquetas`:

```ts
  /**
   * Os arquivos presos a esta peça.
   *
   * Guarda id, e não a ficha: a ficha muda de nome e de etiqueta sem que a
   * peça precise saber. Pode apontar para arquivo que não existe mais — um
   * banco importado, uma remoção no outro aparelho — e o domínio descarta o
   * órfão em vez de quebrar, como `projetoId` já faz.
   */
  anexos?: string[];
```

**(d)** Em `Banco`, depois de `marcacoes`:

```ts
  arquivos: Arquivo[];
```

**(e)** Em `COLECOES`, depois de `'marcacoes'`: `'arquivos',`

**(f)** Em `ROTULO_COLECAO`: `arquivos: ['arquivo', 'arquivos'],`

**(g)** Em `bancoVazio()`, depois de `marcacoes: []`: `arquivos: [],`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dados/esquema.test.ts && npm run typecheck`
Expected: estes testes PASS. O typecheck **pode** apontar outros pontos que
montam um `Banco` à mão — corrija cada um acrescentando `arquivos: []`.

- [ ] **Step 5: Não commite ainda**

`npm test` inteiro está **vermelho** agora, e é esperado. `src/dados/dados.test.ts:181`
percorre `for (let v = 0; v < VERSAO_ESQUEMA; v++)` provando que todo degrau tem
migração — com `VERSAO_ESQUEMA = 19` e sem `MIGRACOES[18]`, `migrar` lança. Como
`.githooks/pre-commit` roda `npm test`, um commit aqui seria recusado.

Confirme que o vermelho é só esse e siga direto para a Task 3:

```bash
npm test 2>&1 | grep -c "não há migração da versão 18"
```

O commit das duas mudanças sai junto, no fim da Task 3.

---

### Task 3: A migração 18 → 19

**Files:**
- Modify: `src/dados/migracoes.ts`
- Test: `src/dados/dados.test.ts`

- [ ] **Step 1: Write the failing test**

Em `src/dados/dados.test.ts`, junto das outras provas de migração:

```ts
describe('a migração 18 → 19', () => {
  it('cria o acervo vazio num banco que nunca teve arquivo', () => {
    const velho = { ...bancoVazio(), versao: 18 } as unknown as Record<string, unknown>;
    delete velho.arquivos;

    const novo = migrar(velho);

    expect(novo.versao).toBe(19);
    expect(novo.arquivos).toEqual([]);
  });

  it('não mexe na peça que já existia — anexos nasce ausente', () => {
    const velho = {
      ...bancoVazio(),
      versao: 18,
      pecas: [
        {
          id: 'p1',
          criadoEm: '2026-01-01T00:00:00.000Z',
          alteradoEm: '2026-01-01T00:00:00.000Z',
          titulo: 'Uma ideia',
          tipo: 'ideia',
          estado: 'semente',
          contexto: 'pessoal',
          corpo: '',
        },
      ],
    };

    const novo = migrar(velho);

    expect(novo.pecas[0].anexos).toBeUndefined();
    expect(novo.pecas[0].titulo).toBe('Uma ideia');
  });

  it('não descarta arquivo que já veio no banco', () => {
    const velho = {
      ...bancoVazio(),
      versao: 18,
      arquivos: [{ id: 'a1', titulo: 'Já estava aqui' }],
    };

    expect(migrar(velho).arquivos).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dados/dados.test.ts`
Expected: FAIL — `não há migração da versão 18 para a 19`.

- [ ] **Step 3: Write minimal implementation**

Em `src/dados/migracoes.ts`, dentro de `MIGRACOES`, depois da entrada `17`:

```ts
  /**
   * 18 → 19: o acervo.
   *
   * Uma coleção nova e vazia, e um campo opcional na peça sem valor de
   * partida: peça sem `anexos` é peça sem arquivo preso, que é a verdade de
   * todas as que existem hoje. Nada para reescrever.
   */
  18: (dados) => ({
    ...dados,
    arquivos: Array.isArray(dados.arquivos) ? dados.arquivos : [],
    versao: 19,
  }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dados/dados.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `npm run verificar`
Expected: **agora sim** tudo verde — o degrau 18 tem migração e o laço de
`dados.test.ts` volta a passar.

```bash
git add src/dados/esquema.ts src/dados/esquema.test.ts \
        src/dados/migracoes.ts src/dados/dados.test.ts
git commit -m "esquema 19: a ficha do arquivo, os anexos da peça, e a migração"
```

---

### Task 4: `src/dominio/acervo.ts` — o tipo derivado

O tipo (imagem, pdf, html, texto, outro) **não é campo**. É lido do `mime`,
toda vez. Campo gravado poderia discordar do arquivo real — é a mesma regra que
mantém "atrasada" e "concluída" derivadas.

**Files:**
- Create: `src/dominio/acervo.ts`
- Create: `src/dominio/acervo.test.ts`

- [ ] **Step 1: Write the failing test**

Crie `src/dominio/acervo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tipoDoArquivo, abreNoNavegador, ROTULO_TIPO_ARQUIVO, ICONE_DO_TIPO_ARQUIVO } from './acervo';

describe('o tipo do arquivo', () => {
  it('sai do mime, e não de um campo guardado', () => {
    expect(tipoDoArquivo('image/png')).toBe('imagem');
    expect(tipoDoArquivo('image/heic')).toBe('imagem');
    expect(tipoDoArquivo('application/pdf')).toBe('pdf');
    expect(tipoDoArquivo('text/html')).toBe('html');
    expect(tipoDoArquivo('text/markdown')).toBe('texto');
    expect(tipoDoArquivo('text/plain')).toBe('texto');
  });

  it('cai em "outro" quando não reconhece, em vez de quebrar', () => {
    expect(tipoDoArquivo('video/mp4')).toBe('outro');
    expect(tipoDoArquivo('')).toBe('outro');
    expect(tipoDoArquivo('inventado')).toBe('outro');
  });

  it('ignora o parâmetro e a caixa, que o navegador manda como quiser', () => {
    expect(tipoDoArquivo('TEXT/HTML; charset=UTF-8')).toBe('html');
    expect(tipoDoArquivo('  image/jpeg  ')).toBe('imagem');
  });

  it('diz o que dá para ver dentro do MSL', () => {
    expect(abreNoNavegador('image/png')).toBe(true);
    expect(abreNoNavegador('application/pdf')).toBe(true);
    expect(abreNoNavegador('text/plain')).toBe(true);
    // HTML de fora roda script. Ele baixa; não abre aqui dentro.
    expect(abreNoNavegador('text/html')).toBe(false);
    expect(abreNoNavegador('application/zip')).toBe(false);
  });

  it('tem rótulo em português e ícone para cada tipo', () => {
    for (const tipo of ['imagem', 'pdf', 'html', 'texto', 'outro'] as const) {
      expect(ROTULO_TIPO_ARQUIVO[tipo]).toBeTruthy();
      expect(ICONE_DO_TIPO_ARQUIVO[tipo]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dominio/acervo.test.ts`
Expected: FAIL — o módulo `./acervo` não existe.

- [ ] **Step 3: Write minimal implementation**

Crie `src/dominio/acervo.ts`. **Sem nenhum import ainda**: `tsconfig.json` liga
`noUnusedLocals`, e um `import type` que só será usado na Task 6 reprova o
`typecheck` com TS6133 — e o hook de pre-commit roda o typecheck. Cada task
acrescenta o import que ela mesma passa a usar.

```ts
/**
 * Acervo — os arquivos que eu guardo.
 *
 * Tudo aqui é função pura sobre a **ficha** do arquivo. Nenhum byte passa por
 * este módulo, e nenhuma linha fala com rede: quem sobe e quem baixa é a
 * costura do servidor. É o que permite provar o acervo inteiro em Vitest.
 */

/* ── O tipo, que é derivado ──────────────────────────────────────────────── */

export const TIPOS_DE_ARQUIVO = ['imagem', 'pdf', 'html', 'texto', 'outro'] as const;

export type TipoDeArquivo = (typeof TIPOS_DE_ARQUIVO)[number];

export const ROTULO_TIPO_ARQUIVO: Record<TipoDeArquivo, string> = {
  imagem: 'Imagem',
  pdf: 'PDF',
  html: 'Página',
  texto: 'Texto',
  outro: 'Arquivo',
};

/** kebab-case do Lucide, como o ícone da rotina. */
export const ICONE_DO_TIPO_ARQUIVO: Record<TipoDeArquivo, string> = {
  imagem: 'image',
  pdf: 'file-text',
  html: 'code',
  texto: 'file',
  outro: 'paperclip',
};

/**
 * De que espécie é este arquivo.
 *
 * **Derivado do `mime`, e nunca guardado.** Um campo `tipo` gravado poderia
 * discordar do arquivo real depois de uma importação ou de uma edição à mão —
 * mesmo motivo pelo qual "atrasada" e "concluída" também se calculam.
 *
 * O que não reconheço vira `outro` em vez de erro: um arquivo de tipo
 * estranho ainda é um arquivo meu, e recusar-me a listá-lo seria pior.
 */
export function tipoDoArquivo(mime: string): TipoDeArquivo {
  // O navegador manda `text/html; charset=UTF-8`, com caixa e espaço a gosto.
  const limpo = mime.split(';')[0].trim().toLowerCase();

  if (limpo.startsWith('image/')) return 'imagem';
  if (limpo === 'application/pdf') return 'pdf';
  if (limpo === 'text/html') return 'html';
  if (limpo.startsWith('text/')) return 'texto';
  return 'outro';
}

/**
 * Se dá para ver o arquivo dentro do MSL, ou se ele só baixa.
 *
 * **HTML fica de fora de propósito.** Uma página que eu guardei veio de outro
 * lugar e pode trazer script; abri-la na mesma origem do MSL daria a ela a
 * minha sessão e o meu `localStorage`. Ela baixa, e o navegador abre fora.
 */
export function abreNoNavegador(mime: string): boolean {
  const tipo = tipoDoArquivo(mime);
  return tipo === 'imagem' || tipo === 'pdf' || tipo === 'texto';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dominio/acervo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dominio/acervo.ts src/dominio/acervo.test.ts
git commit -m "acervo: o tipo sai do mime, e HTML não abre aqui dentro"
```

---

### Task 5: A chave, o teto e a validação

**Files:**
- Modify: `src/dominio/acervo.ts`
- Modify: `src/dominio/acervo.test.ts`

- [ ] **Step 1: Write the failing test**

Acrescente a `src/dominio/acervo.test.ts`:

```ts
describe('a chave no acervo', () => {
  it('começa pelo id, que é o que garante não haver colisão', () => {
    expect(chaveDe('a1-b2', 'Foto do Cliente.PNG')).toBe('a1-b2/foto-do-cliente.png');
  });

  it('tira acento e espaço, que viram mojibake e %20', () => {
    expect(chaveDe('x', 'Relatório de Março.pdf')).toBe('x/relatorio-de-marco.pdf');
  });

  it('sobrevive a arquivo sem extensão', () => {
    expect(chaveDe('x', 'LEIAME')).toBe('x/leiame');
  });

  it('sobrevive a nome que vira vazio depois da limpeza', () => {
    expect(chaveDe('x', '📎.png')).toBe('x/sem-titulo.png');
  });
});

describe('a validação do arquivo', () => {
  const bom = {
    titulo: 'Contrato',
    nomeOriginal: 'contrato.pdf',
    mime: 'application/pdf',
    tamanho: 1024,
  };

  it('aceita o que está inteiro', () => {
    expect(() => validarArquivo(bom)).not.toThrow();
  });

  it('exige título, como a peça exige', () => {
    expect(() => validarArquivo({ ...bom, titulo: '   ' })).toThrow(ArquivoInvalido);
  });

  it('recusa arquivo vazio, que é sempre engano de envio', () => {
    expect(() => validarArquivo({ ...bom, tamanho: 0 })).toThrow(ArquivoInvalido);
  });

  it('recusa o que passa do teto, antes de gastar rede', () => {
    expect(() => validarArquivo({ ...bom, tamanho: LIMITE_POR_ARQUIVO + 1 })).toThrow(
      ArquivoInvalido,
    );
  });

  it('aceita exatamente o teto', () => {
    expect(() => validarArquivo({ ...bom, tamanho: LIMITE_POR_ARQUIVO })).not.toThrow();
  });

  it('diz o tamanho na mensagem, senão o aviso não ensina nada', () => {
    expect(() => validarArquivo({ ...bom, tamanho: LIMITE_POR_ARQUIVO + 1 })).toThrow(/10 MB/);
  });

  it('exige mime, porque sem ele não há como reabrir', () => {
    expect(() => validarArquivo({ ...bom, mime: '' })).toThrow(ArquivoInvalido);
  });
});
```

Acrescente `chaveDe`, `validarArquivo`, `ArquivoInvalido` e `LIMITE_POR_ARQUIVO`
aos imports no topo do arquivo de teste.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dominio/acervo.test.ts`
Expected: FAIL — os quatro nomes não existem.

- [ ] **Step 3: Write minimal implementation**

**Primeiro, uma linha em outro arquivo.** `src/dominio/criacao.ts:2` é
`import { distanciaEmDias, diaValido } from './rotina';`, sem extensão. Hoje
isso é inofensivo — nada em `api/` alcança a Criação. A Task 9 muda isso: as
rotas passam a importar `LIMITE_POR_ARQUIVO` daqui, e daqui para `criacao.ts` e
para `rotina.ts`. O AGENTS.md diz: *"Every module reachable from `api/` imports
with the `.ts` extension"*, e sem ela a função morre com
`FUNCTION_INVOCATION_FAILED` — que é exatamente o defeito que `src/servidor/api.test.ts`
existe para pegar.

```ts
// src/dominio/criacao.ts, linha 2
import { distanciaEmDias, diaValido } from './rotina.ts';
```

`import type` não precisa de extensão — ele some na compilação — mas as linhas
de valor precisam. Agora, em `src/dominio/acervo.ts`, os imports desta task:

```ts
import type { Arquivo } from '../dados/esquema.ts';
import { nomeDeArquivo } from './criacao.ts';
import { formatarTamanho } from '../formato/index.ts';
```

`'../formato/index.ts'` e não `'../formato'`: o Node recusa import de diretório,
e esse é o segundo jeito de matar a função sem aviso.

```ts
/* ── A chave ─────────────────────────────────────────────────────────────── */

/**
 * O endereço deste arquivo no acervo.
 *
 * Começa pelo id porque dois "print.png" vão existir, e o segundo não pode
 * sobrescrever o primeiro. O nome legível vem depois, e não é enfeite: uma
 * chave só de id transforma o painel do acervo num depósito ilegível no dia em
 * que eu precisar olhar para ele de fora do MSL.
 *
 * A limpeza reaproveita `nomeDeArquivo`, que a Criação já usa para batizar o
 * que ela baixa — duas regras de slug divergiriam na primeira correção.
 */
export function chaveDe(id: string, nomeOriginal: string): string {
  const ponto = nomeOriginal.lastIndexOf('.');
  const temExtensao = ponto > 0 && ponto < nomeOriginal.length - 1;
  const base = temExtensao ? nomeOriginal.slice(0, ponto) : nomeOriginal;
  const extensao = temExtensao ? nomeOriginal.slice(ponto + 1).toLowerCase() : '';

  const limpo = extensao
    ? nomeDeArquivo(base, extensao.replace(/[^a-z0-9]/g, ''))
    : nomeDeArquivo(base, 'bin').replace(/\.bin$/, '');

  return `${id}/${limpo}`;
}

/* ── O teto ──────────────────────────────────────────────────────────────── */

/**
 * O maior arquivo que o acervo aceita, em bytes.
 *
 * Dez megabytes cabe foto de celular, print, PDF de contrato e página salva, e
 * não cabe vídeo. É de propósito: vídeo exigiria envio em pedaços ou direto
 * para o acervo, o que é outro trabalho, e um teto que aceita 200 MB numa
 * função da Vercel falha na rede em vez de falhar aqui, com aviso.
 */
export const LIMITE_POR_ARQUIVO = 10 * 1024 * 1024;

/* ── Validação ───────────────────────────────────────────────────────────── */

export class ArquivoInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ArquivoInvalido';
  }
}

/**
 * Recusa antes de subir.
 *
 * O teto é conferido aqui e **de novo no servidor**: esta checagem existe para
 * não gastar a rede de um envio condenado, não para proteger nada. Quem
 * protege é a rota, que não confia no que o aparelho diz.
 */
export function validarArquivo(
  arquivo: Pick<Arquivo, 'titulo' | 'nomeOriginal' | 'mime' | 'tamanho'>,
): void {
  if (arquivo.titulo.trim() === '') throw new ArquivoInvalido('o arquivo precisa de um título');
  if (arquivo.nomeOriginal.trim() === '') {
    throw new ArquivoInvalido('o arquivo precisa de um nome de origem');
  }
  if (arquivo.mime.trim() === '') {
    throw new ArquivoInvalido('não deu para reconhecer o tipo do arquivo');
  }
  if (!Number.isInteger(arquivo.tamanho) || arquivo.tamanho <= 0) {
    throw new ArquivoInvalido('o arquivo está vazio');
  }
  if (arquivo.tamanho > LIMITE_POR_ARQUIVO) {
    throw new ArquivoInvalido(
      `o acervo aceita até 10 MB por arquivo, e este tem ${formatarTamanho(arquivo.tamanho)}`,
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dominio/acervo.test.ts src/servidor/api.test.ts && npm run typecheck`
Expected: PASS. `api.test.ts` entra aqui de propósito: ele carrega cada função
de `api/` em Node puro, e é quem acusa uma extensão faltando.

Se `chaveDe('x', '📎.png')` não devolver `x/sem-titulo.png`, confira
`nomeDeArquivo` em `src/dominio/criacao.ts:257` — o `|| 'sem-titulo'` dele é
quem garante esse caso, e a correção é no chamador, não lá.

- [ ] **Step 5: Commit**

```bash
git add src/dominio/acervo.ts src/dominio/acervo.test.ts
git commit -m "acervo: a chave, o teto de 10 MB e a recusa antes da rede"
```

---

### Task 6: Filtro, resumo e anexos

**Files:**
- Modify: `src/dominio/acervo.ts`
- Modify: `src/dominio/acervo.test.ts`

- [ ] **Step 1: Write the failing test**

Acrescente a `src/dominio/acervo.test.ts`:

```ts
const arquivo = (dados: Partial<Arquivo> = {}): Arquivo => ({
  id: 'a1',
  criadoEm: '2026-01-01T00:00:00.000Z',
  alteradoEm: '2026-01-01T00:00:00.000Z',
  titulo: 'Um arquivo',
  nomeOriginal: 'um-arquivo.png',
  mime: 'image/png',
  tamanho: 1024,
  chave: 'a1/um-arquivo.png',
  contexto: 'profissional',
  ...dados,
});

describe('o filtro do acervo', () => {
  const lista = [
    arquivo({ id: 'a1', titulo: 'Depoimento da Kate', etiquetas: ['comercial'] }),
    arquivo({ id: 'a2', titulo: 'Contrato', mime: 'application/pdf', contexto: 'pessoal' }),
    arquivo({ id: 'a3', titulo: 'Print do funil', descricao: 'o gargalo na qualificação' }),
  ];

  it('sem filtro, devolve tudo', () => {
    expect(filtrarArquivos(lista, {})).toHaveLength(3);
  });

  it('filtra pelo tipo derivado, e não por campo guardado', () => {
    expect(filtrarArquivos(lista, { tipo: 'pdf' }).map((a) => a.id)).toEqual(['a2']);
    expect(filtrarArquivos(lista, { tipo: 'imagem' }).map((a) => a.id)).toEqual(['a1', 'a3']);
  });

  it('filtra pelo contexto', () => {
    expect(filtrarArquivos(lista, { contexto: 'pessoal' }).map((a) => a.id)).toEqual(['a2']);
  });

  it('procura na descrição também: é onde mora o que eu lembro', () => {
    expect(filtrarArquivos(lista, { busca: 'gargalo' }).map((a) => a.id)).toEqual(['a3']);
  });

  it('procura no nome de origem, que às vezes é tudo que eu lembro', () => {
    expect(filtrarArquivos(lista, { busca: 'um-arquivo.png' })).toHaveLength(3);
  });

  it('procura na etiqueta e ignora a caixa', () => {
    expect(filtrarArquivos(lista, { busca: 'COMERCIAL' }).map((a) => a.id)).toEqual(['a1']);
  });

  it('combina os filtros em vez de escolher um', () => {
    expect(filtrarArquivos(lista, { tipo: 'imagem', busca: 'kate' }).map((a) => a.id)).toEqual([
      'a1',
    ]);
  });
});

describe('o resumo do acervo', () => {
  it('conta e soma, por tipo', () => {
    const resumo = resumirAcervo([
      arquivo({ id: 'a1', tamanho: 1000 }),
      arquivo({ id: 'a2', tamanho: 2000, mime: 'application/pdf' }),
      arquivo({ id: 'a3', tamanho: 3000 }),
    ]);

    expect(resumo.quantos).toBe(3);
    expect(resumo.ocupado).toBe(6000);
    expect(resumo.porTipo.imagem).toBe(2);
    expect(resumo.porTipo.pdf).toBe(1);
    expect(resumo.porTipo.outro).toBe(0);
  });

  it('acervo vazio não é erro', () => {
    const resumo = resumirAcervo([]);
    expect(resumo.quantos).toBe(0);
    expect(resumo.ocupado).toBe(0);
  });
});

describe('os anexos de uma peça', () => {
  const banco = (): Banco => ({
    ...bancoVazio(),
    arquivos: [arquivo({ id: 'a1' }), arquivo({ id: 'a2' })],
  });

  it('resolve os ids em fichas, na ordem em que a peça os lista', () => {
    const pecaComAnexo = { anexos: ['a2', 'a1'] } as Peca;
    expect(anexosDe(banco(), pecaComAnexo).map((a) => a.id)).toEqual(['a2', 'a1']);
  });

  it('descarta o órfão em vez de quebrar', () => {
    const pecaComAnexo = { anexos: ['a1', 'sumiu'] } as Peca;
    expect(anexosDe(banco(), pecaComAnexo).map((a) => a.id)).toEqual(['a1']);
  });

  it('peça sem anexos devolve lista vazia, e não undefined', () => {
    expect(anexosDe(banco(), {} as Peca)).toEqual([]);
  });
});

describe('as peças que usam um arquivo', () => {
  it('diz quem vai ficar sem ele antes de eu apagar', () => {
    const b: Banco = {
      ...bancoVazio(),
      arquivos: [arquivo({ id: 'a1' })],
      pecas: [
        { id: 'p1', titulo: 'Usa', anexos: ['a1'] } as Peca,
        { id: 'p2', titulo: 'Não usa' } as Peca,
      ],
    };
    expect(pecasQueUsam(b, 'a1').map((p) => p.id)).toEqual(['p1']);
  });
});
```

Acrescente aos imports do teste: `filtrarArquivos`, `resumirAcervo`, `anexosDe`,
`pecasQueUsam`, e `bancoVazio`, `type Arquivo`, `type Banco`, `type Peca` de
`../dados/esquema`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dominio/acervo.test.ts`
Expected: FAIL — as quatro funções não existem.

- [ ] **Step 3: Write minimal implementation**

Em `src/dominio/acervo.ts`, a linha de tipos passa a ser:

```ts
import type { Arquivo, Banco, Contexto, Peca } from '../dados/esquema.ts';
```

E as seções:

```ts
/* ── Filtro ──────────────────────────────────────────────────────────────── */

export interface FiltroDoAcervo {
  tipo?: TipoDeArquivo;
  contexto?: Contexto;
  /** procura no título, no nome de origem, na descrição e nas etiquetas */
  busca?: string;
}

export function filtrarArquivos(
  arquivos: readonly Arquivo[],
  filtro: FiltroDoAcervo,
): Arquivo[] {
  const termo = filtro.busca?.trim().toLowerCase() ?? '';

  return arquivos.filter((a) => {
    if (filtro.tipo && tipoDoArquivo(a.mime) !== filtro.tipo) return false;
    if (filtro.contexto && a.contexto !== filtro.contexto) return false;
    if (termo === '') return true;

    // O nome de origem entra na busca porque às vezes é a única coisa que eu
    // lembro: eu batizei o arquivo de "Print do funil", mas procuro por
    // "Captura de Tela 2026-09-21".
    const onde = [a.titulo, a.nomeOriginal, a.descricao ?? '', ...(a.etiquetas ?? [])]
      .join(' ')
      .toLowerCase();
    return onde.includes(termo);
  });
}

/* ── Resumo ──────────────────────────────────────────────────────────────── */

export interface ResumoDoAcervo {
  quantos: number;
  /** bytes somados; a tela formata com `formatarTamanho` */
  ocupado: number;
  porTipo: Record<TipoDeArquivo, number>;
}

export function resumirAcervo(arquivos: readonly Arquivo[]): ResumoDoAcervo {
  // Todos os tipos começam em zero, inclusive os que não aparecem: um
  // `porTipo.pdf` ausente obrigaria toda chamada a tratar `undefined`.
  const porTipo = Object.fromEntries(TIPOS_DE_ARQUIVO.map((t) => [t, 0])) as Record<
    TipoDeArquivo,
    number
  >;

  let ocupado = 0;
  for (const a of arquivos) {
    porTipo[tipoDoArquivo(a.mime)] += 1;
    ocupado += a.tamanho;
  }

  return { quantos: arquivos.length, ocupado, porTipo };
}

/* ── A ligação com a peça ────────────────────────────────────────────────── */

/**
 * As fichas dos anexos de uma peça, na ordem em que ela os lista.
 *
 * O id que não acha ficha **some da lista**, sem erro. Um banco importado, uma
 * remoção feita no outro aparelho e uma junção no meio do caminho produzem
 * órfão no uso normal do sistema — quebrar a tela por causa disso seria trocar
 * um anexo faltando por uma Criação que não abre.
 */
export function anexosDe(banco: Banco, peca: Pick<Peca, 'anexos'>): Arquivo[] {
  const porId = new Map(banco.arquivos.map((a) => [a.id, a]));
  return (peca.anexos ?? [])
    .map((id) => porId.get(id))
    .filter((a): a is Arquivo => a !== undefined);
}

/**
 * Quem fica sem este arquivo se eu apagá-lo.
 *
 * Existe para a confirmação poder dizer o número em vez de perguntar "tem
 * certeza?" no vazio. Apagar continua permitido: o anexo órfão é tratado.
 */
export function pecasQueUsam(banco: Banco, arquivoId: string): Peca[] {
  return banco.pecas.filter((p) => (p.anexos ?? []).includes(arquivoId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dominio/acervo.test.ts`
Expected: PASS.

- [ ] **Step 5: Fechar o chunk e commitar**

Run: `npm run verificar`
Expected: lint, typecheck e os 937+ testes verdes.

```bash
git add src/dominio/acervo.ts src/dominio/acervo.test.ts
git commit -m "acervo: filtrar, resumir, e resolver os anexos sem quebrar no órfão"
```

**Fim do Chunk 1.** O sistema sabe o que é um arquivo e responde tudo sobre
ele. Ainda não existe lugar para guardar um byte.

---

## Chunk 2: O servidor

Um contrato estreito, uma implementação em memória para o teste e uma de
verdade para produção — a mesma forma do `Armazem` em
`src/servidor/armazem.ts:11`. Ao fim deste chunk os bytes têm onde morar.

### Task 7: O contrato `Acervo` e a implementação em memória

**Files:**
- Create: `src/servidor/acervo.ts`
- Create: `src/servidor/acervo.test.ts`

- [ ] **Step 1: Write the failing test**

Crie `src/servidor/acervo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AcervoMemoria } from './acervo';

const bytes = (texto: string): ArrayBuffer => new TextEncoder().encode(texto).buffer;
const texto = (b: ArrayBuffer): string => new TextDecoder().decode(b);

describe('o acervo em memória', () => {
  it('devolve o que guardou, com o mime intacto', async () => {
    const acervo = new AcervoMemoria();
    await acervo.guardar('a1/foto.png', bytes('conteúdo'), 'image/png');

    const lido = await acervo.ler('a1/foto.png');

    expect(lido).not.toBeNull();
    expect(texto(lido!.bytes)).toBe('conteúdo');
    expect(lido!.mime).toBe('image/png');
  });

  it('devolve null para chave que nunca existiu, em vez de erro', async () => {
    expect(await new AcervoMemoria().ler('nao/existe')).toBeNull();
  });

  it('apaga', async () => {
    const acervo = new AcervoMemoria();
    await acervo.guardar('a1/foto.png', bytes('x'), 'image/png');
    await acervo.apagar('a1/foto.png');

    expect(await acervo.ler('a1/foto.png')).toBeNull();
  });

  it('apagar o que não existe é silêncio, e não erro', async () => {
    await expect(new AcervoMemoria().apagar('nao/existe')).resolves.toBeUndefined();
  });

  it('guardar na mesma chave substitui', async () => {
    const acervo = new AcervoMemoria();
    await acervo.guardar('a1/x', bytes('velho'), 'text/plain');
    await acervo.guardar('a1/x', bytes('novo'), 'text/plain');

    expect(texto((await acervo.ler('a1/x'))!.bytes)).toBe('novo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/servidor/acervo.test.ts`
Expected: FAIL — o módulo não existe.

- [ ] **Step 3: Write minimal implementation**

Crie `src/servidor/acervo.ts`:

```ts
/**
 * O acervo do servidor — onde os bytes moram.
 *
 * A mesma costura do `Armazem`: uma interface estreita, uma implementação em
 * memória para teste e uma de verdade para produção. As rotas falam com esta
 * interface e nunca com a Vercel — é o que permite provar o envio, a leitura e
 * a remoção em Vitest, sem rede e sem conta.
 *
 * É também o que torna a escolha do serviço reversível: trocar o Blob por R2
 * ou S3 mexe numa classe e em nenhum teste.
 */
export interface Acervo {
  guardar(chave: string, bytes: ArrayBuffer, mime: string): Promise<void>;
  /** `null` quando a chave não existe — some do acervo não é erro de servidor */
  ler(chave: string): Promise<{ bytes: ArrayBuffer; mime: string } | null>;
  apagar(chave: string): Promise<void>;
}

/* ── Em memória, para os testes ──────────────────────────────────────────── */

export class AcervoMemoria implements Acervo {
  private dados = new Map<string, { bytes: ArrayBuffer; mime: string }>();

  async guardar(chave: string, bytes: ArrayBuffer, mime: string) {
    this.dados.set(chave, { bytes, mime });
  }

  async ler(chave: string) {
    return this.dados.get(chave) ?? null;
  }

  async apagar(chave: string) {
    this.dados.delete(chave);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/servidor/acervo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/servidor/acervo.ts src/servidor/acervo.test.ts
git commit -m "acervo do servidor: o contrato estreito, e o de memória que o prova"
```

---

### Task 8: `AcervoBlob` — o Vercel Blob por HTTP, sem SDK

O `ArmazemRedis` declara "sem SDK de propósito". O acervo segue a mesma regra,
**com uma ressalva que precisa ficar escrita**: o REST do Upstash é contrato
público e documentado; o do Vercel Blob não é — o contrato público deles é o
SDK. Segue sem SDK porque `Acervo` é uma interface: se a superfície mudar,
trocar por `@vercel/blob` mexe nesta classe e em nenhum teste.

**Files:**
- Modify: `src/servidor/acervo.ts`
- Modify: `src/servidor/acervo.test.ts`

- [ ] **Step 1: Write the failing test**

Só o que dá para provar sem rede: a leitura do ambiente e a mensagem de
configuração faltando. O caminho HTTP é exercitado pelas rotas, contra
`AcervoMemoria`.

```ts
describe('o acervo do Blob', () => {
  it('sai do ambiente', () => {
    expect(() => AcervoBlob.doAmbiente({ BLOB_READ_WRITE_TOKEN: 'segredo' })).not.toThrow();
  });

  it('diz qual variável falta, e nunca o valor dela', () => {
    expect(() => AcervoBlob.doAmbiente({})).toThrow(/BLOB_READ_WRITE_TOKEN/);
    expect(() => AcervoBlob.doAmbiente({})).not.toThrow(/segredo/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/servidor/acervo.test.ts`
Expected: FAIL — `AcervoBlob` não existe.

- [ ] **Step 3: Write minimal implementation**

Em `src/servidor/acervo.ts`:

```ts
/* ── No Vercel Blob ──────────────────────────────────────────────────────── */

const BLOB = 'https://blob.vercel-storage.com';

/**
 * A versão da API que este código entende.
 *
 * Fixada de propósito. O REST do Blob **não é contrato público** — o contrato
 * público da Vercel é o SDK — e um cabeçalho de versão fixo é o que transforma
 * uma mudança lá numa falha clara aqui, em vez de num comportamento diferente
 * e silencioso.
 */
const VERSAO_API = '7';
// ↑ **Confirme este número antes de publicar.** Ele foi lido de uma versão do
// SDK, e um número que o serviço já aposentou é a própria falha que a fixação
// deveria evitar — só que no primeiro dia. Rode
// `npm view @vercel/blob dist-tags.latest` e confira que versão o SDK dessa
// release manda, e escreva aqui de onde saiu o número.

export class AcervoBlob implements Acervo {
  private token: string;

  /** Campo à mão, e não propriedade de parâmetro, pelo mesmo motivo do Redis:
   *  o Node puro se recusa a carregar o arquivo em modo de remoção de tipos. */
  constructor(token: string) {
    this.token = token;
  }

  static doAmbiente(ambiente: Record<string, string | undefined>): AcervoBlob {
    const token = ambiente.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error(
        'faltam as variáveis do acervo: esperava BLOB_READ_WRITE_TOKEN. ' +
          'Crie um Blob store na aba Storage e ligue-o ao projeto.',
      );
    }
    return new AcervoBlob(token);
  }

  private cabecalhos(extras: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'x-api-version': VERSAO_API,
      ...extras,
    };
  }

  async guardar(chave: string, bytes: ArrayBuffer, mime: string) {
    const resposta = await fetch(`${BLOB}/${encodeURI(chave)}`, {
      method: 'PUT',
      headers: this.cabecalhos({
        'Content-Type': mime,
        // Sem isto o Blob acrescenta um sufixo aleatório ao nome, e a chave
        // que eu gravei na ficha deixa de achar o arquivo.
        'x-add-random-suffix': '0',
        'x-content-type': mime,
      }),
      body: bytes,
    });
    if (!resposta.ok) {
      throw new Error(`o acervo respondeu ${resposta.status} ao guardar`);
    }
  }

  async ler(chave: string) {
    const url = await this.enderecoDe(chave);
    if (url === null) return null;

    const resposta = await fetch(url);
    if (resposta.status === 404) return null;
    if (!resposta.ok) throw new Error(`o acervo respondeu ${resposta.status} ao ler`);

    return {
      bytes: await resposta.arrayBuffer(),
      mime: resposta.headers.get('Content-Type') ?? 'application/octet-stream',
    };
  }

  async apagar(chave: string) {
    const url = await this.enderecoDe(chave);
    if (url === null) return;

    const resposta = await fetch(`${BLOB}/delete`, {
      method: 'POST',
      headers: this.cabecalhos({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ urls: [url] }),
    });
    // Tolerante ao 404 porque o fim desta chamada é o arquivo não existir
    // mais — não porque o Blob responda 404 aqui (ele é idempotente).
    if (!resposta.ok && resposta.status !== 404) {
      throw new Error(`o acervo respondeu ${resposta.status} ao apagar`);
    }
  }

  /**
   * A URL de verdade de uma chave, ou `null` se ela não existe.
   *
   * Um salto a mais em toda leitura, e ele é o preço de não gravar URL na
   * ficha. A URL do Blob carrega um id de store que pode mudar quando o store
   * muda; a chave, não.
   */
  private async enderecoDe(chave: string): Promise<string | null> {
    // Sem `limit=1`: com ele, um vizinho que compartilha o prefixo pode ser o
    // único resultado, e o `find` devolveria `undefined` para um arquivo que
    // existe — um 404 falso. O limite não economiza nada aqui.
    const resposta = await fetch(`${BLOB}?prefix=${encodeURIComponent(chave)}`, {
      headers: this.cabecalhos(),
    });
    if (!resposta.ok) throw new Error(`o acervo respondeu ${resposta.status} ao procurar`);

    const { blobs } = (await resposta.json()) as { blobs: { pathname: string; url: string }[] };
    return blobs.find((b) => b.pathname === chave)?.url ?? null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/servidor/acervo.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/servidor/acervo.ts src/servidor/acervo.test.ts
git commit -m "acervo: o Vercel Blob por HTTP, com a versão da API fixada"
```

---

### Task 9: As três rotas

**Atenção à segurança, e este é o ponto mais importante do chunk:** a `chave`
chega do aparelho. Duas contas no mesmo servidor não podem ler o arquivo uma da
outra, e nenhuma pode subir por caminho para fora do próprio espaço. A rota
**prefixa a chave com o id do dono** e recusa `..` — o aparelho nunca vê o
prefixo e nunca pode escolhê-lo.

**Files:**
- Modify: `src/servidor/rotas.ts`
- Test: `src/servidor/rotas.test.ts` (ou o arquivo de teste de rotas existente)

- [ ] **Step 1: Abrir o helper de sessão para duas contas**

`src/servidor/rotas.test.ts` já tem um `comSessao()` (linha 29), mas ele é preso
a um e-mail só, e `AMBIENTE` (linha 6) só permite esse:

```ts
const AMBIENTE = { EMAILS_PERMITIDOS: 'dono@exemplo.com' };
```

A prova de isolamento entre contas precisa de duas. `cadastrar` recusa e-mail
fora da lista com 403 e sem token no corpo — e aí o teste de isolamento passaria
por 401, pelo motivo errado, parecendo verde. Abra os dois:

```ts
const AMBIENTE = { EMAILS_PERMITIDOS: 'dono@exemplo.com, outro@exemplo.com' };

async function comSessao(email = 'dono@exemplo.com') {
  const armazem = new ArmazemMemoria();
  const resposta = await rotaCadastro(
    post({ email, senha: SENHA, aparelho: 'Mac' }),
    armazem,
    AMBIENTE,
  );
  const { token, usuario } = (await resposta.json()) as {
    token: string;
    usuario: { id: string };
  };
  return { armazem, token, usuario };
}
```

Confira o formato que `EMAILS_PERMITIDOS` aceita em `src/servidor/contas.ts`
(separador e espaço) antes de escrever a lista.

Run: `npx vitest run src/servidor/rotas.test.ts`
Expected: PASS — os testes que já existiam continuam verdes com o parâmetro
tendo valor padrão.

- [ ] **Step 2: Write the failing test**

```ts
describe('as rotas do acervo', () => {

  const enviar = (token: string, chave: string, corpo: BodyInit, mime = 'image/png') =>
    new Request('https://msl/api/arquivo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mime,
        'x-chave': chave,
      },
      body: corpo,
    });

  it('recusa sem sessão, antes de tocar no acervo', async () => {
    const { acervo } = await comSessao();
    const r = await rotaEnviarArquivo(
      enviar('token-falso', 'a1/x.png', new Uint8Array([1])),
      new ArmazemMemoria(),
      acervo,
    );
    expect(r.status).toBe(401);
  });

  it('guarda e devolve a chave', async () => {
    const { armazem, acervo, token } = await comSessao();
    const r = await rotaEnviarArquivo(
      enviar(token, 'a1/foto.png', new Uint8Array([1, 2, 3])),
      armazem,
      acervo,
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ chave: 'a1/foto.png' });
  });

  it('devolve o que guardou, com o mime certo', async () => {
    const { armazem, acervo, token } = await comSessao();
    await rotaEnviarArquivo(enviar(token, 'a1/foto.png', new Uint8Array([1, 2, 3])), armazem, acervo);

    const r = await rotaLerArquivo(
      new Request('https://msl/api/arquivo?chave=a1/foto.png', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      armazem,
      acervo,
    );

    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('uma conta não lê o arquivo da outra, mesmo sabendo a chave', async () => {
    // As duas contas precisam do MESMO armazém, senão o teste passa porque a
    // sessão de B nem existe para A — e não porque o prefixo separou nada.
    const { armazem, token: tokenA } = await comSessao('dono@exemplo.com');
    const acervo = new AcervoMemoria();

    const segundo = await rotaCadastro(
      post({ email: 'outro@exemplo.com', senha: SENHA, aparelho: 'Mac' }),
      armazem,
      AMBIENTE,
    );
    const { token: tokenB } = (await segundo.json()) as { token: string };
    expect(tokenB, 'o segundo cadastro precisa ter dado token').toBeTruthy();

    await rotaEnviarArquivo(enviar(tokenA, 'a1/segredo.png', new Uint8Array([9])), armazem, acervo);

    const r = await rotaLerArquivo(
      new Request('https://msl/api/arquivo?chave=a1/segredo.png', {
        headers: { Authorization: `Bearer ${tokenB}` },
      }),
      armazem,
      acervo,
    );

    expect(r.status).toBe(404);
  });

  it('HTML guardado baixa, e nunca roda na minha origem', async () => {
    const { armazem, token } = await comSessao();
    const acervo = new AcervoMemoria();
    await rotaEnviarArquivo(
      enviar(token, 'a1/pagina.html', new TextEncoder().encode('<script>x()</script>'), 'text/html'),
      armazem,
      acervo,
    );

    const r = await rotaLerArquivo(
      new Request('https://msl/api/arquivo?chave=a1/pagina.html', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      armazem,
      acervo,
    );

    expect(r.headers.get('Content-Disposition')).toContain('attachment');
  });

  it('imagem continua abrindo no lugar', async () => {
    const { armazem, token } = await comSessao();
    const acervo = new AcervoMemoria();
    await rotaEnviarArquivo(enviar(token, 'a1/f.png', new Uint8Array([1])), armazem, acervo);

    const r = await rotaLerArquivo(
      new Request('https://msl/api/arquivo?chave=a1/f.png', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      armazem,
      acervo,
    );

    expect(r.headers.get('Content-Disposition')).toContain('inline');
  });

  it('recusa chave que sobe de diretório', async () => {
    const { armazem, acervo, token } = await comSessao();
    const r = await rotaEnviarArquivo(
      enviar(token, '../outra-conta/x.png', new Uint8Array([1])),
      armazem,
      acervo,
    );
    expect(r.status).toBe(400);
  });

  it('recusa o que passa do teto, sem confiar no que o aparelho disse', async () => {
    const { armazem, acervo, token } = await comSessao();
    const grande = new Uint8Array(LIMITE_POR_ARQUIVO + 1);
    const r = await rotaEnviarArquivo(enviar(token, 'a1/grande.png', grande), armazem, acervo);
    expect(r.status).toBe(413);
  });

  it('recusa corpo vazio', async () => {
    const { armazem, acervo, token } = await comSessao();
    const r = await rotaEnviarArquivo(enviar(token, 'a1/x.png', new Uint8Array(0)), armazem, acervo);
    expect(r.status).toBe(400);
  });

  it('404 para chave que não existe, e não 500', async () => {
    const { armazem, acervo, token } = await comSessao();
    const r = await rotaLerArquivo(
      new Request('https://msl/api/arquivo?chave=nao/existe', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      armazem,
      acervo,
    );
    expect(r.status).toBe(404);
  });

  it('apaga', async () => {
    const { armazem, acervo, token } = await comSessao();
    await rotaEnviarArquivo(enviar(token, 'a1/x.png', new Uint8Array([1])), armazem, acervo);

    const apagou = await rotaApagarArquivo(
      new Request('https://msl/api/arquivo?chave=a1/x.png', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
      armazem,
      acervo,
    );
    expect(apagou.status).toBe(200);

    const depois = await rotaLerArquivo(
      new Request('https://msl/api/arquivo?chave=a1/x.png', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      armazem,
      acervo,
    );
    expect(depois.status).toBe(404);
  });
});
```

`ArmazemMemoria`, `post`, `SENHA` e `rotaCadastro` já estão importados no
arquivo. Acrescente `AcervoMemoria`, `LIMITE_POR_ARQUIVO` e as três rotas.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/servidor/rotas.test.ts`
Expected: FAIL — as três rotas não existem.

- [ ] **Step 4: Write minimal implementation**

Em `src/servidor/rotas.ts`, acrescente os imports e a seção:

```ts
import type { Acervo } from './acervo.ts';
import { LIMITE_POR_ARQUIVO, abreNoNavegador } from '../dominio/acervo.ts';
```

```ts
/* ── Acervo ──────────────────────────────────────────────────────────────── */

/**
 * A chave real no acervo: a do aparelho, prefixada pelo dono.
 *
 * **O aparelho nunca escolhe o prefixo e nunca o vê.** Sem isso, duas contas
 * no mesmo acervo leriam o arquivo uma da outra com um palpite de chave — e
 * um id de arquivo não é segredo: ele viaja no banco, no backup e na
 * sincronização.
 *
 * `null` quando a chave tenta sair do próprio espaço. Barra dupla e `..` são
 * as duas formas de fazer isso; barra no começo é a terceira.
 */
function chaveNoAcervo(usuarioId: string, chave: string): string | null {
  if (chave === '' || chave.includes('..') || chave.includes('//') || chave.startsWith('/')) {
    return null;
  }
  return `${usuarioId}/${chave}`;
}

const chaveDoPedido = (pedido: Request): string =>
  new URL(pedido.url).searchParams.get('chave') ?? '';

export async function rotaEnviarArquivo(
  pedido: Request,
  armazem: Armazem,
  acervo: Acervo,
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return falhar(sessao.falha);

  // A chave vai no cabeçalho, e não no endereço: o corpo já são os bytes, e
  // endereço vai parar em registro de servidor.
  const pedida = pedido.headers.get('x-chave') ?? '';
  const chave = chaveNoAcervo(sessao.valor.usuarioId, pedida);
  if (chave === null) return json({ erro: 'chave-invalida', mensagem: 'Chave inválida.' }, 400);

  const bytes = await pedido.arrayBuffer();
  if (bytes.byteLength === 0) {
    return json({ erro: 'vazio', mensagem: 'O arquivo chegou vazio.' }, 400);
  }
  // Conferido de novo aqui: o domínio já recusou antes de gastar rede, mas
  // quem protege o acervo é a rota, que não acredita no que o aparelho diz.
  if (bytes.byteLength > LIMITE_POR_ARQUIVO) {
    return json({ erro: 'grande', mensagem: 'O acervo aceita até 10 MB por arquivo.' }, 413);
  }

  const mime = pedido.headers.get('Content-Type') ?? 'application/octet-stream';
  await acervo.guardar(chave, bytes, mime);

  return json({ chave: pedida, tamanho: bytes.byteLength, mime });
}

export async function rotaLerArquivo(
  pedido: Request,
  armazem: Armazem,
  acervo: Acervo,
): Promise<Response> {
  if (pedido.method !== 'GET') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return falhar(sessao.falha);

  const chave = chaveNoAcervo(sessao.valor.usuarioId, chaveDoPedido(pedido));
  if (chave === null) return json({ erro: 'chave-invalida', mensagem: 'Chave inválida.' }, 400);

  const achado = await acervo.ler(chave);
  // O arquivo de outra conta cai aqui como "não existe", e é o certo: um 403
  // confirmaria que a chave existe em algum lugar.
  if (achado === null) return json({ erro: 'nao-achei', mensagem: 'Arquivo não encontrado.' }, 404);

  return new Response(achado.bytes, {
    headers: {
      'Content-Type': achado.mime,
      // Uma hora, e não um ano. `immutable` por um ano seria verdade se a
      // chave nunca fosse reescrita — mas `guardar` na mesma chave substitui
      // (provado na Task 7), e o aparelho ficaria doze meses com o byte velho.
      // `private` para nenhum intermediário guardar cópia do que é meu.
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      // **A cerca de verdade contra o HTML guardado.**
      //
      // `nosniff` sozinho não resolve nada aqui: ele impede que um tipo seja
      // *adivinhado* como HTML, e não faz nada com uma resposta honestamente
      // rotulada `text/html`. E `inline` é o padrão — ele pede para o
      // navegador renderizar, que é o oposto do que eu quero.
      //
      // Sem `attachment`, uma página que eu guardei roda com a minha sessão e
      // o meu `localStorage`, porque vem da minha própria origem. O
      // `abreNoNavegador` do domínio decidia isso só do lado do cliente — uma
      // convenção, não uma cerca. A cerca é esta linha.
      'Content-Disposition': abreNoNavegador(achado.mime) ? 'inline' : 'attachment',
    },
  });
}

export async function rotaApagarArquivo(
  pedido: Request,
  armazem: Armazem,
  acervo: Acervo,
): Promise<Response> {
  if (pedido.method !== 'DELETE') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return falhar(sessao.falha);

  const chave = chaveNoAcervo(sessao.valor.usuarioId, chaveDoPedido(pedido));
  if (chave === null) return json({ erro: 'chave-invalida', mensagem: 'Chave inválida.' }, 400);

  await acervo.apagar(chave);
  return json({ apagado: true });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/servidor/rotas.test.ts`
Expected: PASS, inclusive a prova de que uma conta não lê o arquivo da outra e a
de que o HTML baixa em vez de rodar.

- [ ] **Step 6: Commit**

```bash
git add src/servidor/rotas.ts src/servidor/rotas.test.ts
git commit -m "acervo: as três rotas, com a chave presa ao dono e o HTML baixando"
```

---

### Task 10: Os adaptadores da Vercel

**Files:**
- Modify: `src/servidor/vercel.ts`
- Create: `api/arquivo.ts`

- [ ] **Step 1: Ligar o acervo ao ambiente**

Em `src/servidor/vercel.ts`:

```ts
import { AcervoBlob } from './acervo.ts';

/** O acervo de produção, montado a partir do ambiente. */
export const acervo = () => AcervoBlob.doAmbiente(process.env);
```

E em `proteger`, acrescente o acervo à lista de erros de configuração que saem
inteiros — a mensagem nomeia variável, nunca valor:

```ts
      const deConfiguracao =
        mensagem.startsWith('faltam as variáveis do Redis') ||
        mensagem.startsWith('faltam as variáveis do acervo');
```

- [ ] **Step 2: Criar o adaptador**

Crie `api/arquivo.ts`:

```ts
import { rotaEnviarArquivo, rotaLerArquivo, rotaApagarArquivo } from '../src/servidor/rotas.ts';
import { acervo, armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaEnviarArquivo(pedido, armazem(), acervo()));
export const GET = proteger((pedido: Request) => rotaLerArquivo(pedido, armazem(), acervo()));
export const DELETE = proteger((pedido: Request) =>
  rotaApagarArquivo(pedido, armazem(), acervo()),
);
```

- [ ] **Step 3: Registrar a função no guarda de `api/`**

`src/servidor/api.test.ts:27` tem um mapa `METODOS` e afirma
`expect(FUNCOES).toEqual(Object.keys(METODOS).sort())`, com o comentário
*"Função nova sem entrada aqui passaria sem ser conferida."* Sem esta entrada,
`npm test` fica vermelho:

```ts
  'arquivo.ts': ['DELETE', 'GET', 'POST'],
```

O mesmo teste também carrega cada função em Node puro — é ele que prova que as
extensões `.ts` da Task 5 estão certas.

Run: `npx vitest run src/servidor/api.test.ts`
Expected: PASS, inclusive `arquivo.ts carrega em Node puro`.

- [ ] **Step 4: Documentar a variável nova**

**O `README.md` não tem seção de variáveis de ambiente** — nem `KV_REST_API_*`
nem `EMAILS_PERMITIDOS` aparecem lá, e a seção *Publicar* ainda diz *"Não há
servidor, banco nem conta"*, o que deixou de ser verdade há várias rodadas.
Crie a seção, liste as três famílias que existem hoje (Redis, e-mails
permitidos, acervo) e corrija a frase obsoleta. Uma variável que só existe no
código é uma publicação que quebra sem dizer por quê.

- [ ] **Step 5: Fechar o chunk**

Run: `npm run verificar && npm run build`
Expected: tudo verde.

- [ ] **Step 6: A prova manual do Blob, que nenhum teste faz**

**Não pule.** `AcervoMemoria` prova as rotas; `AcervoBlob` — o `fetch`, os
cabeçalhos, a versão da API, o `enderecoDe` — não é exercitado por teste nenhum.
Até aqui, nada provou que um byte chegou à Vercel.

1. Na Vercel, aba **Storage**, crie um Blob store e ligue-o ao projeto. Isso
   injeta `BLOB_READ_WRITE_TOKEN`.
2. `vercel env pull .env.local` e suba com `vercel dev` (ou publique numa
   pré-visualização).
3. Entre com a sua conta, suba um arquivo pequeno de verdade, recarregue a
   página e abra-o.
4. Apague-o e confirme que ele some do painel do Blob.

Se o passo 3 falhar com 4xx, o primeiro suspeito é `x-api-version`: confira-o
antes de mexer em qualquer outra coisa.

- [ ] **Step 7: Commit**

```bash
git add src/servidor/vercel.ts api/arquivo.ts src/servidor/api.test.ts README.md
git commit -m "acervo: as três rotas no ar, e a variável dita no README"
```

**Fim do Chunk 2.** Os bytes têm onde morar, atrás da sessão, com uma conta
incapaz de ler o arquivo da outra. Nenhuma tela ainda.

---

## Chunk 3: O componente

Um componente novo, e só um. A prova de que nenhum existente serve está no spec:
`core` tem Avatar, Badge, Button, Card, Icon, IconButton, ProgressBar, Tag;
`forms` tem Checkbox, Field, Radio, SearchInput, Select, Switch, TextInput;
`data`, `messaging` e `feedback` não tratam entrada de arquivo. Nenhum recebe
arquivo. O resto da tela sai do que já existe.

**A API da biblioteca é em inglês**, como todo o resto de `design-system/`. Só
o domínio e a interface são em pt-BR.

### Task 11: O `DESIGN.md` primeiro

O `DESIGN.md` é o contrato, e hoje ele diz, em *Corners, borders and shadows*:
*"There are no thick rules, no coloured left-border accents and no dividers
heavier than 1px. The only stronger border is the purple hairline."* Uma zona de
arrastar tracejada **contradiz o texto escrito**. Pela regra 1, o contrato muda
antes do código — não o contrário.

**Files:**
- Modify: `DESIGN.md`
- Modify: `design-system/tokens/radius.css`

- [ ] **Step 1: Registrar o componente**

Em `DESIGN.md`, na lista de *Later additions*, depois da linha do `Field` e
`TextInput`:

```markdown
- **`FileDrop`** — file intake. See *Form fields* below. The source dashboard
  never accepts a file; the personal product stores documents and images, and
  a bare `<input type="file">` on a screen would be the first hand-rolled
  control in the system.
```

- [ ] **Step 2: Declarar o traço no contrato**

Ainda em `DESIGN.md`, no fim de *Corners, borders and shadows*, acrescente um
parágrafo — e ele precisa dizer que é exceção, senão o tracejado vira decoração
solta em seis meses:

```markdown
**One dashed border, and only one.** `FileDrop` idle uses the ordinary field
hairline (`--bw-hairline` at `--border-default`) with a dashed stroke, and it is
the single dashed edge in the system. It carries meaning the solid hairline
cannot: a dashed boundary reads as *a space waiting to be filled*, which is
exactly what an empty drop zone is. On drag-over it becomes solid
`--border-accent` with the accent tint — the edge closes because the space is no
longer empty. Nothing else may be dashed.
```

Note o que **não** foi escrito: nenhuma licença para `--border-strong`. A frase
acima do parágrafo diz que a única borda mais forte é a roxa, e o `FileDrop`
respeita isso usando `--border-default`, o mesmo hairline de todo campo. Uma
exceção por parágrafo; duas viram permissão geral.

- [ ] **Step 3: Fechar a referência cruzada em *Form fields***

O bullet da Task 11 Step 1 diz *"See Form fields below"*, e hoje esse ponteiro
não chega a lugar nenhum. Em `DESIGN.md` → *Form fields* (linha 324), no fim da
seção, acrescente um parágrafo no mesmo formato do que `Field`/`TextInput`
receberam — com as medidas, porque é a ausência delas que faz o próximo
componente inventar valores:

```markdown
**`FileDrop`** takes the same measurements as the other controls: radius
`--r-control`, fill `--surface-input`, hairline `--border-default` — dashed while
idle, solid `--border-accent` over a drag — error `--status-danger-bd`, disabled
42%, hint text `--fs-xs`, body `--type-body`. It composes `ProgressBar` while a
file is uploading rather than drawing its own track. It reports files and judges
nothing: size ceilings are product rules and live in the product.
```

- [ ] **Step 4: Declarar o token**

Em `design-system/tokens/radius.css`, ao lado de `--bw-hairline`:

```css
--bs-dashed:dashed; /* @kind other */
```

O comentário `@kind` segue o formato das linhas vizinhas (`--bw-hairline` e
`--t-hover` em `motion.css:10`). Ele **não** é lido por `adherence.rules.json` —
esse arquivo é só uma lista de seletores ESLint sobre TS/TSX e nunca abre CSS.
Quem cataloga token é `design-system/adherence-metadata.json`, com 191 entradas
em `tokens[]` e as espécies em `tokenKinds{}`. Acrescente `--bs-dashed` lá
também, senão o inventário passa a mentir.

- [ ] **Step 5: Conferir que nada quebrou**

Run: `npm run verificar`
Expected: verde. **`design-system/tokens/themes.test.ts` não precisa de
mudança** — ele deriva os conjuntos por regex de `colors.css` e dos dois blocos
de `themes.css`, e nunca lê `radius.css`. Não procure onde acrescentar.

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md design-system/tokens/radius.css \
        design-system/adherence-metadata.json
git commit -m "DESIGN: o FileDrop, e a única borda tracejada do sistema"
```

---

### Task 12: `FileDrop`

**Files:**
- Create: `design-system/components/forms/FileDrop.tsx`
- Create: `design-system/components/forms/FileDrop.prompt.md`
- Modify: `design-system/components/index.ts`

- [ ] **Step 1: Escrever o componente**

Crie `design-system/components/forms/FileDrop.tsx`:

```tsx
import React from 'react';
import { ProgressBar } from '../core/ProgressBar';

export interface FileDropProps {
  /** wire this to the Field's `htmlFor` */
  id?: string;
  onFiles?: (files: File[]) => void;
  /** the `accept` attribute — `image/*,application/pdf` */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** the line inside the zone; the caller writes it in the product's language */
  label?: string;
  /** the smaller line under it — size ceiling, accepted kinds */
  hint?: string;
  /** turns the hairline red — pass the message to the surrounding Field */
  invalid?: boolean;
  /** 0–100 while something is uploading; the zone shows a track instead of the hint */
  progress?: number;
  style?: React.CSSProperties;
}

/**
 * The kit's file intake.
 *
 * Addition, not from the source — see DESIGN.md → Form fields. The dashed edge
 * is the system's only one, and it is declared in DESIGN.md → Corners: a dashed
 * boundary reads as a space waiting to be filled.
 *
 * It is a real `<input type="file">` under a label, and not a `<div>` with a
 * click handler. The native control is what gives the keyboard, the screen
 * reader and the iOS photo picker their behaviour for free — and every
 * hand-rolled version of this loses at least one of the three.
 */
export function FileDrop({
  id,
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  label = 'Arraste um arquivo ou toque para escolher',
  hint,
  invalid = false,
  progress,
  style,
}: FileDropProps) {
  const [sobre, setSobre] = React.useState(false);
  const entrada = React.useRef<HTMLInputElement>(null);

  const receber = (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;
    onFiles?.(Array.from(lista));
    // Sem isto, escolher o mesmo arquivo duas vezes seguidas não dispara
    // `change` na segunda — o valor não mudou.
    if (entrada.current) entrada.current.value = '';
  };

  const borda = invalid
    ? 'var(--status-danger-bd)'
    : sobre
      ? 'var(--border-accent)'
      : 'var(--border-default)';

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={(e) => {
        // Sem a checagem, atravessar o texto lá dentro dispara `dragleave` e a
        // borda pisca a cada movimento do ponteiro.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setSobre(false);
      }}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setSobre(false);
        receber(e.dataTransfer.files);
      }}
      style={{
        // O input escondido é `absolute`; sem isto ele se posiciona contra a
        // página e pode criar rolagem no rodapé.
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-2)',
        padding: 'var(--sp-6)',
        borderRadius: 'var(--r-control)',
        borderWidth: 'var(--bw-hairline)',
        borderStyle: sobre ? 'solid' : 'var(--bs-dashed)',
        borderColor: borda,
        background: sobre ? 'var(--accent-soft)' : 'var(--surface-input)',
        font: 'var(--type-body)',
        color: 'var(--text-muted)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        transition: 'var(--t-hover)',
        ...style,
      }}
    >
      <input
        id={id}
        ref={entrada}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => receber(e.target.files)}
        style={{
          // Fora da tela, e não `display:none`: escondido assim o input
          // continua focável pelo teclado e anunciado pelo leitor de tela.
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <span style={{ color: 'var(--text-body)' }}>{label}</span>
      {progress === undefined ? (
        hint && <span style={{ fontSize: 'var(--fs-xs)' }}>{hint}</span>
      ) : (
        // `ProgressBar` e não uma barra à mão: ela já traz o gradiente do
        // sistema e os atributos de acessibilidade inteiros.
        <ProgressBar value={progress} tone="purple" style={{ width: '100%' }} />
      )}
    </label>
  );
}
```

**Confira cada token** contra `design-system/tokens/*.css` antes de commitar.
Estes dezoito existem e foram verificados: `--sp-2`, `--sp-6`, `--r-control`,
`--bw-hairline`, `--bs-dashed` (novo, Task 11), `--border-default`,
`--border-accent`, `--status-danger-bd`, `--accent-soft`, `--surface-input`,
`--text-body`, `--text-muted`, `--fs-xs`, `--type-body`, `--t-hover`.

Três que **não existem** e que uma primeira versão deste plano usava, para o
caso de você vê-los em algum lugar: `--danger-500` (é `--status-danger-bd`),
`--accent-500` (é `--accent`) e `--surface-sunken` (é `--surface-input` para
campo, `--surface-raised` para trilho). Nada os pega: eles passam no lint, no
typecheck e no build, e só somem na tela. `eslint.config.js:70` só carrega os
seletores de `adherence.rules.json`, que proíbem hex e `px` crus — **não existe
regra que confira se um token existe**.

- [ ] **Step 2: Escrever o `.prompt.md`**

Os sete `.prompt.md` de `forms/` têm todos a mesma forma, e ela não tem títulos
nem lista: **uma linha de descrição, um bloco JSX, um parágrafo curto**. Siga-a.

Crie `design-system/components/forms/FileDrop.prompt.md`:

```markdown
Dashed intake zone over a real file input. Use it anywhere a bare
`<input type="file">` would otherwise appear; pair it with `Field` for the label
and the error, like `TextInput`.

```jsx
<FileDrop id="anexo" accept="image/*,application/pdf" hint="Até 10 MB" onFiles={receber} />
<FileDrop id="anexo" progress={62} />
<FileDrop id="anexo" invalid />
```

The dashed edge is the only one in the system — see DESIGN.md → Corners. It
reports `File[]` and judges nothing: size ceilings are product rules. A file
*already* stored is a `Card` with an `Icon`, not a `FileDrop`; a URL is a
`TextInput`.
```

Atenção ao escrever: o bloco JSX fica dentro do `.prompt.md`, então as cercas
internas precisam ser escapadas ou o arquivo sai truncado. Confira o resultado
abrindo o arquivo depois de salvar.

- [ ] **Step 3: Exportar no barrel**

Em `design-system/components/index.ts`, na seção `forms`, ao lado do
`TextInput`:

Logo depois das linhas do `TextInput` (índice 48–49), para o grupo continuar na
ordem em que está:

```ts
export { FileDrop } from './forms/FileDrop';
export type { FileDropProps } from './forms/FileDrop';
```

- [ ] **Step 4: Conferir**

Run: `npm run verificar && npm run build`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add design-system/components/forms/FileDrop.tsx \
        design-system/components/forms/FileDrop.prompt.md \
        design-system/components/index.ts
git commit -m "FileDrop: receber arquivo sem nenhuma tela rolar o seu próprio input"
```

**Fim do Chunk 3.**

---

## Chunk 4: O cliente, o contexto e a tela

### Task 13: Os três métodos no `ClienteSincronia`

**Não crie um cliente novo.** `ClienteSincronia` em `src/dados/sincronia.ts` já
guarda o token, já trata 401 esquecendo a sessão e já traduz falta de rede em
"Sem conexão. O que você fez está salvo aqui e sincroniza depois." Um segundo
cliente duplicaria os três e divergiria no primeiro conserto.

**Files:**
- Modify: `src/dados/sincronia.ts`
- Modify: `src/dados/sincronia.test.ts`

- [ ] **Step 1: Write the failing test**

O arquivo já tem os dois helpers de que estes testes precisam:
`class GuardaMemoria implements Guarda` (linha 5) e `fingir(respostas)` (linha
21), que devolve `{ buscar, chamadas }`, mais o atalho `json()` (linha 33).
Use-os — não escreva um terceiro.

```ts
describe('o acervo, do lado do cliente', () => {
  const conectado = () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 't');
    return guarda;
  };

  const png = () => new File([new Uint8Array([1, 2, 3])], 'x.png', { type: 'image/png' });

  it('manda os bytes com a chave no cabeçalho e o mime no Content-Type', async () => {
    const { buscar, chamadas } = fingir(() => json({ chave: 'a1/x.png' }));
    const cliente = new ClienteSincronia(conectado(), buscar);

    await cliente.enviarArquivo('a1/x.png', png());

    const { url, opcoes } = chamadas[0];
    const cabecalhos = opcoes.headers as Record<string, string>;
    expect(url).toContain('/api/arquivo');
    expect(opcoes.method).toBe('POST');
    expect(cabecalhos['x-chave']).toBe('a1/x.png');
    expect(cabecalhos['Content-Type']).toBe('image/png');
    expect(cabecalhos.Authorization).toBe('Bearer t');
  });

  it('devolve um blob ao ler', async () => {
    const { buscar } = fingir(
      () =>
        new Response(new Uint8Array([7]), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        }),
    );

    const blob = await new ClienteSincronia(conectado(), buscar).lerArquivo('a1/x.png');

    expect(blob).not.toBeNull();
    expect(blob!.type).toBe('image/png');
  });

  it('devolve null quando o arquivo sumiu, em vez de estourar a tela', async () => {
    const { buscar } = fingir(() => new Response('', { status: 404 }));
    expect(await new ClienteSincronia(conectado(), buscar).lerArquivo('sumiu')).toBeNull();
  });

  it('sem rede, a mensagem é a do avião e não a de erro de servidor', async () => {
    const buscar = (async () => {
      throw new TypeError('failed to fetch');
    }) as unknown as typeof fetch;
    const cliente = new ClienteSincronia(conectado(), buscar);

    await expect(cliente.enviarArquivo('a1/x.png', png())).rejects.toThrow(/Sem conexão/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dados/sincronia.test.ts`
Expected: FAIL — os três métodos não existem.

- [ ] **Step 3: Write minimal implementation**

Em `src/dados/sincronia.ts`, dentro de `ClienteSincronia`:

```ts
  /**
   * Sobe os bytes de um arquivo.
   *
   * O `Content-Type` carrega o tipo do arquivo, e a chave vai no cabeçalho:
   * o corpo inteiro é o binário, e não sobra onde pôr JSON. Endereço fica
   * fora disso porque endereço vai parar em registro de servidor.
   */
  async enviarArquivo(chave: string, arquivo: File): Promise<void> {
    const resposta = await this.pedir('arquivo', {
      method: 'POST',
      headers: {
        'Content-Type': arquivo.type || 'application/octet-stream',
        'x-chave': chave,
      },
      body: arquivo,
    });
    if (!resposta.ok) throw new ErroDaSincronia(await this.mensagemDe(resposta));
  }

  /**
   * Baixa um arquivo, ou `null` se ele não está mais lá.
   *
   * Sumido não é erro: o binário pode ter sido apagado no outro aparelho entre
   * a sincronização e este toque, e a grade sabe mostrar a ficha sem a
   * prévia. Estourar aqui derrubaria a tela inteira por causa de um cartão.
   */
  async lerArquivo(chave: string): Promise<Blob | null> {
    const resposta = await this.pedir(`arquivo?chave=${encodeURIComponent(chave)}`, {
      method: 'GET',
    });
    if (resposta.status === 404) return null;
    if (!resposta.ok) throw new ErroDaSincronia(await this.mensagemDe(resposta));
    return resposta.blob();
  }

  async apagarArquivo(chave: string): Promise<void> {
    const resposta = await this.pedir(`arquivo?chave=${encodeURIComponent(chave)}`, {
      method: 'DELETE',
    });
    // 404 é sucesso: o fim desta chamada é o arquivo não existir mais.
    if (!resposta.ok && resposta.status !== 404) {
      throw new ErroDaSincronia(await this.mensagemDe(resposta));
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dados/sincronia.test.ts`
Expected: PASS.

`pedir` espalha `...opcoes.headers` **depois** dos padrões (`sincronia.ts:120`),
então o `Content-Type: image/png` do envio vence o `application/json` padrão. O
`GET` não precisa sobrescrever nada.

- [ ] **Step 5: Commit**

```bash
git add src/dados/sincronia.ts src/dados/sincronia.test.ts
git commit -m "sincronia: subir, baixar e apagar arquivo, no cliente que já existia"
```

---

### Task 14: As ações no `BancoContexto`

**Files:**
- Modify: `src/dados/BancoContexto.tsx`

- [ ] **Step 1: Declarar no contrato**

Junto de `criarPeca` / `editarPeca` / `removerPeca`:

```ts
  /**
   * Sobe o arquivo e grava a ficha, nesta ordem.
   *
   * **Os bytes primeiro.** Se a subida falhar, nada entra no banco e eu tento
   * de novo. Na ordem inversa, uma falha de rede deixaria uma ficha apontando
   * para um arquivo que nunca existiu — e ficha sem byte é pior que byte sem
   * ficha, porque ela aparece na grade e não abre.
   */
  enviarArquivo(arquivo: File, dados: Omit<Arquivo, keyof BaseRegistro | 'chave' | 'nomeOriginal' | 'mime' | 'tamanho'>): Promise<void>;
  editarArquivo(id: string, mudanca: Edicao<Arquivo>): Promise<void>;
  removerArquivo(id: string): Promise<void>;
  /** solta o anexo da peça sem apagar o arquivo */
  desanexar(pecaId: string, arquivoId: string): Promise<void>;
  /** prende à peça um arquivo que já está no acervo, sem subir nada de novo */
  anexar(pecaId: string, arquivoId: string): Promise<void>;
  /**
   * Os bytes de um arquivo, ou `null` se ele não está mais no acervo.
   *
   * **Precisa estar aqui.** O `ClienteSincronia` é um `const cliente` local
   * dentro de `ProvedorBanco` (linha 160) e nunca é exportado; `useBanco()`
   * devolve só `Acoes`. Sem esta ação, nenhuma tela consegue ler um byte — e
   * a vista do acervo, a faixa de anexos e a exportação em zip dependem disso.
   */
  lerArquivo(chave: string): Promise<Blob | null>;
```

- [ ] **Step 2: Implementar**

```ts
      async enviarArquivo(arquivo, dados) {
        const id = novoId();
        const chave = chaveDe(id, arquivo.name);
        const ficha = {
          ...dados,
          nomeOriginal: arquivo.name,
          mime: arquivo.type || 'application/octet-stream',
          tamanho: arquivo.size,
          chave,
        };
        validarArquivo(ficha);

        // Os bytes primeiro: ficha sem arquivo aparece na grade e não abre.
        await cliente.enviarArquivo(chave, arquivo);

        const t = agora();
        const novo: Arquivo = { ...ficha, id, criadoEm: t, alteradoEm: t };
        await gravar({ ...banco, arquivos: [...banco.arquivos, novo] });
      },

      async editarArquivo(id, mudanca) {
        await gravar({ ...banco, arquivos: editarNaLista(banco.arquivos, id, mudanca, agora()) });
      },

      async removerArquivo(id) {
        const ficha = banco.arquivos.find((a) => a.id === id);
        if (!ficha) return;

        // A ficha sai primeiro, e de propósito — o inverso do enviar. Se a
        // remoção do binário falhar, sobra um byte órfão pagando
        // armazenamento; na ordem inversa sobraria uma ficha que não abre.
        // Órfão é caro; ficha quebrada é mentira.
        const { lista, removidos } = removerRegistro(banco, 'arquivos', banco.arquivos, id, agora());
        const semAnexo = banco.pecas.map((p) =>
          (p.anexos ?? []).includes(id)
            ? { ...p, anexos: p.anexos!.filter((a) => a !== id), alteradoEm: agora() }
            : p,
        );
        await gravar({ ...banco, arquivos: lista, pecas: semAnexo, removidos });

        await cliente.apagarArquivo(ficha.chave).catch(() => {
          // Silêncio de propósito: o arquivo já sumiu da minha vista, e um
          // aviso sobre um byte órfão não me dá nada para fazer. A limpeza
          // de órfãos é trabalho de Ajustes, não deste toque.
        });
      },

      lerArquivo: (chave) => cliente.lerArquivo(chave),

      async anexar(pecaId, arquivoId) {
        const peca = banco.pecas.find((p) => p.id === pecaId);
        if (!peca || (peca.anexos ?? []).includes(arquivoId)) return;
        await gravar({
          ...banco,
          pecas: editarNaLista(
            banco.pecas,
            pecaId,
            { anexos: [...(peca.anexos ?? []), arquivoId] },
            agora(),
          ),
        });
      },

      async desanexar(pecaId, arquivoId) {
        const peca = banco.pecas.find((p) => p.id === pecaId);
        if (!peca) return;
        await gravar({
          ...banco,
          pecas: editarNaLista(
            banco.pecas,
            pecaId,
            { anexos: (peca.anexos ?? []).filter((a) => a !== arquivoId) },
            agora(),
          ),
        });
      },
```

O `cliente` é o `ClienteSincronia` criado em `BancoContexto.tsx:160` — o nome é
esse mesmo, não é apelido.

**O acervo exige conta conectada**, e isso é novo no sistema. `pedir` só manda
`Authorization` quando há token, e as três rotas ficam atrás de `validarSessao`:
sem estar conectado, o resto do MSL funciona e o acervo não. A tela precisa
dizer isso em vez de mostrar erro de rede — trate `banco` sem sessão como
"conecte a sua conta para usar o acervo", com o caminho para Ajustes.

- [ ] **Step 3: Conferir**

Run: `npm run verificar`
Expected: verde.

- [ ] **Step 4: Commit**

```bash
git add src/dados/BancoContexto.tsx
git commit -m "banco: subir, ler, anexar e remover arquivo, na ordem certa"
```

---

### Task 15: A vista Acervo

**A extração é obrigatória, não condicional.** `src/telas/Criacao.tsx` já tem
799 linhas, e as Tasks 15 e 16 juntas passam de 1000 com folga. A vista do
acervo nasce em `src/telas/criacao/Acervo.tsx`.

Não há precedente de tela dividida no projeto — esta é a primeira. Por isso a
costura precisa ser declarada aqui, e não escolhida na hora:

- `Acervo.tsx` chama `useBanco()` **ele mesmo**, e não recebe o banco por
  propriedade. É o que todas as telas fazem, e passar o banco inteiro por
  propriedade inventaria um padrão novo só para este arquivo.
- Propriedade nenhuma além de `desktop: boolean`, que `Criacao.tsx` já calcula
  com `useLarguraDesktop()` e que não vale recalcular.
- `Criacao.tsx` fica com a troca de vista e renderiza `<Acervo desktop={...} />`.
- Nada de `index.ts` em `src/telas/criacao/`: um barrel para um arquivo é
  cerimônia.

**Files:**
- Create: `src/telas/criacao/Acervo.tsx`
- Modify: `src/telas/Criacao.tsx`

- [ ] **Step 1: Abrir `baixar` para binário**

`src/telas/Criacao.tsx:78` é `function baixar(nome: string, conteudo: string, tipo: string)`
e faz `new Blob([conteudo], { type: tipo })`. Um arquivo vindo do acervo é um
`Blob`, e passá-lo assim grava literalmente `"[object Blob]"` no disco. Abra a
assinatura e exporte-a, porque `Acervo.tsx` vai usá-la:

```ts
export function baixar(nome: string, conteudo: string | Blob, tipo?: string) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
```

Run: `npm run typecheck` — as chamadas que já existiam continuam válidas.

- [ ] **Step 2: A troca de vista em `Criacao.tsx`**

Um par de botões no topo — **Peças** e **Acervo** — no mesmo tratamento que a
tela já usa para filtro. **Nada de componente `Tabs`:** o `DESIGN.md:113` diz
que ele não existe no sistema, e isso é achado, não lacuna.

Dê ids no padrão da tela (`#cri-vista-pecas`, `#cri-vista-acervo`) — os testes
de ponta a ponta localizam por id, e a Task 17 depende deles.

- [ ] **Step 3: A grade**

Em `Acervo.tsx`, `filtrarArquivos(banco.arquivos, filtro)` e, para cada
arquivo, um `Card` com:

- `Icon` de `ICONE_DO_TIPO_ARQUIVO[tipoDoArquivo(a.mime)]`
- o título, e o `nomeOriginal` em `--text-muted` abaixo
- `Badge` com `ROTULO_TIPO_ARQUIVO[...]` e `formatarTamanho(a.tamanho)`
- `Tag` por etiqueta
- `IconButton` de abrir e de apagar

No cabeçalho, `resumirAcervo` em `StatCard`: quantos arquivos e
`formatarTamanho(ocupado)`. A busca é `SearchInput`; os filtros de tipo e
contexto são `Select`.

- [ ] **Step 4: Abrir**

`abreNoNavegador(mime)` decide, e o servidor concorda — ele manda
`Content-Disposition: attachment` para o que não abre (Task 9).

**Verdadeiro:** `lerArquivo(chave)` do `useBanco()`, `URL.createObjectURL(blob)`,
mostrar num `Modal` (`<img>` para imagem, `<iframe>` para PDF e texto).
**`URL.revokeObjectURL` ao fechar, sem exceção** — sem isso o blob fica na
memória até a aba morrer, e uma sessão de acervo vaza dezenas. Um
`useEffect` com função de limpeza é o lugar certo, não o `onClick` do botão de
fechar, que não roda quando se fecha pelo `Escape`.

**Falso:** `baixar(a.nomeOriginal, blob)`.

`lerArquivo` devolvendo `null` mostra "Este arquivo não está mais no acervo" no
próprio cartão. Não é erro: é o outro aparelho tendo apagado.

- [ ] **Step 5: Subir**

Um `FileDrop` acima da grade, com `hint="Até 10 MB — imagem, PDF, página ou texto"`.
Antes de chamar `enviarArquivo`, rode `validarArquivo` num `try/catch` e mostre
a mensagem do `ArquivoInvalido` — é para isso que a validação do domínio existe,
e ela já diz o tamanho recebido.

Dê ao `FileDrop` o id `#cri-acervo-entrada`: a Task 17 usa `setInputFiles` nele.

- [ ] **Step 6: Apagar**

Confirmação no `Modal` que a tela já usa, dizendo o número que
`pecasQueUsam(banco, id).length` devolve: *"3 peças usam este arquivo."* O
"tem certeza?" sozinho não informa nada.

- [ ] **Step 7: Conferir e commitar**

Run: `npm run verificar && npm run build`

```bash
git add src/telas/criacao/Acervo.tsx src/telas/Criacao.tsx
git commit -m "Criação: a vista do acervo, com o que abre aqui e o que baixa"
```

---

### Task 16: Anexos no editor da peça

**Files:**
- Create: `src/telas/criacao/EscolherDoAcervo.tsx`
- Modify: `src/telas/Criacao.tsx`

- [ ] **Step 1: A faixa de anexos**

No `Modal` de edição da peça (`Criacao.tsx:470`), abaixo do corpo:
`anexosDe(banco, peca)` numa linha de `Card` pequenos, cada um com `Icon`,
título e um `IconButton` que chama `desanexar(peca.id, a.id)`.

**Soltar não apaga o arquivo**, e o rótulo precisa dizer isso: `title="Soltar"`,
nunca "Apagar". Um botão de lixeira aqui seria mentira — o arquivo continua no
acervo.

- [ ] **Step 2: Subir e anexar num passo**

Um `FileDrop` na mesma faixa. No `onFiles`, `enviarArquivo` e em seguida
`anexar` com o id que ele criou.

Isso exige que `enviarArquivo` **devolva o id**. Ajuste o contrato da Task 14:

```ts
  enviarArquivo(arquivo: File, dados: …): Promise<string>;
```

e faça a implementação terminar com `return id;`. Sem isso não há como anexar o
que acabou de subir sem procurar na lista por nome, que é palpite.

- [ ] **Step 3: `EscolherDoAcervo`**

Sem ele, a mesma foto vira quatro cópias pagas em quatro peças. É um `Modal`, e
não um `Select`: a escolha precisa de busca e de ver o que é cada arquivo.

```tsx
export interface EscolherDoAcervoProps {
  aberto: boolean;
  /** os que já estão presos, para não oferecer duas vezes */
  jaAnexados: string[];
  onEscolher: (arquivoId: string) => void;
  onFechar: () => void;
}
```

Por dentro: `Modal` + `SearchInput` + a lista de
`filtrarArquivos(banco.arquivos, { busca })` menos os `jaAnexados`, cada linha
um `Card` clicável que chama `onEscolher` e fecha. Lista vazia mostra "Nada no
acervo ainda" e um caminho para a vista Acervo.

Componente de tela e não de `design-system/`: ele conhece `Arquivo`, que é
domínio, e a regra 2 vale para peça reutilizável, não para composição de tela.

- [ ] **Step 4: Ligar**

No editor, um botão "Escolher do acervo" abre o `EscolherDoAcervo`, e o
`onEscolher` chama `anexar(peca.id, arquivoId)`.

- [ ] **Step 5: Conferir e commitar**

Run: `npm run verificar && npm run build`

```bash
git add src/telas/criacao/EscolherDoAcervo.tsx src/telas/Criacao.tsx \
        src/dados/BancoContexto.tsx
git commit -m "Criação: anexar ao que eu escrevo, inclusive o que já está no acervo"
```

---

### Task 17: A prova de ponta a ponta

**Files:**
- Create: `e2e/acervo.spec.ts`

As convenções deste repositório, que este teste segue (todas conferidas em
`e2e/criacao.spec.ts` e `playwright.config.ts`):

- rodam **contra o build**, não contra o servidor de dev, com
  `serviceWorkers: 'block'`
- dois projetos, `mac` e `iphone`, os dois em WebKit
- `comecarLimpo(page)` é um `addInitScript` com trava em `sessionStorage`, senão
  cada navegação apaga o que o teste acabou de criar
- localizadores por id, no padrão `#cri-*`
- rota `/app/criacao`

**Uma coisa a mais, que a Criação não precisava:** o acervo só funciona
conectado. `ClienteSincronia.pedir` só manda `Authorization` quando há token em
`localStorage`, e sem ele a tela mostra o convite a conectar em vez da grade. O
teste semeia um token de mentira junto com a limpeza.

- [ ] **Step 1: Write the test**

```ts
import { test, expect, type Page } from '@playwright/test';

/** Acervo — subir, ver e recusar. */

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Limpa uma vez, e entra conectado.
 *
 * O token é de mentira e nunca chega a um servidor: `page.route` intercepta
 * `/api/arquivo` antes. Ele existe só porque sem token a tela oferece conectar
 * em vez de mostrar o acervo.
 */
async function comecarConectado(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('teste-ja-limpou')) {
        localStorage.removeItem('msl-banco');
        sessionStorage.setItem('teste-ja-limpou', '1');
      }
      localStorage.setItem('msl-sessao', 'token-de-teste');
      localStorage.setItem(
        'msl-conta',
        JSON.stringify({ id: 'u1', email: 'dono@exemplo.com', criadoEm: '2026-09-01T00:00:00.000Z' }),
      );
    } catch {
      /* janela privada */
    }
  });
}

/** O acervo de mentira: guarda em memória o que o POST mandar. */
async function acervoFingido(page: Page) {
  const guardado = new Map<string, Buffer>();

  await page.route('**/api/arquivo**', async (rota) => {
    const pedido = rota.request();
    const chave = new URL(pedido.url()).searchParams.get('chave') ?? pedido.headers()['x-chave'];

    if (pedido.method() === 'POST') {
      guardado.set(chave!, Buffer.from(pedido.postDataBuffer() ?? []));
      return rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ chave, tamanho: guardado.get(chave!)!.length, mime: 'image/png' }),
      });
    }
    if (pedido.method() === 'DELETE') {
      guardado.delete(chave!);
      return rota.fulfill({ status: 200, contentType: 'application/json', body: '{"apagado":true}' });
    }
    const bytes = guardado.get(chave!);
    if (!bytes) return rota.fulfill({ status: 404, body: '' });
    return rota.fulfill({ status: 200, contentType: 'image/png', body: bytes });
  });

  // A sincronização periódica não pode virar ruído no meio do teste.
  await page.route('**/api/sincronizar', (rota) => rota.fulfill({ status: 401, body: '{}' }));

  return guardado;
}

test('subo um arquivo, ele aparece na grade e eu abro', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarConectado(page);
  const guardado = await acervoFingido(page);
  await page.goto('/app/criacao');

  await page.locator('#cri-vista-acervo').click();
  await page.locator('#cri-acervo-entrada').setInputFiles({
    name: 'print-do-funil.png',
    mimeType: 'image/png',
    buffer: PNG,
  });

  await expect(page.getByText('print-do-funil.png')).toBeVisible();
  expect(guardado.size, 'o POST precisa ter chegado ao acervo').toBe(1);

  // O tamanho vem de `formatarTamanho`, então a unidade prova que a tela não
  // está mostrando bytes crus.
  await expect(page.getByText(/\d+(,\d)? (B|KB)/)).toBeVisible();

  await page.locator('#cri-acervo-abrir').first().click();
  await expect(page.locator('#cri-acervo-previa img')).toBeVisible();

  expect(erros, 'nenhum erro de página').toEqual([]);
});

test('o arquivo grande é recusado antes de sair do aparelho', async ({ page }) => {
  await comecarConectado(page);
  const guardado = await acervoFingido(page);
  await page.goto('/app/criacao');

  await page.locator('#cri-vista-acervo').click();
  await page.locator('#cri-acervo-entrada').setInputFiles({
    name: 'grande.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });

  await expect(page.getByText(/10 MB/)).toBeVisible();
  // O que importa não é a mensagem: é a rede não ter sido tocada.
  expect(guardado.size, 'nada pode ter subido').toBe(0);
});

test('anexo o que já está no acervo, sem subir de novo', async ({ page }) => {
  await comecarConectado(page);
  const guardado = await acervoFingido(page);
  await page.goto('/app/criacao');

  await page.locator('#cri-vista-acervo').click();
  await page.locator('#cri-acervo-entrada').setInputFiles({
    name: 'depoimento.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await expect(page.getByText('depoimento.png')).toBeVisible();
  expect(guardado.size).toBe(1);

  await page.locator('#cri-vista-pecas').click();
  // Crie a peça pelo mesmo caminho que `e2e/criacao.spec.ts` já usa; leia o
  // helper `criar` de lá e reaproveite-o em vez de reescrevê-lo.
  // …abra o editor da peça, clique em "Escolher do acervo", escolha o arquivo.

  await expect(page.getByText('depoimento.png')).toBeVisible();
  expect(guardado.size, 'anexar não pode ter subido nada de novo').toBe(1);
});
```

Os ids `#cri-vista-acervo`, `#cri-vista-pecas`, `#cri-acervo-entrada`,
`#cri-acervo-abrir` e `#cri-acervo-previa` vêm das Tasks 15 e 16. Se você os
batizou diferente lá, corrija **aqui**, e não invente ids novos na tela.

Sobre o teste do teto: `setInputFiles` com 10 MB atravessa o protocolo do driver
duas vezes (um projeto `mac`, um `iphone`) e custa alguns segundos. É o preço de
provar a recusa de ponta a ponta — o teto em si já está provado barato em
`src/dominio/acervo.test.ts`. Se o tempo incomodar, este é o teste a mover para
lá, não os outros dois.

- [ ] **Step 2: Rodar**

Run: `npm run test:e2e`
Expected: PASS nos dois projetos.

- [ ] **Step 3: Commit**

```bash
git add e2e/acervo.spec.ts
git commit -m "e2e: o acervo de ponta a ponta, com a rede fingida"
```

**Fim do Chunk 4.** O acervo funciona.

---

## Chunk 5: A exportação

`exportar()` hoje devolve um JSON que é tudo que existe — e é ele que garante
que o dado é meu (`src/dados/repositorio.ts:28`). Com bytes no acervo, o JSON
passou a carregar só fichas. Este chunk fecha o buraco.

Escrito à mão, sem dependência nova, no mesmo espírito da decisão do PDF: *"o
PDF sai da impressão do navegador, e não de uma biblioteca."*

### Task 18: O `.zip` escrito à mão — montar e abrir

Um ZIP sem compressão (método *store*) é um formato de cabeçalhos fixos com um
CRC-32 por entrada. São ~250 linhas com o leitor junto, e nenhuma dependência.
Comprimir exigiria deflate, que é onde uma biblioteca passaria a valer a pena —
e o acervo já é JPEG e PDF, que não comprimem de novo.

**O leitor é obrigatório, não opcional.** A Task 19 importa um `.zip`, e importar
é descompactar. Sem `lerZip`, a exportação é uma porta que só abre para fora.

**Files:**
- Create: `src/dominio/zip.ts`
- Create: `src/dominio/zip.test.ts`

- [ ] **Step 1: Write the failing test — montar**

```ts
import { describe, it, expect } from 'vitest';
import { montarZip, lerZip, crc32 } from './zip';

const bytes = (t: string) => new TextEncoder().encode(t);
const texto = (b: Uint8Array) => new TextDecoder().decode(b);

describe('o CRC-32', () => {
  it('bate com os valores canônicos, que é como eu sei que está certo', () => {
    expect(crc32(bytes(''))).toBe(0);
    // Valor de verificação canônico de "123456789". Se este quebrar, o zip sai
    // corrompido e nenhum outro teste percebe.
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
    expect(crc32(bytes('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });

  it('devolve inteiro sem sinal', () => {
    // Sem o `>>> 0` no fim, o XOR final volta negativo e a comparação acima
    // falha com um número negativo. É o erro de uma linha mais comum aqui.
    expect(crc32(bytes('123456789'))).toBeGreaterThan(0);
  });
});

describe('montar o zip', () => {
  it('sai com a assinatura de arquivo local no começo', () => {
    const zip = montarZip([{ nome: 'a.txt', bytes: bytes('oi') }]);
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('termina com o fim do diretório central', () => {
    const zip = montarZip([{ nome: 'a.txt', bytes: bytes('oi') }]);
    expect(Array.from(zip.slice(zip.length - 22, zip.length - 18))).toEqual([
      0x50, 0x4b, 0x05, 0x06,
    ]);
  });

  it('conta as entradas no fim do diretório', () => {
    const zip = montarZip([
      { nome: 'a.txt', bytes: bytes('a') },
      { nome: 'b/c.txt', bytes: bytes('c') },
    ]);
    const visao = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(visao.getUint16(zip.length - 14, true)).toBe(2);
  });

  it('aguenta nome com acento, gravando UTF-8 e marcando a bandeira', () => {
    const zip = montarZip([{ nome: 'ação.txt', bytes: bytes('x') }]);
    const visao = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    // Bit 11 da bandeira de propósito geral diz "o nome é UTF-8". Sem ele o
    // Windows abre "aÃ§ão.txt".
    expect(visao.getUint16(6, true) & 0x0800).toBe(0x0800);
  });

  it('zip vazio ainda é um zip válido', () => {
    expect(Array.from(montarZip([]).slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});

describe('abrir o zip', () => {
  it('devolve o que montar guardou — a volta completa', () => {
    const entradas = [
      { nome: 'banco.json', bytes: bytes('{"versao":19}') },
      { nome: 'arquivos/a1/foto.png', bytes: new Uint8Array([0, 1, 2, 255]) },
      { nome: 'arquivos/a2/ação.txt', bytes: bytes('com acento') },
    ];

    const lidas = lerZip(montarZip(entradas));

    expect(lidas.map((e) => e.nome)).toEqual([
      'banco.json',
      'arquivos/a1/foto.png',
      'arquivos/a2/ação.txt',
    ]);
    expect(texto(lidas[0].bytes)).toBe('{"versao":19}');
    expect(Array.from(lidas[1].bytes)).toEqual([0, 1, 2, 255]);
    expect(texto(lidas[2].bytes)).toBe('com acento');
  });

  it('zip vazio devolve lista vazia, e não erro', () => {
    expect(lerZip(montarZip([]))).toEqual([]);
  });

  it('recusa o que não é zip, com mensagem que eu entendo', () => {
    expect(() => lerZip(bytes('isto é um json'))).toThrow(/não é um arquivo zip/);
  });

  it('recusa entrada comprimida, em vez de devolver lixo', () => {
    // Um zip feito por outra ferramenta usa deflate. Devolver os bytes
    // comprimidos como se fossem o arquivo é pior que recusar.
    const zip = montarZip([{ nome: 'a.txt', bytes: bytes('x') }]);
    const visao = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    visao.setUint16(8, 8, true); // método 8 = deflate, no cabeçalho local
    expect(() => lerZip(zip)).toThrow(/comprimid/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dominio/zip.test.ts`
Expected: FAIL — o módulo não existe.

- [ ] **Step 3: Implementar**

Crie `src/dominio/zip.ts` com três exportações.

**`crc32(bytes: Uint8Array): number`** — tabela de 256 entradas, polinômio
refletido `0xEDB88320`, e o resultado **terminando em `>>> 0`**. Sem isso o XOR
final devolve inteiro com sinal e o valor canônico não bate.

**`montarZip(entradas: { nome: string; bytes: Uint8Array }[]): Uint8Array`**,
com o leiaute (todos os inteiros *little-endian*):

| cabeçalho local, por entrada | deslocamento |
|---|---|
| assinatura `0x04034b50` | 0 |
| versão necessária, 20 | 4 |
| bandeira `0x0800` (nome em UTF-8) | 6 |
| método **0 — store** | 8 |
| hora e data, fixas | 10, 12 |
| CRC-32 | 14 |
| tamanho comprimido = tamanho cru | 18, 22 |
| tamanho do nome, tamanho do extra (0) | 26, 28 |
| o nome em UTF-8, depois os bytes | 30 |

Depois o diretório central (assinatura `0x02014b50`, uma entrada por arquivo
repetindo os campos e acrescentando o deslocamento do cabeçalho local) e o fim
do diretório central (`0x06054b50`, 22 bytes com comentário vazio: contagem em
+8 e +10, tamanho do diretório em +12, deslocamento em +16).

**`lerZip(zip: Uint8Array): { nome: string; bytes: Uint8Array }[]`** — ache o
fim do diretório central **varrendo de trás para frente** pela assinatura
`0x06054b50` (não assuma 22 bytes: um comentário no fim desloca tudo), percorra
o diretório central, e para cada entrada pule ao cabeçalho local e fatie depois
de `30 + tamanhoDoNome + tamanhoDoExtra` — **os comprimentos do cabeçalho local
e os do diretório central podem diferir**, e usar os errados corta o arquivo no
lugar errado. Lance com "não é um arquivo zip" quando não achar a assinatura, e
com "entrada comprimida" quando o método não for 0.

Data e hora fixas de propósito: a data verdadeira está dentro do `banco.json`, e
um carimbo variável tornaria o arquivo irreprodutível.

O comentário do módulo precisa dizer **por que à mão**: store não precisa de
deflate, o acervo já é JPEG e PDF que não comprimem de novo, e uma dependência
no caminho que carrega o backup de uma vida é uma dependência a mais para
auditar. Mesma decisão do PDF que sai da impressão do navegador.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dominio/zip.test.ts`
Expected: PASS.

- [ ] **Step 5: A prova contra um descompactador de verdade**

**Não pule.** Um zip que passa nos meus próprios testes e o Finder não abre é um
backup que mente — os testes e o código saíram da mesma cabeça e erram juntos.

```bash
cat > /tmp/prova-zip.mjs <<'EOF'
import { writeFileSync } from 'node:fs';
import { montarZip } from './src/dominio/zip.ts';
const t = (s) => new TextEncoder().encode(s);
writeFileSync('/tmp/prova.zip', montarZip([
  { nome: 'banco.json', bytes: t('{"versao":19}') },
  { nome: 'arquivos/a1/ação.txt', bytes: t('com acento') },
]));
EOF
node --experimental-strip-types --no-warnings /tmp/prova-zip.mjs
unzip -t /tmp/prova.zip && unzip -l /tmp/prova.zip
unzip -p /tmp/prova.zip 'arquivos/a1/ação.txt'
```

Expected: `No errors detected in compressed data`, as duas entradas listadas com
o acento correto, e `com acento` impresso. Abra-o também com dois cliques no
Finder.

- [ ] **Step 6: Commit**

```bash
git add src/dominio/zip.ts src/dominio/zip.test.ts
git commit -m "zip: montar e abrir à mão, sem uma dependência nova"
```

---

### Task 19: Exportar e importar o acervo inteiro

**A decisão de contrato, tomada aqui para ninguém ter que escolher no meio:**
`Repositorio.exportar(): Promise<string>` e `Repositorio.importar(json: string)`
**não mudam**. O zip é montado e aberto em `Ajustes.tsx`, que já é quem lida com
`Blob`, `download` e `<input type="file">`.

A alternativa — trocar o contrato para `Promise<Uint8Array>` — obrigaria a mexer
na interface, nas duas implementações (`RepositorioMemoria`,
`RepositorioLocal`), no espelho em `BancoContexto.tsx:127` e em todo teste que
compara a saída com uma string JSON. Tudo isso para mover três linhas de camada.
O repositório continua sendo sobre o banco; empacotar é assunto da tela.

**Files:**
- Modify: `src/telas/Ajustes.tsx`

- [ ] **Step 1: Exportar em zip**

`Ajustes.tsx:80` tem hoje um `baixar` que chama `exportar()` e salva um `.json`.
Ele passa a:

1. `const json = await exportar()` — inalterado
2. `JSON.parse(json).arquivos` dá a lista de fichas
3. para cada uma, `await lerArquivo(ficha.chave)` (a ação nova da Task 14)
4. `montarZip([{ nome: 'banco.json', bytes }, ...arquivos])`
5. salvar como `my-system-life-AAAA-MM-DD.zip`

- [ ] **Step 2: O progresso, com dono**

Um acervo de 300 MB leva minutos, e sem contador parece travado — eu fecho a aba
no meio e fico sem backup.

Estado no próprio `Ajustes`: `const [baixando, setBaixando] = useState<{feitos: number; total: number} | null>(null)`.
Enquanto não for `null`, o botão de exportar fica desabilitado e mostra
`ProgressBar` com `value={feitos / total * 100}` e `valueLabel={`${feitos} de ${total}`}`.
`ProgressBar` já tem `label` e `valueLabel`; não desenhe outro.

- [ ] **Step 3: O que faltou, num arquivo dentro do zip**

`lerArquivo` devolvendo `null` ou lançando **não aborta**. Junte num array e, se
não estiver vazio, acrescente ao zip uma entrada `arquivos-que-faltaram.txt`:

```
Estes arquivos estavam no banco e não vieram do acervo em
2026-09-24T18:30:00.000Z:

a1/foto.png — Depoimento da Kate
a7/contrato.pdf — Contrato Acttus

O banco.json ainda tem a ficha de cada um. Eles voltam sozinhos se o
arquivo reaparecer no acervo.
```

Uma linha por arquivo, `chave — título`. Backup parcial com a lista do que falta
é muito melhor que nenhum backup.

- [ ] **Step 4: Sem rede, exporte o JSON**

Exportar é justamente o que eu faço quando o aparelho vai mal. Se
`navigator.onLine` for falso, **ou** se a primeira leitura lançar
`ErroDaSincronia`, pare de tentar as outras, salve o `.json` puro como antes e
diga na tela: *"Sem conexão — salvei só os dados. Os arquivos ficaram de fora."*

Detectar pela primeira falha, e não só por `navigator.onLine`: ele mente em
Wi-Fi de hotel e em avião com portal.

- [ ] **Step 5: Importar os dois formatos**

`Ajustes.tsx:99` hoje é `setArquivoPendente(await arquivo.text())`, e `.text()`
**destrói o binário** antes de qualquer coisa poder farejá-lo. Passe a
`arrayBuffer()`.

Distinga pelos quatro primeiros bytes (`0x50 0x4b 0x03 0x04`), **e não pela
extensão** — qualquer download renomeia. JSON puro continua funcionando, e
precisa continuar: todo backup que eu já tenho é `.json`.

Com um zip: `lerZip`, ache `banco.json`, decodifique para texto, chame
`importar(texto)` como sempre, e então suba de volta cada `arquivos/<chave>`
pela ação de envio, chave por chave, com o mesmo contador do Step 2.

Se o zip não tiver `banco.json`, recuse com *"Este zip não tem um banco.json
dentro — não é um backup do MSL."* O `Modal` de erro já existe na tela.

- [ ] **Step 6: Conferir**

Run: `npm run verificar && npm run build && npm run test:e2e`

- [ ] **Step 7: A volta inteira, à mão**

**Não pule.** Exportar e importar é o único caminho entre os dois aparelhos, e
um caminho que ninguém andou não foi provado.

1. Suba dois arquivos no acervo
2. Exporte — confira que o `.zip` tem `banco.json` e as duas entradas
3. Apague um dos dois arquivos pela tela
4. Importe o zip
5. Confirme que o arquivo apagado voltou **e abre**
6. Importe um `.json` antigo e confirme que ele ainda entra

- [ ] **Step 8: Commit**

```bash
git add src/telas/Ajustes.tsx
git commit -m "backup: o arquivo que eu levo embora volta a ser tudo que eu tenho"
```

**Fim do Chunk 5.**

---

## Ao fim de tudo

- [ ] `npm run verificar && npm run build && npm run test:e2e` — verde
- [ ] `DECISOES.md` ganha a decisão do acervo: por que Vercel Blob, por que sem
      SDK e com a ressalva do contrato não público, por que a chave é prefixada
      pelo dono, por que `Content-Disposition: attachment` para o que não abre,
      e as **três** pioras declaradas (sem offline, órfão possível, e o acervo
      exigindo conta conectada quando o resto do MSL não exige)
- [ ] `AGENTS.md` ganha o que esta rodada aprendeu
- [ ] `MAPA.md` ganha os arquivos novos
- [ ] O `BLOB_READ_WRITE_TOKEN` está configurado na Vercel, e o `README.md` diz
      como criar o store

## O que este plano deliberadamente não faz

Cada um é uma escolha registrada, não um esquecimento:

- **Vídeo.** O teto de 10 MB o exclui. Vídeo exige envio em pedaços ou direto
  para o acervo, e isso é um plano próprio.
- **Acervo offline.** O `sw.js` poderia cachear o que já foi aberto. Não nesta
  rodada.
- **Limpeza de órfãos.** Um "procurar bytes sem ficha" em Ajustes, para o dia em
  que uma remoção tiver falhado.
- **Miniatura.** A grade mostra ícone, não prévia. Prévia de verdade quer
  miniatura gerada no envio, que é mais uma coluna e mais um caminho de falha.
- **Busca dentro do PDF.** Bonito, e é outro produto.
