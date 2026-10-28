# O agente mexendo em evento do Google — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o agente apagar, mover e renomear compromissos que nasceram no Google, com a prévia dizendo o tamanho da consequência.

**Architecture:** Uma rota nova (`POST /api/google-evento`) age sobre um evento por id, separada da sincronia — `planejar()` continua significando só "o que é meu". O domínio segue puro: `responder()` devolve um efeito, e a tela executa.

**Tech Stack:** TypeScript 5.9, React 19, Vitest, Google Calendar API v3.

**Spec:** `docs/superpowers/specs/2026-10-28-agente-eventos-do-google-design.md`

## Global Constraints

- `sendUpdates=none` em **toda** chamada de escrita ao Google. Nada sai para terceiros.
- Agir sempre pelo id da **ocorrência**, nunca por `recurringEventId`. A série é intocável.
- Esquema fica na versão 18. Nenhuma migração.
- Concluir **não** atravessa para o Google: só apagar, mover e renomear.
- O rótulo de confirmação nunca é a palavra "Cancelar" — o botão que desiste já é esse.
- Comandos do repositório: `npx vitest run <arquivo>`, `npm run typecheck`, `npm run lint`.
- Commits em prosa minúscula em português, explicando o porquê.

## Review Focus

1. **Evento de dia inteiro movido para um horário** — `start.date` precisa virar `start.dateTime`; mandar os dois, ou o campo errado, o Google recusa. Teste na Task 2.
2. **Dois compromissos do Google com o mesmo nome na janela** — tem de perguntar qual, como `umaTarefa` já faz para tarefas, e não escolher sozinho. Teste na Task 4.
3. **`mexivel` verdadeiro sem `uid`** — dado impossível que um bug de montagem produziria; o efeito não pode ser emitido sem id. Teste na Task 5.
4. **Evento já apagado noutro aparelho (`404`)** — não é erro do dono; a tela diz que já não existe, e não "falhou". Teste na Task 6.
5. **Mover para fora da janela sincronizada** — o evento some da lista depois de mexido; a ação ainda tem de valer, e o cache tem de ser limpo. Teste na Task 6.

---

### Task 1: O organizador chega até a tela

**Files:**
- Modify: `src/dominio/google.ts` (`EventoDoGoogle`, `EventoParaTela`, `paraTela`)
- Modify: `src/servidor/google.ts:341-346` (campos pedidos na listagem)
- Test: `src/dominio/google.test.ts`

**Interfaces:**
- Produces: `EventoDoGoogle.organizer?: { self?: boolean; email?: string }`; `EventoParaTela.souOrganizador: boolean`

- [ ] **Step 1: Write the failing tests**

```ts
it('organizer.self verdadeiro vira souOrganizador', () => {
  const [e] = paraTela([evento({ organizer: { self: true } })], JANELA, OPCOES);
  expect(e.souOrganizador).toBe(true);
});

it('sem organizer, assume que não sou — o estrago menor', () => {
  const [e] = paraTela([evento({})], JANELA, OPCOES);
  expect(e.souOrganizador).toBe(false);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/dominio/google.test.ts`. Esperado: `souOrganizador` não existe.

- [ ] **Step 3: Implementar** — campo `organizer` em `EventoDoGoogle`, `souOrganizador: boolean` em `EventoParaTela`, preenchido por `paraTela` como `evento.organizer?.self === true`. Em `src/servidor/google.ts`, acrescentar `organizer` aos campos pedidos ao Google.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando, mais `npm run typecheck`.

- [ ] **Step 5: Commit** — `o evento do Google passa a dizer quem organiza`

---

### Task 2: Mover preservando a duração

**Files:**
- Modify: `src/dominio/google.ts` (ao lado de `somarMinutos`)
- Test: `src/dominio/google.test.ts`

**Interfaces:**
- Produces: `export function corpoDoMover(evento: EventoDoGoogle, dia: string, hora: string | undefined, fuso: string): Pick<CorpoDoEvento, 'start' | 'end'>`

- [ ] **Step 1: Write the failing tests**

```ts
it('mantém os minutos que o evento tinha', () => {
  const e = evento({ start: { dateTime: '2026-10-29T14:00:00Z' }, end: { dateTime: '2026-10-29T15:30:00Z' } });
  const c = corpoDoMover(e, '2026-11-02', '09:00', FUSO);
  expect(c.start.dateTime).toContain('2026-11-02T09:00');
  expect(c.end.dateTime).toContain('2026-11-02T10:30');
});

it('evento de dia inteiro que ganha hora deixa de ser de dia inteiro', () => {
  const e = evento({ start: { date: '2026-10-29' }, end: { date: '2026-10-30' } });
  const c = corpoDoMover(e, '2026-11-02', '09:00', FUSO);
  expect(c.start.date).toBeUndefined();
  expect(c.start.dateTime).toContain('2026-11-02T09:00');
  expect(c.end.dateTime).toContain(`2026-11-02T${somarMinutos('09:00', MINUTOS_PADRAO)}`);
});

it('sem hora, continua de dia inteiro no dia novo', () => {
  const e = evento({ start: { date: '2026-10-29' }, end: { date: '2026-10-30' } });
  const c = corpoDoMover(e, '2026-11-02', undefined, FUSO);
  expect(c.start.date).toBe('2026-11-02');
  expect(c.start.dateTime).toBeUndefined();
});
```

- [ ] **Step 2: Rodar e ver falhar** — `corpoDoMover` não existe.

- [ ] **Step 3: Implementar `corpoDoMover`** — duração vem de `end - start` quando ambos são `dateTime`; quando o evento era de dia inteiro e ganha hora, usa `MINUTOS_PADRAO`, que já existe. Nunca devolve `date` e `dateTime` juntos no mesmo lado: o Google recusa.

- [ ] **Step 4: Rodar e ver passar.**

- [ ] **Step 5: Commit** — `mover evento do Google preserva a duração que ele tinha`

---

### Task 3: A rota que age sobre um evento

**Files:**
- Modify: `src/servidor/google.ts` (chamadas à API)
- Modify: `src/servidor/rotasGoogle.ts` (`rotaGoogleEvento`)
- Create: `api/google-evento.ts`
- Test: `src/servidor/rotasGoogle.test.ts`

**Interfaces:**
- Consumes: `corpoDoMover` (Task 2)
- Produces: `rotaGoogleEvento(pedido: Request, armazem: Armazem): Promise<Response>`; corpo `{ acao: 'apagar' | 'mover' | 'renomear'; uid: string; dia?: string; hora?: string; novo?: string }`; resposta `{ feito: true } | { feito: false; motivo: 'inexistente' | 'sem-permissao' | 'desconectado' }`

- [ ] **Step 1: Write the failing tests**

```ts
it('apagar manda DELETE com sendUpdates=none', async () => { /* Google falso registra a chamada */ });
it('404 do Google vira motivo "inexistente", e não erro', async () => { /* feito: false, motivo: 'inexistente' */ });
it('403 do Google vira motivo "sem-permissao"', async () => {});
it('renomear manda PATCH só com summary', async () => {});
it('sem sessão, recusa antes de falar com o Google', async () => {});
it('nunca manda recurringEventId — a série é intocável', async () => {
  // a url chamada contém o id da ocorrência, nunca o da série
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/servidor/rotasGoogle.test.ts`.

- [ ] **Step 3: Implementar** — `rotaGoogleEvento` seguindo o molde de `rotaGoogleSincronizar` (proteção de sessão, token do armazém). `api/google-evento.ts` é só o invólucro, igual a `api/google-desconectar.ts`. `404` e `403` são respostas de negócio, não exceções.

- [ ] **Step 4: Rodar e ver passar**, mais `npm run typecheck` e `npm run lint`.

- [ ] **Step 5: Commit** — `a rota que mexe num evento que não é nosso`

---

### Task 4: `umAlvo` — três saídas em vez de duas

**Files:**
- Modify: `src/dominio/agente.ts` (`CompromissoExterno`, `umaTarefa` → `umAlvo`, os quatro chamadores)
- Test: `src/dominio/agente.test.ts`

**Interfaces:**
- Produces: `CompromissoExterno` com `uid?: string`, `mexivel?: boolean`, `souOrganizador?: boolean`; `type Alvo = { tipo: 'tarefa'; tarefa: Tarefa } | { tipo: 'compromisso'; compromisso: CompromissoExterno } | { tipo: 'nada'; resposta: Resposta }`

- [ ] **Step 1: Write the failing tests**

```ts
it('tarefa ganha de compromisso quando o nome casa nos dois', () => {});
it('dois compromissos do Google com o mesmo nome perguntam qual', () => {
  // dois CompromissoExterno mexíveis com 'Reunião' → resposta 'Qual delas?', sem efeito
});
it('compromisso não mexível mantém a recusa honesta de d7241c9', () => {
  // mexivel ausente → título 'Essa é do Google'
});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar** — `umAlvo` devolve `tarefa` quando `acharTarefas` acha uma; senão procura em `compromissos`; empate entre compromissos devolve `nada` com a pergunta, no mesmo formato que o empate entre tarefas. Os quatro chamadores (concluir, adiar, excluir, editar) passam a destrinchar as três saídas; nesta task todos tratam `compromisso` como a recusa de hoje, e a Task 5 abre as três ações.

- [ ] **Step 4: Rodar a suíte inteira** — `npx vitest run`. Os 979 testes continuam verdes.

- [ ] **Step 5: Commit** — `o alvo de um comando pode ser uma tarefa ou um compromisso`

---

### Task 5: O efeito e as duas prévias

**Files:**
- Modify: `src/dominio/agente.ts` (`Efeito`, `exigeConfirmacao`, `rotuloDaConfirmacao`, casos de `responder`)
- Test: `src/dominio/agente.test.ts`

**Interfaces:**
- Consumes: `Alvo` (Task 4)
- Produces: efeito `{ tipo: 'evento-do-google'; uid: string; titulo: string; souOrganizador: boolean; acao: { tipo: 'apagar' } | { tipo: 'mover'; dia: string; hora?: string } | { tipo: 'renomear'; novo: string } }`

- [ ] **Step 1: Write the failing tests**

```ts
it('organizador: a prévia diz que atinge os convidados', () => {
  // texto contém 'todos os convidados', tom 'ruim'
});
it('convidado: a prévia diz que sai só da minha agenda', () => {
  // texto contém 'só da sua agenda', tom 'atencao'
});
it('o rótulo de confirmação nunca é "Cancelar"', () => {
  expect(rotuloDaConfirmacao(efeitoDeEvento())).not.toBe('Cancelar');
});
it('concluir não atravessa para o Google — recusa', () => {});
it('mexivel sem uid não emite efeito nenhum', () => {});
it('adiar um compromisso do Google vira mover, com dia e hora', () => {});
it('renomear um compromisso do Google leva o título novo', () => {});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar** — nos casos `excluir-tarefa`, `adiar-tarefa` e `editar-tarefa` de `responder`, a saída `compromisso` passa a produzir o efeito novo. `concluir-tarefa` continua recusando. `exigeConfirmacao` devolve `true`; `rotuloDaConfirmacao` devolve `'Apagar no Google'` para apagar e `'Salvar no Google'` para as outras duas. `editar-tarefa` com mudança de anotação ou projeto num compromisso recusa: não existe do lado de lá.

- [ ] **Step 4: Rodar a suíte inteira.**

- [ ] **Step 5: Commit** — `o agente passa a oferecer ação sobre evento do Google`

---

### Task 6: A tela executa, e mostra a falha

**Files:**
- Modify: `src/dados/google.ts` (`useGoogle` ganha a ação; limpar cache)
- Modify: `src/telas/Agente.tsx` (preencher `CompromissoExterno`; aplicar o efeito; estado de falha)
- Test: `src/dados/google.test.ts`, `src/telas/Agente.test.tsx`

**Interfaces:**
- Consumes: rota da Task 3; efeito da Task 5
- Produces: `Google.mexerNoEvento(acao): Promise<{ feito: boolean; motivo?: string }>`

- [ ] **Step 1: Write the failing tests**

```ts
it('o ramo do Google marca mexivel; o da assinatura não', () => {});
it('rota recusando não escreve "Feito" — mostra o motivo', () => {});
it('404 diz que o evento já não existe, e não que falhou', () => {});
it('depois de mexer, o cache de eventos é limpo', () => {});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar** — em `Agente.tsx`, onde hoje escolhe entre `google.eventos` e `assinatura.agenda.eventos`, o ramo do Google acrescenta `uid`, `mexivel: true` e `souOrganizador`. `aplicar()` ganha o caso `evento-do-google`, que chama `mexerNoEvento` e **devolve o resultado**; o estado do turno passa a distinguir falha de sucesso, com as quatro frases da tabela de erros da spec. Depois de qualquer ação bem-sucedida, `limparCache(window.localStorage)`.

- [ ] **Step 4: Rodar a suíte inteira**, mais `npm run typecheck` e `npm run lint`.

- [ ] **Step 5: Commit** — `a tela mexe no evento e para de prometer sucesso que não houve`

---

### Task 7: A regra de posse reescrita, e a ajuda

**Files:**
- Modify: `src/dominio/google.ts` (comentário do topo)
- Modify: `src/dominio/agente.ts` (caso `ajuda`)
- Modify: `docs/google-agenda.md`
- Test: `src/dominio/agente.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('a ajuda cita mexer em compromisso do Google', () => {
  const r = responder(bancoVazio(), { tipo: 'ajuda' }, HOJE);
  expect(JSON.stringify(r.blocos)).toContain('Google');
});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Escrever** — o comentário de `google.ts` deixa de dizer "o MSL mostra e não toca" e passa a descrever a porta separada e o que ela não faz (não avisa ninguém, não mexe em série). A ajuda ganha os comandos novos e a frase sobre o que acontece quando você organiza. `docs/google-agenda.md` ganha uma seção curta sobre o que o agente agora consegue mexer lá.

- [ ] **Step 4: Rodar a suíte inteira.**

- [ ] **Step 5: Commit** — `a regra de posse muda de redação, e a ajuda conta`
