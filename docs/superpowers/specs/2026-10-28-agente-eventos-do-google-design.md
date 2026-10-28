# O agente mexendo em evento do Google — o desenho

Data: 2026-10-28. Esquema na versão 18; este trabalho **não** sobe a versão.

## O pedido

Que o agente possa apagar, mover e renomear compromissos que **nasceram no
Google** — e não só os que o MSL criou.

Isto é a segunda de três frentes em que o pedido maior ("deixar o agente mais
maleável") foi partido:

| | frente | estado |
|---|---|---|
| A | editar o que o MSL criou | feito em `d7241c9` |
| **B** | **agir sobre eventos nascidos no Google** | **este documento** |
| C | convidados nos compromissos | não começou |

## A regra que este trabalho quebra

`src/dominio/google.ts` diz hoje, no alto do arquivo:

> Evento **sem** a marca é do Google. O MSL mostra e não toca.

Essa frase deixa de ser verdade. O que a substitui não é "o MSL toca em tudo",
e sim: **o espelho continua intocável de fora, e existe uma porta separada,
com nome, para agir sobre o que não é nosso.** A diferença importa porque é ela
que mantém `planejar()` legível — a função que decide o espelho nunca precisa
saber que essa porta existe.

## As duas decisões que estavam em aberto

**Convidado.** Quando o evento é de outra pessoa e eu só fui convidado, apagar
tira **só da minha agenda**, sem avisar ninguém. Não recusa o convite, não
manda e-mail. Escolhido sabendo que o organizador continua achando que eu vou —
e que ele pode ver no calendário dele que eu saí, ainda que nenhum e-mail saia.

**Séries.** Apagar atinge **só a ocorrência**, nunca a série. Matar uma reunião
semanal inteira fica fora do alcance do agente, e continua sendo coisa de fazer
no Google.

A segunda sai de graça: a listagem já pede `singleEvents: 'true'`
(`src/servidor/google.ts:345`), então cada ocorrência chega com id próprio, e
agir por esse id atinge só ela. Nenhuma linha a mais.

## O que já existe e quase serve

- `EventoParaTela` já tem `uid` e `serie`. O `EventoExterno` do iCal também tem
  `uid`. Os ids **já chegam ao cliente**.
- `responder()` já recebe `compromissos: readonly CompromissoExterno[]`.
- `umaTarefa()` já olha os compromissos para recusar com honestidade — a recusa
  construída em `d7241c9` é o lugar exato onde este trabalho entra.

O que falta é só o id chegar até o agente: `CompromissoExterno` foi desenhado
como o mínimo que a resposta usava, e por isso não carrega `uid`. O agente
consegue falar sobre o evento e não consegue apontar para ele.

## A arquitetura

| caminho | por que não |
|---|---|
| fila local no banco, aplicada na sincronia | suja a pureza de `planejar()`, exige migração, e o comando só aconteceria na próxima rodada — você confirma e nada visível ocorre |
| pendurar `ordens: []` na chamada de sincronizar | sem rota nova e sem esquema novo, mas junta duas coisas diferentes numa chamada e herda o mesmo atraso |

**Escolhido: rota própria, ação imediata.** O comando é do dono, síncrono por
natureza e com consequência fora do aparelho: ao confirmar, espera-se que esteja
feito, e falhando é preciso ver o erro agora. Offline não é perda — a verdade
desse evento mora no Google, e agir sobre ele sem rede não quer dizer nada.

## Os contratos

### O que o agente enxerga

```ts
export interface CompromissoExterno {
  titulo: string;
  dia: string;
  hora?: string;
  diaInteiro: boolean;
  /** id do evento no Google; é por ele que a rota age */
  uid?: string;
  /** só com o Google conectado dá para mexer; a assinatura iCal é só leitura */
  mexivel?: boolean;
  /** organizo, ou fui convidado? muda o tamanho do estrago */
  souOrganizador?: boolean;
}
```

Os três campos são opcionais porque o tipo serve às duas fontes: o iCal preenche
só o `uid`, e `mexivel` ausente quer dizer não.

Quem preenche é `Agente.tsx`, no mesmo lugar onde hoje escolhe entre o Google e
a assinatura (`google.conectado ? google.eventos : assinatura...`): o ramo do
Google marca `mexivel: true`, o da assinatura não marca nada. A escolha fica
onde a origem é conhecida, e o domínio nunca precisa saber de onde veio.

### A rota

`POST /api/google-evento`, recebendo `{ acao, uid, ... }`:

| ação | no Google |
|---|---|
| `apagar` | `DELETE .../events/{uid}?sendUpdates=none` |
| `mover` | `PATCH` trocando `start`/`end`, **preservando a duração** |
| `renomear` | `PATCH` trocando `summary` |

`sendUpdates=none` nas três. É a decisão sobre convidados escrita num parâmetro
só, no lugar onde dá para prová-la.

Mover preserva a duração: o evento vai para o horário novo mantendo quantos
minutos tinha. Mandar só o `start` deixaria o `end` no lugar antigo, e uma
reunião de uma hora empurrada para depois do próprio fim é um evento inválido —
o Google aceita e a agenda fica errada. O cálculo cabe no domínio puro, ao lado
de `somarMinutos()`, que já existe.

Para saber quem organiza, a listagem passa a pedir `organizer`, e
`organizer.self === true` responde. Sem isso a prévia não consegue distinguir
"cancelar atinge cinco pessoas" de "sai só da sua agenda".

## A conversa

As frases não mudam: `cancela a reunião de equipe` já é entendida hoje. Muda o
que acontece quando o alvo não é uma tarefa.

`umaTarefa()` vira `umAlvo()`, com três saídas:

```ts
type Alvo =
  | { tipo: 'tarefa'; tarefa: Tarefa }
  | { tipo: 'compromisso'; compromisso: CompromissoExterno }
  | { tipo: 'nada'; resposta: Resposta }
```

Nem todo comando faz sentido num evento do Google. **Concluir não** — evento
não se conclui, e um evento marcado como feito não existe do lado de lá. Pedir
para concluir um compromisso do Google recebe a recusa honesta, igual a hoje.
Apagar, mover e renomear são os três que passam.

Tarefa ganha de compromisso no empate por nome: o que o MSL criou é dele. Empate
real é raro, porque tarefa espelhada carrega a marca e por isso nem aparece na
lista de compromissos.

O efeito é um só, espelhando a rota:

```ts
| { tipo: 'evento-do-google'; uid: string; titulo: string; souOrganizador: boolean;
    acao:
      | { tipo: 'apagar' }
      | { tipo: 'mover'; dia: string; hora?: string }
      | { tipo: 'renomear'; novo: string } }
```

A prévia nomeia a consequência, e são dois textos:

- organizador → *"Você organiza isto. Apagar tira da agenda de todos os
  convidados."*, tom `ruim`
- convidado → *"Você é convidado. Isto sai só da sua agenda, e ninguém é
  avisado."*, tom `atencao`

O rótulo de confirmação é **"Apagar no Google"**, e nunca "Cancelar": o botão
que desiste já diz isso, e dois botões iguais lado a lado com efeitos opostos é
desenho que cobra caro no dia errado.

Quando `mexivel` é falso — quem usa só a assinatura iCal — a recusa construída
em `d7241c9` continua valendo, porque ali não existe caminho de escrita e
oferecer apagar seria prometer o que não há.

## Os erros

Este é o primeiro efeito do agente que depende de rede. Todos os outros escrevem
no banco local, e por isso a tela **assume sucesso** e escreve "Feito". Isso
passa a ser uma mentira possível, e a tela ganha um estado de falha.

| caso | o que o sistema diz |
|---|---|
| rota falhou, sem rede | "Não consegui falar com o Google. Nada mudou lá." |
| `404` — já não existe | "Esse evento já não está mais na sua agenda." |
| `403` — sem permissão | "O Google recusou: você não pode mexer nesse evento." |
| token expirado | cai no caminho de "não conectado", que já existe |

Depois de agir, o cache local de eventos fica velho e o calendário mostraria o
que não existe mais. A ação limpa o cache, como `Ajustes` já faz ao trocar a
assinatura.

## Os testes

O domínio continua puro — `responder()` recebe os compromissos e devolve o
efeito, sem rede. Dá para provar sem tocar no Google:

- organizador e convidado produzem prévias diferentes, cada uma nomeando a
  consequência certa
- `mexivel: false` mantém a recusa
- tarefa ganha de compromisso quando o nome casa nos dois
- o rótulo de confirmação nunca é "Cancelar"
- a rota, contra um Google falso, como `rotasGoogle.test.ts` já faz
- a tela mostra a falha em vez de "Feito" quando a rota recusa

## O que fica de fora

- **Convidados** (frente C): continua pendente e não é tocada aqui.
- **Apagar a série inteira**: decisão tomada, fica no Google.
- **Recusar convite**: decisão tomada, nada sai para terceiros.
- **Migração**: nada novo é guardado, o esquema segue na 18.
