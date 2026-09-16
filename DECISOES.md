# DECISÕES — as sete que travam a FASE 3

FASE 2. Nenhum código de produção. Cada item traz **uma recomendação**, não um
leque. Onde há evidência verificada, ela está citada.

Quatro decisões são suas, do prompt original. Três saíram do `MAPA.md`.

---

## Antes de tudo: a restrição de preservação

Você disse: *"tente não tirar a questão das skills e os MD já criados, mantendo
o banco de dados e png que já foram criadas, o visual criado em si."*

Isso reescreve a FASE 3 e, na minha leitura, **para melhor**. A FASE 3 deixa de
ser remoção e passa a ser adição. Nada sai da biblioteca:

| Item | Plano anterior | Plano com a sua restrição |
| --- | --- | --- |
| `design-system/SKILL.md` | manter | **manter** |
| `DESIGN.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `MAPA.md` | atualizar | **atualizar, nunca sobrescrever** |
| Os 34 `.prompt.md` | manter | **manter** |
| `design-system/README.md` | atualizar | **atualizar** |
| `promo-rocket.png`, `promo-logistics-collage.png` | apagar | **ficam** |
| `PromoCard`, `PromoBanner` | aposentar | **ficam na biblioteca** |
| `CarrierRow` | aposentar ou generalizar | **fica na biblioteca** |
| `patterns/data.ts` | esvaziar | **fica intacto** |
| `patterns/desktop/`, `patterns/mobile/` | apagar telas de logística | **ficam** |
| `design-system/reference/` | manter | **manter** |

**O que muda, então?** Só isto: o **produto** deixa de renderizar logística. A
rota `/app` passa a servir o meu domínio; as telas de logística continuam
existindo, vivas e funcionando, alcançáveis pelo `/design-system` na aba
Patterns — que é exatamente o que elas são hoje: demonstração da biblioteca.

Isso é mais conservador e mais barato que o plano anterior, e preserva o
artefato da reconstrução inteiro. Adoto.

> **Uma pergunta honesta: o que é "o banco de dados"?**
> Não existe banco de dados neste projeto — sem Supabase, sem SQLite, sem
> IndexedDB, nada. Minha leitura mais provável é que você se refere a
> **`design-system/patterns/data.ts`**, o arquivo com os dados de demonstração
> (pedidos, transportadoras, automações, conversas, séries dos gráficos). Na
> dúvida adotei a leitura conservadora e **ele fica intacto**. Se você quis
> dizer outra coisa, me corrija que eu ajusto.

---

## (a) Até onde vai o "tudo em PT-BR"

### Recomendação: sua inclinação está certa. Traduzir (i) e (ii), manter (iii) em inglês.

E agora eu tenho o argumento técnico que faltava, medido no repositório.

**49 dos 52 seletores do `adherence.rules.json` citam nome de componente e nome
de prop, em inglês.** São 34 componentes com regra de prop declarada, no
formato:

```
JSXOpeningElement[name.name='Avatar'] > JSXAttribute >
  JSXIdentifier[name!=/^(?:name|src|size|status|ring|style|…)$/]
```

Se `Button` virar `Botao` e `variant` virar `variante`, essas 49 regras **não
quebram — elas emudecem.** Um seletor que não casa com nada não falha: passa.
O `npm run lint` continuaria verde enquanto deixaria de proteger exatamente o
que foi construído para proteger. É o pior modo de falha possível, porque é
invisível.

O alcance completo da tradução da camada (iii), para você medir o custo:

| Artefato | O que aconteceria |
| --- | --- |
| `adherence.rules.json` | 49 dos 52 seletores reescritos à mão |
| `DESIGN.md` | O vocabulário do contrato inteiro |
| `design-system/reference/` | 27 páginas estáticas preservadas que citam os nomes |
| `reference/_ds_bundle.js` | Artefato **compilado** com os nomes antigos — só recompilando, e o compilador não existe aqui |
| `adherence-metadata.json` | A fonte de onde as 52 regras foram geradas |
| Os 34 `.prompt.md` | Todos os exemplos de uso |
| `SKILL.md` | A skill que usa o sistema fora do projeto |

O `_ds_bundle.js` sozinho já decide: é um artefato de build sem código-fonte
neste repositório. Traduzir a camada (iii) **quebraria as páginas de
referência de forma irreparável** — e você acabou de pedir para preservá-las.

**O que fica em inglês:** exatamente a API da biblioteca — nomes de componente,
nomes de prop, valores de prop (`variant="primary"`), nomes de token
(`--purple-500`, `--sp-8`). É uma biblioteca; bibliotecas têm API em inglês, e
essa aqui é lida por ferramenta automatizada.

**O que fica em português:** absolutamente todo o resto. A interface inteira, o
domínio inteiro, nomes de arquivo, de variável, de função, de tipo, de rota, e
as mensagens de commit.

**Ponte:** um glossário PT-BR ao lado do `DESIGN.md`, mapeando o vocabulário do
contrato para o meu — *surface* → superfície, *hairline* → fio, *ink ramp* →
rampa de tinta, *glow* → brilho. Assim eu leio o contrato em português sem que
uma linha do código mude.

### O "PT-BR" que se esquece — e que hoje não existe

Medido: **nenhum destes existe no projeto hoje.**

| Item | Estado | Proposta |
| --- | --- | --- |
| `lang` | `index.html` diz `lang="en"` | `lang="pt-BR"` |
| Data e hora | Zero uso de `Intl` no código | `Intl.DateTimeFormat('pt-BR')`, 24h, "3 de jan. de 2026" |
| Moeda | Zero formatação | `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` → `R$ 1.234,56` |
| Primeiro dia da semana | Não há calendário ainda | **Domingo** — é o padrão brasileiro e o de `Intl` em pt-BR |
| Ordenação com acento | Zero `localeCompare` | `Intl.Collator('pt-BR')`, para "Ágata" vir antes de "Alberto" |
| Fuso | Não tratado | `America/Sao_Paulo`, com o horário guardado em UTC |

Isto vira um módulo `src/formato/` com funções testadas — e é, não por acaso, o
primeiro candidato natural a teste de domínio em Vitest.

---

## (b) Dois aparelhos sem backend

### Recomendação: o requisito, como você o formulou, exige um backend. Não dá para contornar com honestidade.

Você pediu para eu não contornar com promessa de "sincronizar depois". Não vou.
Pesquisei as quatro saídas e **uma delas está tecnicamente morta no iPhone**.

Antes das opções, dois fatos verificados que mudam o terreno:

> **Fato 1 — o Safari apaga armazenamento local depois de 7 dias.**
> O ITP deleta todo armazenamento gravável por script — `localStorage`,
> `IndexedDB`, `sessionStorage`, registros de service worker — após sete dias
> de uso do Safari sem interação no site. E, segundo a MDN, a proteção
> `navigator.storage.persist()` **só vale contra despejo por pressão de
> armazenamento, não contra esse despejo proativo**.
>
> **Exceção decisiva:** aplicativos adicionados à tela de início **não fazem
> parte do Safari** e têm contador próprio de dias de uso. No iOS 26, todo site
> adicionado à tela de início já abre como web app por padrão.

> **Fato 2 — a File System Access API não existe no Safari.**
> `showSaveFilePicker`, `showOpenFilePicker` e `showDirectoryPicker` não são
> suportados no Safari em macOS, iPadOS ou iOS. Só existe o OPFS (Origin
> Private File System), que é privado à origem e **invisível ao iCloud Drive**.

### As quatro saídas, com custo real

| # | Saída | Custo | Risco | Atende? |
| --- | --- | --- | --- | --- |
| 1 | Servir de um lugar só; dado no navegador de cada aparelho | zero | **Dois sistemas separados com a mesma cara.** A tarefa do Mac não existe no telefone. Sem instalar na tela de início, o dado do iPhone evapora em 7 dias | **Não** |
| 2 | Exportar/importar arquivo à mão | baixo — e você quer exportação de qualquer jeito | Funciona, mas é *sneakernet*, não sincronização. Dois aparelhos em uso diário divergem em dias e a fusão é manual. Esquecer de exportar = perder trabalho | **Não** |
| 3 | Sincronizar por arquivo no iCloud Drive | — | **Tecnicamente impossível no iPhone.** O app web não consegue ler nem escrever um arquivo escolhido pelo usuário de forma contínua. Precisaria de invólucro nativo | **Morta** |
| 4 | Backend mínimo | alto — servidor, HTTPS, autenticação, e o dado passa a morar em algum lugar | Resolve sincronização, resolve o despejo de 7 dias, resolve o acesso do iPhone | **Sim** |

A opção 3 morre no Fato 2. A opção 2 sobrevive só como **backup**, que é outra
coisa — e que eu recomendo ter de qualquer forma, desde o primeiro pilar, como
você já pediu.

### O que eu recomendo, concretamente

**Backend, e a costura desenhada desde o primeiro pilar** — não "depois".

O que quero dizer por "costura desenhada": todo pilar da FASE 4 fala com um
`Repositorio` (interface), nunca com `localStorage` direto. A primeira
implementação é `RepositorioLocal` sobre IndexedDB. A segunda é
`RepositorioRemoto`. Trocar não é reescrever — é ligar outra implementação
atrás da mesma interface, com os testes de domínio inalterados porque eles
testam a lógica, não o armazenamento.

Isso **não é** a promessa de "sincronizar depois" que você recusou. A diferença:
a promessa vaga não muda o código hoje; a costura muda o código hoje, é testável
hoje, e torna o backend uma ligação em vez de uma reforma.

**Enquanto o backend não existe, três medidas obrigatórias:**

1. **Instalar na tela de início do iPhone desde o primeiro dia.** É a única
   defesa contra o despejo de 7 dias, e é gratuita.
2. **Exportação e importação de tudo, funcionando no primeiro pilar** — você já
   pediu, e agora ela também é a rede contra perda de dado.
3. **Um aviso na interface** quando o app não estiver rodando instalado, dizendo
   que o dado pode ser apagado pelo sistema.

**Qual backend, quando chegarmos lá** — três candidatos, na ordem que eu
recomendaria:

- **Supabase.** Você já usa no `acttus` (vi o diretório `supabase/` lá). Postgres
  gerenciado, autenticação pronta, camada gratuita generosa para um usuário.
  Familiaridade conta.
- **CouchDB + PouchDB.** É *a* arquitetura para offline-first com dois
  aparelhos: sincronização bidirecional com resolução de conflito embutida.
  Tecnicamente o melhor encaixe. Custa uma instância para operar.
- **Um serviço mínimo próprio.** Controle total, e todo o trabalho de
  autenticação e operação por sua conta.

**Não decido isso agora** e não preciso: a costura torna a escolha adiável sem
ser uma promessa vazia. Mas quero seu aval de que o caminho é esse, porque ele
contradiz o "só local, por enquanto" que você escreveu.

---

## (c) Como o iPhone alcança o aplicativo

### Recomendação: PWA instalado na tela de início, servido por HTTPS. Dev server na rede local só para desenvolver.

Hoje **o iPhone não alcança de forma nenhuma** — `vite.config.ts` não define
`server.host`, então o dev server só atende `localhost`.

Há uma restrição de plataforma que elimina o caminho mais óbvio:

> **Service worker exige contexto seguro** — HTTPS, `localhost` ou `127.0.0.1`.
> Um IP de rede local como `http://192.168.1.20:5173` **não é** contexto seguro.

Consequência: expor o dev server na rede local faz o app **abrir** no iPhone,
mas não instalar, não funcionar offline, e não escapar do despejo de 7 dias.
Serve para desenvolver e verificar layout — que é exatamente o que os portões
pedem — e não serve para uso diário.

**Os dois caminhos, com papéis distintos:**

| Caminho | Para quê | O que exige |
| --- | --- | --- |
| Dev server na rede local | Desenvolver e verificar no aparelho real | `server.host: true` no Vite, mesmo Wi-Fi |
| PWA instalado sobre HTTPS | **Uso diário** | Manifest, service worker, ícones, e uma origem HTTPS |

Para a origem HTTPS, sem backend ainda, as saídas baratas são: hospedagem
estática (Vercel/Netlify/Pages), ou **Tailscale**, que dá HTTPS numa rede
privada entre os seus aparelhos sem expor nada à internet — e que combina bem
com dado pessoal.

**O que precisa entrar no HTML e no CSS, e hoje não existe** (medido):

| Item | Estado | O que fazer |
| --- | --- | --- |
| `viewport-fit=cover` | ausente | acrescentar à meta viewport |
| `safe-area-inset` | **0 ocorrências no código** | respeitar notch e indicador inferior no shell mobile |
| Manifest | ausente | `manifest.webmanifest` + ícones |
| Service worker | ausente | cache do casco para abrir offline |
| Teclado virtual | não tratado | o composer no rodapé fica coberto |
| `--tap-min: 44px` | **existe e é usado em 9 lugares** | já resolvido pelo dump |

O último item merece crédito: a paridade mobile foi levada a sério na
reconstrução. A tabela vira um cartão por linha com **todas** as colunas como
campos rotulados, nenhuma descartada. Isso é patrimônio e não se toca.

---

## (d) A área de "pedir para a IA"

### Recomendação: sua hipótese está certa, e o mais importante — a interface já existe.

Concordo integralmente com o desenho: **essa área não conversa com modelo
nenhum.** Ela é um compositor de pedido. Não vaza chave, não tem custo por uso,
não vira gambiarra, e a mudança acontece onde deve acontecer — no código, com
teste, revisada, pelo build.

O achado do `MAPA.md` é que **o grupo `messaging` já é quase toda essa tela**:

| Componente existente | Papel no compositor |
| --- | --- |
| `MessageComposer` | O campo onde eu descrevo o que quero. Enter envia |
| `MessageBubble` com `attachment` | O prompt montado, entregue como anexo copiável |
| `MessageBubble` com `quote` | O recorte de estado que o pedido capturou |
| `ChatListItem` | O histórico de pedidos anteriores |
| `SuccessDialog` | "Prompt copiado" |
| `Tag` | O tipo do pedido — área nova, ajuste, correção |

Pela regra 2, registro: **consultei os `.prompt.md` de `MessageComposer`,
`MessageBubble` e `ChatListItem`, e os três servem sem componente novo.** O
`MessageBubble` já declara suporte a anexo e citação na própria API.

### A tela, desenhada

```
┌─ Pedir ao sistema ──────────────────────────────────────┐
│                                                         │
│  ┌─ histórico (ChatListItem) ─┐ ┌─ pedido atual ──────┐ │
│  │ ◍ Pedidos anteriores       │ │                     │ │
│  │                            │ │  [MessageBubble]    │ │
│  │ Área de leituras     3d    │ │  minha descrição    │ │
│  │ [Tag: área nova]           │ │                     │ │
│  │                            │ │  [MessageBubble]    │ │
│  │ Somar saldo previsto  1s   │ │  ┌ quote ─────────┐ │ │
│  │ [Tag: ajuste]              │ │  │ estado incluído│ │ │
│  │                            │ │  │ 3 módulos      │ │ │
│  │                            │ │  │ schema v4      │ │ │
│  │                            │ │  │ 128 registros  │ │ │
│  │                            │ │  └────────────────┘ │ │
│  │                            │ │  ┌ attachment ────┐ │ │
│  │                            │ │  │ prompt.md      │ │ │
│  │                            │ │  │ 4.2 KB  [copiar]│ │ │
│  │                            │ │  └────────────────┘ │ │
│  │                            │ │                     │ │
│  │                            │ │ [MessageComposer]   │ │
│  └────────────────────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**O que o prompt montado carrega**, e por que cada parte:

1. **Minha descrição**, literal.
2. **As regras do design system** — as cinco do `AGENTS.md`, para o Claude Code
   não inventar componente nem valor cru.
3. **O inventário dos 34 componentes** com os `.prompt.md`, para ele provar que
   nenhum serve antes de propor o 35º.
4. **O schema atual e a versão**, para ele escrever a migração.
5. **Os módulos existentes**, para não duplicar.
6. **Um recorte dos meus dados** — e aqui vai um controle explícito: *estrutura
   apenas*, *amostra anonimizada* ou *dados reais*. Padrão em "estrutura
   apenas", porque eu vou colar isso numa janela de chat.

O ponto 6 é meu acréscimo à sua hipótese. Sem ele, o compositor vira um jeito
confortável de vazar meu financeiro num prompt sem perceber.

---

## (e) Não existe campo de formulário — e isso é bloqueio

### Recomendação: criar **dois** componentes, e só dois. Preciso da sua autorização (regra 2 e regra 5).

O grupo `forms` tem busca, checkbox, switch, radio e select. **Não tem campo de
texto com rótulo e mensagem de erro, nem área de texto, nem campo de data, nem
de valor.** Não é esquecimento do dump: o dashboard de origem não tinha
formulário, só filtro sobre tabela.

Um sistema de gestão de vida é, em boa parte, entrada de dados. Sem isso não dá
para criar uma tarefa, lançar uma despesa nem marcar um compromisso.

Pela regra 2, provei que nada serve antes de propor:

| Existente | Por que não serve |
| --- | --- |
| `SearchInput` | Lupa fixa, chip de atalho, **sem rótulo, sem erro, sem tipo**. O `.prompt.md` diz: *"o rail e toda barra de tabela usam"* — é busca |
| `Select` | Escolha em lista fechada, não entrada livre |
| `Checkbox`, `Switch`, `Radio` | Booleano e escolha única |

**O que proponho — dois componentes, não uma família:**

1. **`Field`** — o invólucro: rótulo, dica, mensagem de erro, estado de
   obrigatório. É onde moram os estados que faltam (`error`, `disabled`).
2. **`TextInput`** — o campo em si, com `type` cobrindo texto, área de texto,
   número, data, hora e valor monetário.

Data e valor **não viram componentes separados**: viram `type` com máscara
PT-BR, apoiada no módulo `src/formato/` da decisão (a). Menos superfície, menos
manutenção.

**O que o `DESIGN.md` já define e eu vou usar sem inventar nada:** altura de
controle (`--control-h`, 36px; `lg` 44px), raio (`--r-control`), fio
(`--border-default`), foco (`--border-focus`, sem brilho — o contrato é
explícito), superfície (`--surface-input`), e o tom de erro
(`--status-danger-*`). **Nenhum valor novo.** O `SearchInput` já é a prova de
que essa combinação existe e funciona.

Pela regra 1, se você aprovar: **o `DESIGN.md` muda antes do código**, ganhando
a seção de campo de formulário que a fonte não tinha, marcada como adição
declarada — do mesmo jeito que o tema claro foi.

---

## (f) Corpo de texto a 12px

### Recomendação: manter os 12px. Não mexer.

O `DESIGN.md` é explícito: *"o corpo realmente é 12px — este é um produto denso
de dados, e a escala foi construída em torno disso e não do padrão web de
16px"*. E a folha de design da fonte fixa três tamanhos: Título 24, Subtítulo
20, Corpo 12.

Levantei porque 12px é pequeno para leitura pessoal prolongada e porque você vai
usar isso no telefone. Mas mudar `--fs-body` **reverbera pela escala inteira** —
dez papéis de tipografia apontam para ela, e todo espaçamento foi calibrado
contra esse ritmo. Seria o redesenho que a sua regra 6 proíbe.

**Alternativa que não quebra o contrato**, se a leitura incomodar no uso real:
um controle de densidade que escale a raiz, mantendo todas as proporções.
Proponho **não fazer agora** e reavaliar depois de você usar o primeiro pilar
no iPhone por alguns dias. Decisão baseada em uso, não em suposição minha.

---

## (g) Extrair o shell da biblioteca para `src/`

### Recomendação: extrair — mas sem apagar nada, respeitando a sua restrição.

Hoje o domínio mora dentro do design system: `AdminShell` importa `nav` e
`titles` de `patterns/data.ts`, e `src/App.tsx` inteiro é
`<AdminShell theme={theme} onThemeChange={setTheme} />`. A aplicação não tem
shell próprio.

Isso funcionou para demonstração. Para produto, prende o domínio na biblioteca:
toda tela nova minha teria que entrar em `design-system/patterns/`, o que
contradiz a fronteira que o próprio `AGENTS.md` define.

**O que proponho, na forma aditiva que a sua restrição pede:**

- **Nasce** `src/casca/` — o shell do meu produto, com a minha navegação e as
  minhas rotas, usando os mesmos `Sidebar`, `TopBar` e `PageHeader`.
- **Fica** `AdminShell` intacto em `patterns/desktop/`, com o domínio de
  logística vivo, servindo a aba Patterns do `/design-system`.
- **Muda** só `src/App.tsx`: `/app` passa a renderizar `src/casca/`.

Nada apagado, nada movido, nada quebrado. A biblioteca ganha de volta a
fronteira certa, e a demonstração continua sendo demonstração.

**E é aqui que o defeito do iPhone morre:** a casca nova escolhe entre desktop e
mobile por viewport, coisa que `AdminShell` nunca fez. O `test.fixme` em
`e2e/superficies.spec.ts` vira teste passando — e o Playwright vai me obrigar a
remover a marca, que é como eu quero que funcione.

---

## Resumo, para você responder rápido

| # | Decisão | Recomendação |
| --- | --- | --- |
| a | Alcance do PT-BR | Traduzir (i) e (ii); API da biblioteca em inglês + glossário. **49 regras emudeceriam** se traduzisse |
| b | Dois aparelhos | **Exige backend.** Costura de repositório desde o 1º pilar; instalar na tela de início já; exportação sempre |
| c | Acesso do iPhone | PWA instalado sobre HTTPS para uso diário; dev server na rede só para desenvolver |
| d | Área da IA | Compositor de pedido, sem modelo. **Interface já existe** no grupo `messaging`. Com controle de quanto dado entra |
| e | Campo de formulário | **Bloqueio.** Criar `Field` + `TextInput`, só dois, sem valor de design novo. Precisa da sua autorização |
| f | Corpo a 12px | Manter. Reavaliar após uso real |
| g | Extrair o shell | Extrair de forma aditiva; nada apagado |

**E a pergunta aberta:** o que é "o banco de dados" que você quer manter? Adotei
`patterns/data.ts` e mantive intacto.

---

## Verificação deste documento

```
lint        exit=0      typecheck   exit=0
test        6 passam    test:e2e    14 passam, 2 marcados
build       exit=0
```

Fatos de plataforma verificados na fonte, não de memória:

- Despejo de 7 dias do ITP e a exceção da tela de início —
  [MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
  e [Apple Developer Forums](https://developer.apple.com/forums/thread/710157)
- File System Access API ausente no Safari —
  [MDN, File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
  e [caniuse](https://caniuse.com/native-filesystem-api)
- Web apps na tela de início no iOS 26 —
  [heise online](https://www.heise.de/en/news/iOS-26-and-iPadOS-26-Changed-web-app-behaviour-on-the-home-screen-10749652.html)
