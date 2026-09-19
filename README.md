# My System Life

Sistema de gestão de vida pessoal e profissional — rotina, tarefas, projetos,
financeiro e calendário no mesmo lugar, usado de verdade no MacBook e no
iPhone. Em português do Brasil.

Construído sobre o design system reconstruído a partir de um painel de
logística. **O domínio de logística não foi apagado**: ele continua vivo em
`design-system/patterns/` como demonstração da biblioteca, alcançável pelo
showcase. O que mudou foi o produto, não a biblioteca.

React 19 · TypeScript · Vite 8.

## Getting started

```bash
npm install
npm run dev
```

| Rota | O que é |
| --- | --- |
| `/app/inicio` | O dia de hoje em uma tela |
| `/app/rotina` | O que se repete, com sequência |
| `/app/tarefas` | O que tem fim, com prazo |
| `/app/calendario` | Rotina e tarefa no tempo |
| `/app/projetos` | Trabalho maior que uma tarefa |
| `/app/financeiro` | Entradas, saídas, realizado e previsto |
| `/app/pedir` | Compositor de pedido para a IA — não chama modelo nenhum |
| `/app/ajustes` | Exportar, importar e o aviso de armazenamento |
| `/design-system` | O showcase da biblioteca: todo componente, todo estado, os dois temas |
| `/design-system/reference/index.html` | As páginas de referência visual (precisam do dev server, não de `file://`) |

A casca escolhe desktop ou mobile pela largura da janela, no ponto
`--bp-desktop` (1224px).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck, build to `dist/`, and copy the reference pages across |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the design-system adherence rules |
| `npm test` | Vitest — domain logic |
| `npm run test:e2e` | Playwright — Mac and iPhone |
| `npm run verificar` | lint + typecheck + test (roda no pre-commit) |
| `npm run preview` | Serve the production build |

Depois de clonar, ative o portão de commit uma vez:
`git config core.hooksPath .githooks`

## Layout

```
DESIGN.md         o contrato visual — fonte de verdade de todo token
AGENTS.md         instruções para ferramentas de agente (o CLAUDE.md importa)
MAPA.md           levantamento do que existe na biblioteca
DECISOES.md       as decisões estruturais e o porquê de cada uma
design-system/    a biblioteca — 36 componentes, tokens, patterns e as
                  páginas de referência preservadas
src/
  casca/          a casca do produto: navegação, desktop e mobile
  dados/          esquema, migrações, costura de armazenamento
  dominio/        a lógica testada, um módulo por pilar
  telas/          uma tela por pilar
  formato/        formatação pt-BR — data, hora, moeda, ordenação
  routes/         o showcase da biblioteca
```

## Backup

Os dados ficam no navegador deste aparelho. **O Safari apaga armazenamento
local após sete dias sem uso do site** — sites adicionados à tela de início
ficam de fora dessa regra. Exporte em `/app/ajustes`: o arquivo é JSON legível
e a importação traz de volta, migrando de versões antigas se preciso.

## Publicar

O sistema é um site estático: qualquer hospedagem serve. O `vercel.json` já
está pronto, e a Vercel funciona sem configurar nada na interface — ela lê o
arquivo.

**Precisa ser HTTPS.** Não é preferência: o operário de serviço só é registrado
em contexto seguro, então num endereço `http://` da rede local o iPhone instala
o atalho mas não abre sem rede. É o motivo principal de publicar.

```sh
git remote add origin git@github.com:SEU-USUARIO/my-system-life.git
git push -u origin main          # só a main: a branch dump-original não precisa subir
```

Na Vercel: **Add New → Project → Import** o repositório. Framework *Other*,
build `npm run build`, saída `dist` — tudo isso já vem do `vercel.json`. Cada
`git push` na `main` publica.

O que o `vercel.json` resolve, e por quê:

| Regra | Motivo |
| --- | --- |
| tudo reescrito para `/index.html` | `/app/tarefas` é rota do roteador, não arquivo. A Vercel procura no sistema de arquivos primeiro, então os arquivos reais continuam sendo servidos por si — há teste para isso. |
| `sw.js` sem cache | se o navegador servir a cópia velha do operário, a versão nova nunca assume e o sistema congela numa build antiga |
| `/assets/*` imutável por um ano | o nome tem hash: mudou o conteúdo, mudou o nome |
| `manifest.webmanifest` com tipo explícito | navegador que recusa o tipo não instala o aplicativo |
| `index.html` sem cache | é a casca de todas as rotas |

**O endereço é público, os dados não.** Quem abrir o link vê um sistema vazio:
tudo fica no `localStorage` do navegador de quem acessa, e nada é enviado a
lugar nenhum. Não há servidor, banco nem conta.

Uma ressalva sobre o repositório: `design-system/reference/` guarda o material
original recebido, incluindo um pacote compilado de terceiro. Se o repositório
for público, esse material vai junto — vale conferir a licença dele antes, ou
manter o repositório privado. A Vercel publica de repositório privado sem
diferença nenhuma.

## Trabalhando nele

Tudo que é visual vem de `design-system/`. Duas regras carregam quase todo o
peso:

- Componente novo nasce **dentro da biblioteca**, nunca ao lado da tela que
  precisou dele.
- Nenhuma cor, fonte, espaçamento ou raio escrito à mão — todo valor passa por
  um token.

`npm run lint` aplica as duas. [`DESIGN.md`](DESIGN.md) é o contrato que essas
regras protegem, [`design-system/README.md`](design-system/README.md) é o mapa
da biblioteca e o procedimento para acrescentar, e [`AGENTS.md`](AGENTS.md) é a
versão curta que as ferramentas de agente leem.

Data, hora, moeda e ordenação passam por `src/formato` — nenhuma tela chama
`Intl` direto. Dinheiro é inteiro em centavos, nunca ponto flutuante.
