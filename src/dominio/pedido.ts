import { VERSAO_ESQUEMA, COLECOES, type Banco } from '../dados/esquema';

/**
 * O compositor de pedido.
 *
 * Esta área **não conversa com modelo nenhum**. Ela monta um texto que eu colo
 * no Claude Code, onde a mudança acontece no código, com teste, e volta pelo
 * build. Não há chave de API no cliente, não há custo por uso, e não há
 * caminho para o sistema se reescrever sozinho sem revisão.
 *
 * O ponto delicado é o último bloco: quanto do meu dado entra no texto. Um
 * compositor que despeja o financeiro inteiro num prompt é um jeito confortável
 * de vazar sem perceber, então o nível é explícito e o padrão é o mais fechado.
 */

export type NivelDeDados = 'estrutura' | 'amostra' | 'completo';

export const ROTULO_NIVEL: Record<NivelDeDados, string> = {
  estrutura: 'Somente a estrutura',
  amostra: 'Amostra anonimizada',
  completo: 'Meus dados reais',
};

export const EXPLICACAO_NIVEL: Record<NivelDeDados, string> = {
  estrutura: 'Quantos registros existem e quais campos têm. Nenhum conteúdo meu.',
  amostra: 'Alguns registros com os textos substituídos. Datas e valores preservados.',
  completo: 'Tudo, exatamente como está guardado. Só use se for necessário.',
};

/** Os campos de cada coleção, sem nenhum valor. */
function camposDe(banco: Banco, colecao: string): string[] {
  const registros = (banco as unknown as Record<string, unknown[]>)[colecao] ?? [];
  const campos = new Set<string>();
  for (const r of registros) {
    for (const k of Object.keys(r as object)) campos.add(k);
  }
  return [...campos].sort();
}

/** Texto trocado por um marcador do mesmo tamanho aproximado. */
function anonimizar(valor: unknown, campo: string): unknown {
  if (typeof valor !== 'string') return valor;
  // Datas, identificadores e instantes não são conteúdo pessoal e são o que
  // torna a amostra útil para raciocinar sobre o formato.
  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor;
  if (campo === 'id' || campo.endsWith('Id') || campo === 'tipo' || campo === 'categoria') {
    return valor;
  }
  if (campo === 'contexto' || campo === 'icone') return valor;
  return `«${campo}»`;
}

function amostraDe(banco: Banco, colecao: string, quantos = 2): unknown[] {
  const registros = (banco as unknown as Record<string, unknown[]>)[colecao] ?? [];
  return registros.slice(0, quantos).map((r) => {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r as object)) saida[k] = anonimizar(v, k);
    return saida;
  });
}

export interface ContextoDoPedido {
  /** módulos que já existem, pelos nomes que aparecem na navegação */
  modulos: string[];
  /** quantos componentes a biblioteca tem, por grupo */
  componentes: Record<string, number>;
}

/**
 * Monta o texto do pedido.
 *
 * Tudo que o Claude Code precisa para não inventar componente, não inventar
 * valor de design e não esquecer a migração.
 */
export function montarPrompt(
  banco: Banco,
  descricao: string,
  nivel: NivelDeDados,
  contexto: ContextoDoPedido,
): string {
  const partes: string[] = [];

  partes.push('# Pedido para o My System Life');
  partes.push('');
  partes.push('## O que eu quero');
  partes.push('');
  partes.push(descricao.trim() || '(descreva aqui)');
  partes.push('');

  partes.push('## Regras deste projeto, que valem sempre');
  partes.push('');
  partes.push(
    '1. `DESIGN.md` na raiz é o contrato visual e a fonte de verdade dos tokens. Se o código discordar dele, o bug é do código. Mude o `DESIGN.md` antes de mudar um token.',
  );
  partes.push(
    '2. Componente novo nasce em `design-system/`, nunca ao lado da tela. Antes de propor um novo, prove pelos `.prompt.md` que nenhum dos existentes serve.',
  );
  partes.push(
    '3. Nenhuma cor, fonte, espaçamento ou raio escrito à mão. Sempre token: `var(--purple-500)`, `var(--sp-8)`, `var(--r-card)`. Faltando token, declare em `design-system/tokens/` e registre no `DESIGN.md`.',
  );
  partes.push("4. Importe do barrel: `import { Button } from '../design-system'`.");
  partes.push(
    '5. Não invente valor de design. Onde o `DESIGN.md` diz que algo não existe, isso é um achado, não uma lacuna para preencher.',
  );
  partes.push(
    '6. A interface e o domínio são em pt-BR; a API da biblioteca fica em inglês. Data, hora, moeda e ordenação passam por `src/formato`, nunca por `Intl` direto na tela.',
  );
  partes.push(
    '7. Dinheiro é inteiro em centavos, nunca ponto flutuante. Situação (atrasada, concluída) é derivada, nunca guardada.',
  );
  partes.push(
    '8. Lógica de domínio é testada em Vitest **antes** da tela. Mudança de formato sobe `VERSAO_ESQUEMA` e ganha migração aditiva em `src/dados/migracoes.ts`.',
  );
  partes.push('');

  partes.push('## O que já existe');
  partes.push('');
  partes.push(`Módulos: ${contexto.modulos.join(', ')}.`);
  partes.push('');
  partes.push(
    `Biblioteca: ${Object.entries(contexto.componentes)
      .map(([grupo, n]) => `${grupo} (${n})`)
      .join(', ')}. Cada componente tem um \`.prompt.md\` ao lado dizendo quando usar.`,
  );
  partes.push('');
  partes.push(
    `Esquema de dados na versão ${VERSAO_ESQUEMA}, definido em \`src/dados/esquema.ts\` — ` +
      'leia esse arquivo para os tipos completos. As coleções, e o que há hoje em cada uma:',
  );
  partes.push('');
  for (const colecao of COLECOES) {
    const registros = (banco as unknown as Record<string, unknown[]>)[colecao] ?? [];
    const campos = camposDe(banco, colecao);
    partes.push(
      `- \`${colecao}\` — ${registros.length} ${registros.length === 1 ? 'registro' : 'registros'}` +
        (campos.length > 0 ? `, campos: ${campos.join(', ')}` : ''),
    );
  }
  partes.push('');

  partes.push('## Os meus dados');
  partes.push('');
  partes.push(`Nível escolhido: **${ROTULO_NIVEL[nivel]}**. ${EXPLICACAO_NIVEL[nivel]}`);
  partes.push('');

  if (nivel === 'estrutura') {
    partes.push('Nenhum conteúdo meu foi incluído — só as contagens e os campos acima.');
  } else if (nivel === 'amostra') {
    partes.push('```json');
    const amostra: Record<string, unknown> = { versao: banco.versao };
    for (const colecao of COLECOES) amostra[colecao] = amostraDe(banco, colecao);
    partes.push(JSON.stringify(amostra, null, 2));
    partes.push('```');
  } else {
    partes.push('```json');
    partes.push(JSON.stringify(banco, null, 2));
    partes.push('```');
  }
  partes.push('');

  partes.push('## Como entregar');
  partes.push('');
  partes.push(
    'Domínio testado antes da tela. Migração escrita antes de existir dado para migrar. `npm run verificar && npm run build` verde, e `npm run test:e2e` se tocar numa superfície. Commit pequeno, mensagem em português.',
  );

  return partes.join('\n');
}

/**
 * Todo texto que o usuário escreveu e que está guardado no banco.
 *
 * Existe para o teste: é contra esta lista que se verifica que o nível
 * "somente a estrutura" não vazou nada.
 */
export function textosDoUsuario(banco: Banco): string[] {
  const textos: string[] = [];
  const campos = ['titulo', 'descricao', 'anotacao'];
  for (const colecao of COLECOES) {
    const registros = (banco as unknown as Record<string, unknown[]>)[colecao] ?? [];
    for (const r of registros) {
      for (const campo of campos) {
        const v = (r as Record<string, unknown>)[campo];
        if (typeof v === 'string' && v.trim() !== '') textos.push(v);
      }
    }
  }
  return textos;
}
