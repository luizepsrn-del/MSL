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
| `/app/rotina` … `/app/financeiro` | O produto. Cada pilar tem URL própria |
| `/app/pedir` | Compositor de pedido para a IA |
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
  formato/        formatação pt-BR — data, hora, moeda, ordenação
  routes/         o showcase da biblioteca
```

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
