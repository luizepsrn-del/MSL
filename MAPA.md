# MAPA — o que existe hoje

Levantamento da FASE 1. Nenhum código de produção foi escrito para produzi-lo.
Tudo aqui foi lido no repositório e, onde diz "medido", verificado rodando.

Referência do estado: commit `3de6e4d`.

---

## 1. Inventário dos 34 componentes

A coluna que importa é a última. Três julgamentos possíveis:

- **serve** — genérico, entra no domínio de vida sem tocar em nada
- **serve adaptado** — a forma serve, o vocabulário não
- **é de logística** — nasceu do domínio que vai embora

### core — 8 componentes

| Componente | Para que serve | Estados | Julgamento |
| --- | --- | --- | --- |
| `Icon` | Um glyph Lucide a 1.6px. Tudo passa por ele, nunca SVG inline | tamanhos 14–22, cor semântica | **serve** |
| `Button` | Ação. Um primário gradiente por tela | 5 variantes × 3 tamanhos, hover, press, focus, disabled | **serve** |
| `IconButton` | Controle só-ícone | 3 variantes, active, disabled, 28–44px | **serve** |
| `Card` | O painel onde todo widget mora. Nunca aninhar | título, subtítulo, ação, glow, flush, menu ⋮ | **serve** |
| `Badge` | Marcador de **estado**, pílula | 6 tons, com/sem ponto | **serve adaptado** |
| `Tag` | Marcador de **categoria**, raio 6px | 6 tons, com/sem contador | **serve adaptado** |
| `Avatar` | Pessoa, com iniciais quando não há foto | 28–56px, status, anel | **serve** |
| `ProgressBar` | Trilho com preenchimento gradiente | 5 tons, com/sem rótulo, 0–100% | **serve** |

`Badge` e `Tag` são estruturalmente perfeitos para vida — *"Badge para estado,
Tag para categoria"* é a regra do `.prompt.md` e vale igual para tarefa
(pendente/feita/atrasada) e para contexto (pessoal/profissional). O que muda é
só o vocabulário dos tons: hoje `ontime`/`delay`/`delivered` e
`order`/`invoice`/`carrier`/`driver`.

### forms — 5 componentes

| Componente | Para que serve | Estados | Julgamento |
| --- | --- | --- | --- |
| `SearchInput` | Busca, com chip de atalho | 3 tamanhos, vazio, preenchido, focus | **serve** |
| `Checkbox` | Seleção de linha | marcado, indeterminado, disabled | **serve** |
| `Switch` | Liga/desliga | on, off, disabled, 2 tamanhos | **serve** |
| `Radio` | Escolha única em linha | selecionado, não selecionado | **serve** |
| `Select` | Filtro dropdown | fechado, aberto, item selecionado, placeholder | **serve** |

**Aqui está o buraco mais importante do inventário.** Este grupo se chama
"forms" mas **não tem campo de texto**. `SearchInput` é busca — tem lupa fixa,
chip de atalho, nenhum rótulo, nenhuma mensagem de erro. Não existe:

- campo de texto com rótulo e mensagem de erro
- área de texto (nota, descrição)
- campo de data, de hora, de valor monetário
- qualquer forma de agrupar campos num formulário

Isso não é omissão do dump: o dashboard de origem **não tinha formulários**,
só filtros sobre tabela. Um sistema de gestão de vida é, em grande parte,
entrada de dados. Pela regra 5 do seu prompt, isso vira conversa na PARADA 2,
não decisão minha — está no item 6 abaixo.

### navigation — 4 componentes

| Componente | Para que serve | Estados | Julgamento |
| --- | --- | --- | --- |
| `Sidebar` | O rail de 224px, seções "Menu" e "Support" | item ativo com gradiente + aba luminosa, hover, badge, rodapé | **serve** |
| `TopBar` | Barra de 72px. Ordem fixa: tema → créditos → notificações → usuário | tema, créditos, notificações, chip de usuário | **serve adaptado** |
| `PageHeader` | Título + subtítulo | só título, com subtítulo, com ações | **serve** |
| `Pagination` | Paginador, números com zero à esquerda | página atual, primeira, última | **serve** |

`TopBar` serve adaptado porque o cluster de utilidades é do produto de origem:
**"créditos" (o raio verde com 40) e a nota 4.8 do usuário não significam nada
na minha vida.** A estrutura fica, esses dois slots saem ou viram outra coisa.

### data — 8 componentes

| Componente | Para que serve | Estados | Julgamento |
| --- | --- | --- | --- |
| `StatCard` | Tile de indicador | glow, delta em 3 tons | **serve** |
| `DataTable` | A tabela. Ordenação, seleção, **estado vazio** | cabeçalho ordenável, linha selecionada, vazio | **serve** |
| `SelectionToolbar` | Barra de ação em massa | 0 ou N selecionados, slot de filtro | **serve** |
| `DonutChart` | Anel segmentado com figura central | 1–5 segmentos, com/sem centro | **serve** |
| `LineChart` | Tendência, 2 séries máx. | destaque com banda, ponto e tooltip | **serve** |
| `BarChart` | Colunas, uma em destaque | com/sem rótulos, pílula de valor | **serve** |
| `MetricBarList` | Barras rotuladas em pilha | sempre sob o donut que explica | **serve** |
| `CarrierRow` | Linha do ranking de transportadoras | linha única | **é de logística** |

Este é o grupo mais valioso para o meu domínio e quase todo aproveitável.
`DataTable` já tem estado vazio pronto — isso importa num sistema que começa
sem dado nenhum. Os três gráficos servem direto a financeiro e a rotina.

`CarrierRow` é o caso óbvio: posição no ranking, avaliação, nº de veículos, nº
de parceiros. **Nada disso existe na minha vida.** Mas a *forma* — linha de
grid com avatar, título+subtítulo, dois pares número/rótulo e menu ⋮ — é
exatamente uma linha de lista rica. Vale discutir se morre ou se vira um
`ListRow` genérico; é decisão sua, não minha (regra 2).

### messaging — 3 componentes

| Componente | Para que serve | Estados | Julgamento |
| --- | --- | --- | --- |
| `ChatListItem` | Conversa na lista | ativo, não lidas, digitando, hover | **serve adaptado** |
| `MessageBubble` | Mensagem. Roxa à direita = minha | própria, recebida, lida, citação, anexo | **serve adaptado** |
| `MessageComposer` | Campo de envio, Enter envia | vazio, com rascunho, ferramentas | **serve adaptado** |

Aqui está a descoberta mais útil do levantamento, e eu recomendo não apagar
este grupo.

**A área de "pedir para a IA" (FASE 2d) já tem interface pronta.** Um compositor
de pedido é exatamente uma conversa: eu descrevo, o sistema responde com o
prompt montado, o histórico fica. `MessageComposer` já é um campo multi-linha
com Enter-envia e fila de ferramentas. `MessageBubble` já tem **anexo** e
**citação** — um prompt gerado é um anexo; o estado que ele capturou é uma
citação. `ChatListItem` já dá a lista de pedidos anteriores.

O vocabulário a adaptar é pequeno: `role` hoje aceita "Carrier"/"Driver".

### feedback — 6 componentes

| Componente | Para que serve | Estados | Julgamento |
| --- | --- | --- | --- |
| `Modal` | Diálogo centrado, scrim borrado. Esc e clique fecham | aberto, fechado, header, footer | **serve** |
| `SuccessDialog` | Confirmação com tique luminoso | success, danger | **serve** |
| `OptionCard` | Linha grande escolhível, 2 a 4 no máximo | selecionado, hover | **serve** |
| `StepProgress` | Cabeçalho de onboarding com contador "7/8" | qualquer passo/total | **serve** |
| `PromoCard` | Bloco de upsell no rodapé do rail | com/sem ilustração | **é de logística** |
| `PromoBanner` | Faixa de plano no topo da tela | com/sem colagem | **é de logística** |

`SuccessDialog` merece nota: o `.prompt.md` diz *"é assim que o produto
reconhece uma ação concluída — ele não tem padrão de toast"*. Isso é uma decisão
de design registrada, não um esquecimento. Vale para o meu sistema também, e é
um dos pontos da regra 5.

`PromoCard` e `PromoBanner` são venda de plano. Eu não vendo plano para mim
mesmo. Saem — e levam junto as duas imagens promocionais.

### Placar

| Julgamento | Quantos |
| --- | --- |
| serve direto | **23** |
| serve adaptado (só vocabulário) | **8** |
| é de logística | **3** — `CarrierRow`, `PromoCard`, `PromoBanner` |

**31 dos 34 sobrevivem.** A reforma de domínio é muito menor do que parece.

---

## 2. Tokens

320 linhas, 193 tokens declarados, nove arquivos.

| Arquivo | Tokens | O que define |
| --- | --- | --- |
| `colors.css` | 55 | Rampa roxa (9), rampa de tinta (11), acentos semânticos, superfícies, texto, bordas, status, gradientes, séries de gráfico |
| `themes.css` | 72 | Os dois blocos de tema, 36 tokens cada |
| `typography.css` | 25 | 10 tamanhos, 5 pesos, 4 alturas, 4 espaçamentos, 10 papéis |
| `motion.css` | 15 | 5 durações, 3 curvas, transições compostas |
| `elevation.css` | 13 | 4 sombras, 4 brilhos, 2 desfoques |
| `spacing.css` | 8 + layout | Escala 2→64px e as métricas do shell |
| `radius.css` | 5 + apelidos | 4→24px e pílula |
| `fonts.css` | — | Rubik do Google Fonts |
| `base.css` | — | Reset, foco, barra de rolagem, seleção |

**A rampa de tinta é o eixo.** Onze degraus, de `--ink-1000` (#06071A, a tela)
a `--ink-100` (#E0E1EE, o texto). Toda superfície e todo texto apontam para ela
por apelido — `--surface-app: var(--ink-1000)`, `--text-body: var(--ink-100)`.

**Espaçamento**: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 64px.
**Raio**: 4, 6, 8, 10, 12, 16, 20, 24px e pílula, com apelidos por papel
(`--r-card`, `--r-control`, `--r-modal`).
**Corpo de texto é 12px** — produto denso de dados, escala construída em volta
disso e não do padrão web de 16px. Vale reabrir para uso pessoal; está no item 6.

### Como os dois temas se derivam, e a armadilha

Escuro é canônico e mora em `:root`. Claro é **adição declarada**, um
espelhamento mecânico: a ponta de superfície da rampa clareia, a ponta de texto
escurece, e a marca não muda — `#682EC7` é `#682EC7` nos dois. Medido.

A armadilha, que o `AGENTS.md` registra e que causou um defeito real:

> Um custom property cujo valor contém `var()` é substituído **no escopo onde é
> declarado**. `--surface-app: var(--ink-1000)` declarado em `:root` resolve
> contra a rampa de `:root` e **ignora** um override em `[data-theme="light"]`.

São **dez** os apelidos que resolvem na rampa e portanto precisam estar
declarados nos dois blocos: `--surface-app`, `--surface-card`,
`--surface-raised`, `--surface-input`, `--text-body`, `--text-muted`,
`--text-subtle`, `--chart-4`, `--chart-5`, `--chart-axis`.

Isso agora é teste, não só prosa: `design-system/tokens/themes.test.ts`.
Verifiquei que ele falha quando o contrato quebra.

---

## 3. Padrões de composição

`design-system/patterns/` tem 2.360 linhas e **é onde o domínio de logística
mora de verdade** — não em `src/`.

### O que `AdminShell` resolve

- Barra de 72px com marca, título, subtítulo e cluster de utilidades
- Rail de 224px com seções, item ativo com gradiente e aba luminosa, rodapé
- Área de conteúdo roteada por estado local (`useState`, **não** react-router)
- Modal de onboarding e diálogo de confirmação já ligados

### O que ele assume do domínio, via `patterns/data.ts`

`data.ts` exporta 20 símbolos e **nove arquivos de pattern importam dele**.
É o ponto de acoplamento único — bom para a reforma:

| Exporta | Natureza |
| --- | --- |
| `orders`, `carriers`, `automations`, `chats`, `thread` | Dados de demonstração, logística pura |
| `revenueCurrent`, `revenuePrevious`, `orderBars`, `fleet`, `fleetSegments`, `kpis` | Séries de demonstração |
| `monthLabels` | **Genérico**, mas em inglês (`Jan`…`Dec`) |
| `nav`, `titles` | **A navegação e os títulos do produto** |
| `OrderRow`, `CarrierEntry`, `AutomationRow`, `ChatEntry`, `ThreadMessage`, `Kpi` | Os tipos do domínio |

`nav` e `titles` são o achado: a navegação inteira do produto — Overview,
Orders, Carriers, Invoice, Automations, Analytics, Reporting, Messages,
Settings, Help — é **dado**, não código. Trocar os pilares de logística pelos
meus é editar uma estrutura, não reescrever o shell.

### Uma observação de arquitetura que eu recomendo tratar

O domínio do produto está **dentro** do design system. `AdminShell` importa
`nav` e `titles` de `patterns/data.ts`, e `src/App.tsx` inteiro é:

```tsx
return <AdminShell theme={theme} onThemeChange={setTheme} />;
```

Ou seja: a aplicação não tem shell próprio, ela renderiza um shell da
biblioteca que já sabe quais são as telas. Isso funcionou para uma demonstração;
para um produto, prende o domínio na biblioteca. Minha recomendação para a
FASE 3 é extrair o shell para `src/`, deixando em `patterns/` só a composição
sem domínio. **Não vou fazer isso sem sua palavra** — muda a fronteira que o
`AGENTS.md` define.

---

## 4. O estado real do mobile

**Medido**, não estimado — Playwright, WebKit, iPhone 15, 393×659.

### O que existe e funciona

`MobileShell`, `MobileChrome` e `MobileScreens` são bons e completos:

- Barra de status, cabeçalho com hambúrguer, pílula de notificação, avatar
- Linha de utilidades: busca, segmento de tema, créditos
- **Gaveta** de navegação com o mesmo `Sidebar`, mesmas seções, mesmo gradiente
- Rail de KPIs com scroll-snap e pontos de posição
- **Tabela vira um cartão por linha, com todas as colunas como campos
  rotulados** — nenhuma coluna é descartada, nenhum scroll lateral
- Chat vira lista → thread com botão voltar
- `--tap-min: 44px` definido e usado em 9 lugares

A paridade com desktop foi levada a sério pelo dump. Isso é patrimônio.

### O que falta para o iPhone ser cliente de primeira classe

| Lacuna | Evidência |
| --- | --- |
| **Nada roteia para `MobileShell`** | `/app` renderiza `AdminShell` sem condição. `MobileShell` só é alcançável dentro da aba Patterns do showcase, num `PhoneFrame` falso |
| **O telefone recebe o shell de desktop** | Medido: rail de 224px ocupando 57% da largura; `<h1>` com **0px** de largura; documento com 695px contra viewport de 393 — **302px vazando de lado** |
| **Sem `viewport-fit=cover`** | `index.html` tem só `width=device-width, initial-scale=1.0` |
| **Sem `safe-area-inset`** | 0 ocorrências no código. No iPhone com notch, conteúdo passa por baixo da barra e do indicador |
| **O dev server não atende a rede** | `vite.config.ts` não define `server.host` — o telefone não alcança nem no mesmo Wi-Fi |
| **Sem PWA** | Nem manifest, nem service worker. Não instala, não abre em tela cheia, não funciona offline |
| **Teclado virtual** | Nenhum tratamento. Campo no rodapé (o composer) fica coberto |

O defeito do shell está registrado como `test.fixme` em
`e2e/superficies.spec.ts`. No dia em que `/app` servir o telefone, o Playwright
acusa "passou quando era esperado falhar" e obriga a remover a marca.

---

## 5. O que o `DESIGN.md` diz que NÃO existe

Pela regra 5, cada linha aqui é uma conversa com você, não uma decisão minha.

| Não existe | O que o contrato diz | Por que me atrapalha |
| --- | --- | --- |
| **Tooltip** | "Nada mais foi inventado" | Ajuda contextual sem poluir a tela |
| **Toast** | Confirmação é `SuccessDialog` centrado — decisão registrada, não esquecimento | "Tarefa concluída" com diálogo modal a cada vez é pesado |
| **Accordion** | idem | Agrupar projeto → tarefas |
| **Breadcrumb** | idem | Navegar projeto → sub-projeto |
| **Tabs** | idem | Alternar contexto pessoal/profissional |
| **Estado de carregamento no `Button`** | "a fonte não define nenhum" | Importação de arquivo, migração de schema |
| **Logo** | "Nenhum logo foi fornecido, então nenhum foi criado" | Marca é o wordmark + ponto roxo |
| **Foto de avatar** | Sem imagem reutilizável na fonte | Iniciais bastam |
| **Ícones originais** | Substituição sinalizada: Lucide no lugar do set Iconsax/Solar | Aceitável |
| **Tela de modo claro** | Nunca desenhada. O tema claro atual é derivação declarada | Aceitável |
| **Campo de texto com rótulo e erro** | Não consta — a fonte não tinha formulário | **Este é o bloqueio real** |

Os cinco primeiros mais o campo de texto são o que eu preciso discutir com você
antes de construir qualquer pilar. Minha leitura: **Tabs e campo de formulário
são inevitáveis**; Toast, Tooltip, Accordion e Breadcrumb são evitáveis com
composição do que já existe. Detalho na PARADA 2.

---

## 6. Mapa de tradução

### Camada (i) — texto visível ao usuário

Onde está: `patterns/data.ts` (`nav`, `titles`, dados de demonstração), as
telas em `patterns/desktop/` e `patterns/mobile/`, `src/routes/Showcase*.tsx`,
`index.html`.

Inclui os erros de digitação **preservados de propósito** na recriação —
"Meet your oun numbers", "Database of wires tenders", "$30,89 per munth",
"Thank youl". O `DESIGN.md` explica que os kits os mantêm para a recriação ser
honesta. Como as telas de logística vão embora, esses textos vão junto e a
questão desaparece.

Fora do texto, "em PT-BR" inclui o que se esquece — e **nada disso existe hoje**:

| Item | Estado medido |
| --- | --- |
| `lang` | `index.html` tem `lang="en"` |
| Data e hora | Nenhum `Intl` no código. O dump usava "Jan 3, 2025" e "05:11 PM" |
| Moeda | Nenhuma formatação. O dump usava `$8,126,420` |
| Primeiro dia da semana | Não existe calendário ainda; domingo é o padrão de `Intl` em pt-BR |
| Ordenação com acento | Nenhum `localeCompare` no código |

### Camada (ii) — identificadores do código da aplicação

`src/` tem 1.648 linhas em 7 arquivos. `App.tsx` tem 22. É a camada mais barata
de traduzir porque quase não existe — o produto ainda vai ser escrito.

### Camada (iii) — API pública do design system

Aqui está o custo real, e é maior do que parece.

**Medido: 49 dos 52 seletores do `adherence.rules.json` citam nome de
componente e nome de prop, em inglês.** Por exemplo:

```
JSXOpeningElement[name.name='Avatar'] > JSXAttribute >
  JSXIdentifier[name!=/^(?:name|src|size|status|ring|style|…)$/]
```

São 34 componentes com regra de prop. Se `Button` virar `Botao` e `variant`
virar `variante`, **essas 49 regras não quebram — elas emudecem.** Param de
casar com qualquer coisa, o lint continua verde e deixa de proteger o que foi
construído para proteger. É a pior falha possível: silenciosa.

Alcance total de uma tradução da camada (iii):

| Artefato | Impacto |
| --- | --- |
| `adherence.rules.json` | 49 dos 52 seletores reescritos |
| `DESIGN.md` | O vocabulário inteiro do contrato |
| `design-system/reference/` | 27 páginas estáticas preservadas, que citam os nomes |
| `reference/_ds_bundle.js` | Artefato compilado com os nomes antigos — irreparável sem recompilar |
| `adherence-metadata.json` | A fonte de onde as regras foram geradas |
| Os 34 `.prompt.md` | Todos os exemplos |
| `SKILL.md` | A skill que usa o sistema fora do projeto |

Trago a recomendação na PARADA 2.

---

## 7. O que eu preciso decidir com você

Adiantando o que vira `DECISOES.md` se você aprovar este mapa:

1. **Tradução** — concordo com sua inclinação, e as 49 regras emudecidas são o
   argumento técnico que faltava. Detalho.
2. **Dois aparelhos sem backend** — vou trazer as quatro saídas com custo real.
3. **Como o iPhone alcança o app** — hoje não alcança de forma nenhuma.
4. **A área de pedir para a IA** — concordo com a sua hipótese, e o grupo
   `messaging` já dá quase toda a interface.
5. **Campo de formulário** — bloqueio, não preferência. Precisa de decisão sua
   antes de qualquer pilar.
6. **Corpo de texto a 12px** — herdado de produto denso de dados. Vale reabrir?
7. **Extrair o shell para `src/`** — muda a fronteira do `AGENTS.md`.

---

## Verificação deste levantamento

```
lint        exit=0
typecheck   exit=0
test        6 passam (contrato de themes.css)
test:e2e    14 passam, 2 marcados (mac + iphone)
build       exit=0
```

Medições do iPhone: Playwright, projeto `iphone`, WebKit, descritor iPhone 15.
