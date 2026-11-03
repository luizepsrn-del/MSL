# Instagram na Criação — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar o MSL ao Instagram pessoal e dar à Criação uma aba "Instagram" com métricas, formato, recomendações por regra e ligação post ↔ peça.

**Architecture:** Mesmo molde da integração com o Google: OAuth da Meta (login unificado, `config_id`) por rotas finas em `api/` que delegam a `src/servidor/`, token e cache no `Armazem`; métricas nunca entram no banco. O cálculo (resumo, formato, recomendações) vive em `src/dominio/instagram.ts`, puro e testado. A tela lê pelo hook `useInstagram` em `src/dados/instagram.ts`.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest (Node), Playwright (`mac` e `iphone`), funções da Vercel, Redis via `Armazem`, Graph API da Meta `v25.0`.

**Spec:** `docs/superpowers/specs/2026-11-03-instagram-na-criacao-design.md`

## Global Constraints

- Leia `AGENTS.md` antes de começar; as regras de domínio de lá valem aqui.
- Produto em pt-BR; API do design system em inglês. Visual só com o design system de `design-system/`.
- Sem Prettier. Formate à mão, no estilo do arquivo.
- Imports dentro de `src/servidor/` e `api/` levam extensão `.ts` (a Vercel não adivinha; `src/servidor/api.test.ts` cobra).
- Datas de domínio são `AAAA-MM-DD` locais; dia de um instante ISO sai de `diaLocalDe` (`src/dominio/rotina.ts`), nunca de `slice(0, 10)`.
- Métrica ausente é `undefined` ("sem dado"), nunca `0`, e fica fora da média.
- Variação de taxa em **pontos percentuais**; de contagem, em valor.
- Graph API: `https://graph.facebook.com/v25.0`. Uma métrica de insights por chamada.
- Variáveis de ambiente: `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID`.
- Chaves do armazém: `instagram:<usuarioId>`, `instagram-estado:<estado>` (600 s), `instagram-cache:<usuarioId>` (3600 s).
- `LIMITE_DE_RECOMENDACOES = 5`; `MINIMO_POR_FORMATO = 3`; insights só para posts dos últimos `DIAS_COM_INSIGHTS = 90` dias e no máximo `TETO_DE_POSTS = 60`.
- Esquema: `VERSAO_ESQUEMA` 18 → 19, migração aditiva.
- Gate de cada tarefa: `npm run verificar`. Gate final: `npm run verificar && npm run build && npm run test:e2e`.
- Commits com `git -c user.name="comercialacttus-hub" -c user.email="comercial.acttus@gmail.com"`, num branch `instagram-na-criacao` criado a partir do atual.

## Review Focus

1. **Volta do OAuth com `state` vencido, já usado ou de outra sessão** — tem de recusar com página de erro, sem gravar credencial. (Tarefa 4)
2. **Token recusado no meio do uso (Graph code 190)** — vira "acesso perdido" e pede reconexão; qualquer outro erro é "falha temporária" e mantém a conexão. (Tarefas 3, 4 e 5)
3. **Período sem posts, ou período anterior vazio** — nada de divisão por zero: médias `null`, variação escondida, nenhuma recomendação inventada. (Tarefa 2)
4. **Conta com muitos posts** — o servidor para em `TETO_DE_POSTS` e só pede insights dentro de `DIAS_COM_INSIGHTS`, para caber no tempo da função. (Tarefa 3)
5. **Reel sem `profile_visits`/`follows`** — aparece "sem dado" e não puxa a média de visitas para baixo. (Tarefa 2)

---

### Task 1: Esquema — a peça sabe qual post ela virou

**Files:**
- Modify: `src/dados/esquema.ts` (`VERSAO_ESQUEMA`, `interface Peca`)
- Modify: `src/dados/migracoes.ts` (entrada `18` em `MIGRACOES`)
- Test: `src/dados/esquema.test.ts`

**Interfaces:**
- Produces: `Peca.instagramPostId?: string` (ID da mídia no Instagram); `VERSAO_ESQUEMA = 19`.

- [ ] **Step 1: Teste que falha** — em `esquema.test.ts`: `migrar({ ...bancoNaVersao18, pecas: [pecaSemCampo] })` devolve `versao === 19` e a peça igual à original (sem `instagramPostId`). O teste que percorre todas as versões passa a exigir o passo 18 → 19.
- [ ] **Step 2:** `npx vitest run src/dados/esquema.test.ts` → FAIL (não há migração da versão 18).
- [ ] **Step 3:** Campo opcional na `Peca` com comentário curto (o post em que a peça virou; só faz sentido em `publicado`). `VERSAO_ESQUEMA = 19`. Migração `18: (dados) => ({ ...dados, versao: 19 })`, com comentário `18 → 19` no padrão das outras.
- [ ] **Step 4:** `npm run verificar` → PASS.
- [ ] **Step 5:** Commit `esquema 19: a peça guarda o post do Instagram em que virou`.

### Task 2: Domínio — resumo, formatos e recomendações

**Files:**
- Create: `src/dominio/instagram.ts`
- Test: `src/dominio/instagram.test.ts`

**Interfaces:**
- Consumes: `diaLocalDe`, `somarDias` de `src/dominio/rotina.ts`.
- Produces:
  ```ts
  export type FormatoDoPost = 'reels' | 'carrossel' | 'imagem';
  export interface PostDoInstagram {
    id: string; legenda: string; formato: FormatoDoPost;
    publicadoEm: string; /* ISO UTC */ link: string; miniatura?: string;
    curtidas: number; comentarios: number;
    alcance?: number; visualizacoes?: number; salvamentos?: number;
    compartilhamentos?: number; visitasAoPerfil?: number;
    seguidoresGanhos?: number; tempoMedioMs?: number;
  }
  export interface PerfilDoInstagram { usuario: string; seguidores: number; totalDePosts: number }
  export interface DadosDoInstagram { perfil: PerfilDoInstagram; posts: PostDoInstagram[]; lidoEm: string }
  export type Periodo = 30 | 90 | 'tudo';
  export function dividirPorPeriodo(posts: PostDoInstagram[], periodo: Periodo, hoje: string):
    { atual: PostDoInstagram[]; anterior: PostDoInstagram[] };
  export interface Resumo {
    posts: number; alcanceMedio: number | null; alcanceMediano: number | null;
    salvamentosMedios: number | null; compartilhamentosMedios: number | null;
    visitasAoPerfil: number | null; seguidoresGanhos: number | null;
  }
  export function resumir(posts: PostDoInstagram[]): Resumo;
  export function porFormato(posts: PostDoInstagram[]):
    Record<FormatoDoPost, { posts: number; alcanceMedio: number | null }>;
  export type TipoDeRecomendacao = 'formato' | 'seguidores' | 'guardados' | 'fraco' | 'ritmo' | 'retencao';
  export interface Recomendacao { tipo: TipoDeRecomendacao; texto: string; evidencia: string; postId?: string; peso: number }
  export const LIMITE_DE_RECOMENDACOES = 5;
  export const MINIMO_POR_FORMATO = 3;
  export function recomendar(atual: PostDoInstagram[], anterior: PostDoInstagram[], hoje: string): Recomendacao[];
  ```

Regras (limiares da spec, um teste para cada): **formato** — alcance médio do formato ≥ 1,5× o dos outros juntos e < 30% dos posts, só com ≥ `MINIMO_POR_FORMATO` posts do formato; **seguidores** — visitas ou seguidores ganhos ≥ 3× a mediana dos posts que têm o dado; **guardados** — salvamentos + compartilhamentos ≥ 3× a mediana; **fraco** — quartil inferior de alcance e abaixo da mediana de visitas; **ritmo** — posts/semana do atual contra o anterior e semanas sem post; **retenção** — Reel de maior `tempoMedioMs`. `peso` = razão sobre a mediana (ou diferença de ritmo); saída ordenada por `peso`, cortada em `LIMITE_DE_RECOMENDACOES`. `periodo: 'tudo'` deixa `anterior` vazio.

- [ ] **Step 1: Testes que falham** — fixture `POSTS_REAIS` com 10 posts tirados de `~/Downloads/metricas_luizpereira.csv` (os de 2026-08-21 a 2026-11-03: Mentalista, AMentoria, os 6 Reels, dois carrosséis fracos). Asserções:
  - `resumir([])` → `{ posts: 0, alcanceMedio: null, …todos null }`;
  - `resumir` ignora `undefined`: dois posts com visitas `10` e `undefined` → `visitasAoPerfil === 10`;
  - `porFormato(POSTS_REAIS).reels.posts === 6`;
  - `recomendar` sobre `POSTS_REAIS` inclui `tipo: 'formato'` citando Reels, `'guardados'` com `postId` do Mentalista e `'seguidores'` com `postId` da AMentoria;
  - formato com 2 posts não gera `'formato'`;
  - `recomendar([], [], hoje)` → `[]`;
  - nunca mais de 5 itens, ordenados por `peso` decrescente;
  - `dividirPorPeriodo(…, 30, '2026-11-03')` põe um post de `2026-10-04T12:00:00Z` no atual e um de `2026-10-03T12:00:00Z` no anterior; post às `2026-10-04T01:30:00Z` (22:30 do dia 3 em São Paulo) cai no anterior.
- [ ] **Step 2:** `npx vitest run src/dominio/instagram.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar as assinaturas acima. Textos das recomendações em primeira pessoa do leitor e com o número na `evidencia` (ex.: `"Reels: 1.550 de alcance médio, 6 de 32 posts"`), números com `src/formato`.
- [ ] **Step 4:** `npm run verificar` → PASS.
- [ ] **Step 5:** Commit `as recomendações do Instagram saem dos números, e sem dado não é zero`.

### Task 3: Servidor — conexão e leitura na Meta

**Files:**
- Create: `src/servidor/instagram.ts`
- Test: `src/servidor/instagram.test.ts`

**Interfaces:**
- Consumes: `Armazem` (`./armazem.ts`), `segredo` (`./senha.ts`), tipos de `../dominio/instagram.ts`.
- Produces:
  ```ts
  export const GRAPH = 'https://graph.facebook.com/v25.0';
  export const DIALOGO = 'https://www.facebook.com/v25.0/dialog/oauth';
  export const SEGUNDOS_DO_ESTADO = 600; export const SEGUNDOS_DO_CACHE = 3600;
  export const DIAS_COM_INSIGHTS = 90; export const TETO_DE_POSTS = 60;
  export interface AmbienteDoInstagram { META_APP_ID?: string; META_APP_SECRET?: string; META_CONFIG_ID?: string; [outra: string]: string | undefined }
  export interface CredencialDoInstagram { token: string; contaId?: string; conectadoEm: string }
  export class InstagramNaoConfigurado extends Error {}
  export class ErroDoInstagram extends Error { readonly estado: number; readonly codigo?: 'token-recusado' | 'meta' }
  export function convitePara(armazem: Armazem, usuarioId: string, voltaPara: string, ambiente: AmbienteDoInstagram): Promise<string>;
  export function donoDoEstado(armazem: Armazem, estado: string): Promise<string | null>;
  export function guardarCredencial(armazem: Armazem, usuarioId: string, codigo: string, voltaPara: string, ambiente: AmbienteDoInstagram, buscar?: typeof fetch): Promise<CredencialDoInstagram>;
  export function credencialDe(armazem: Armazem, usuarioId: string): Promise<CredencialDoInstagram | null>;
  export function definirConta(armazem: Armazem, usuarioId: string, contaId: string): Promise<void>;
  export function desconectar(armazem: Armazem, usuarioId: string): Promise<void>;
  export function descobrirConta(token: string, buscar?: typeof fetch): Promise<string | null>;
  export function lerDados(token: string, contaId: string, agora: Date, buscar?: typeof fetch): Promise<DadosDoInstagram>;
  export function dadosComCache(armazem: Armazem, usuarioId: string, credencial: CredencialDoInstagram & { contaId: string }, atualizar: boolean, agora: Date, buscar?: typeof fetch): Promise<DadosDoInstagram>;
  ```

Detalhes que o implementador não decide sozinho:
- Convite: `client_id`, `config_id`, `redirect_uri`, `response_type=code`, `override_default_response_type=true`, `state` (gravado com `SEGUNDOS_DO_ESTADO`). Falta de variável → `InstagramNaoConfigurado` (mensagem cita as três e `docs/instagram.md`).
- Troca: `GET {GRAPH}/oauth/access_token?client_id&client_secret&redirect_uri&code`. Depois, `descobrirConta`; o ID descoberto entra na credencial.
- `descobrirConta`: `GET {GRAPH}/me/accounts?fields=instagram_business_account` → primeiro `instagram_business_account.id`; sem resultado ou erro que não seja 190 → `null` (a tela pede o ID). Comentário no código: caminho a confirmar com a conta real.
- Erro da Graph com `error.code === 190` → `ErroDoInstagram(…, 401, 'token-recusado')`; demais → `(…, 502, 'meta')`. Toda chamada com `AbortSignal.timeout(15_000)`.
- `lerDados`: perfil `GET /{contaId}?fields=username,followers_count,media_count`; mídias `GET /{contaId}/media?fields=id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count&limit=50`, seguindo `paging.next` até `TETO_DE_POSTS`; insights (`reach, views, saved, shares, profile_visits, follows, ig_reels_avg_watch_time`), uma métrica por chamada, só para posts dentro de `DIAS_COM_INSIGHTS`; métrica recusada (code 100) vira `undefined`. Mapeamento: `media_product_type === 'REELS'` → `reels`; `media_type === 'CAROUSEL_ALBUM'` → `carrossel`; senão `imagem`. `miniatura = thumbnail_url ?? media_url`.
- `dadosComCache`: lê/grava `instagram-cache:<id>` com `SEGUNDOS_DO_CACHE`; `atualizar` ignora a leitura. `desconectar` apaga credencial e cache.

- [ ] **Step 1: Testes que falham** (com `ArmazemMemoria` e um `buscar` falso que responde por URL):
  - `convitePara` sem `META_CONFIG_ID` lança `InstagramNaoConfigurado`; com ambiente completo, a URL contém `config_id=1675370737517616` e o `state` gravado aponta para o usuário;
  - `donoDoEstado` devolve o usuário uma vez e `null` na segunda;
  - `guardarCredencial` grava `{ token, contaId: '17841400224855713', conectadoEm }` quando `/me/accounts` devolve a conta, e sem `contaId` quando devolve lista vazia;
  - `lerDados` mapeia um Reel e um carrossel; métrica respondida com code 100 vira `undefined`; post de 120 dias atrás vem sem insights e sem chamada de insights para ele;
  - paginação para em `TETO_DE_POSTS`;
  - resposta Graph com `code: 190` lança `ErroDoInstagram` com `codigo: 'token-recusado'` e `estado: 401`;
  - `dadosComCache` chama a Meta uma vez em duas leituras seguidas e de novo com `atualizar: true`.
- [ ] **Step 2:** `npx vitest run src/servidor/instagram.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm run verificar` → PASS.
- [ ] **Step 5:** Commit `o servidor conecta e lê o Instagram, e só o 190 conta como token perdido`.

### Task 4: Rotas e funções da Vercel

**Files:**
- Create: `src/servidor/paginaDeVolta.ts` (extraída de `rotasGoogle.ts`)
- Modify: `src/servidor/rotasGoogle.ts` (passa a importar `paginaDeVolta`)
- Create: `src/servidor/rotasInstagram.ts`, `src/servidor/rotasInstagram.test.ts`
- Create: `api/instagram-conectar.ts`, `api/instagram-callback.ts`, `api/instagram-estado.ts`, `api/instagram.ts`, `api/instagram-conta.ts`, `api/instagram-desconectar.ts`
- Modify: `src/servidor/api.test.ts` (`METODOS`)

**Interfaces:**
- Consumes: Tarefa 3 inteira; `validarSessao` de `./contas.ts`; `armazem`, `proteger` de `./vercel.ts`.
- Produces:
  ```ts
  // paginaDeVolta.ts
  export function paginaDeVolta(deuCerto: boolean, titulo: string, mensagem: string): Response;
  // rotasInstagram.ts
  export function voltaDoInstagram(pedido: Request): string; // new URL('/api/instagram-callback', pedido.url)
  export function rotaInstagramConectar(pedido: Request, armazem: Armazem, ambiente: AmbienteDoInstagram): Promise<Response>; // POST → { url }
  export function rotaInstagramCallback(pedido: Request, armazem: Armazem, ambiente: AmbienteDoInstagram, buscar?: typeof fetch): Promise<Response>; // GET → HTML
  export function rotaInstagramEstado(pedido: Request, armazem: Armazem): Promise<Response>; // GET → { conectado, conectadoEm, contaId }
  export function rotaInstagram(pedido: Request, armazem: Armazem, buscar?: typeof fetch, agora?: () => Date): Promise<Response>; // GET (?atualizar=1) → DadosDoInstagram
  export function rotaInstagramConta(pedido: Request, armazem: Armazem): Promise<Response>; // POST { contaId } → { contaId }
  export function rotaInstagramDesconectar(pedido: Request, armazem: Armazem): Promise<Response>; // POST → { conectado: false }
  ```
- Respostas de erro JSON: `{ erro: 'sessao-invalida' }` 401; `{ erro: 'instagram-nao-configurado' }` 500; `{ erro: 'nao-conectado' }` 409; `{ erro: 'sem-conta' }` 409; `{ erro: 'token-recusado' }` 401; `{ erro: 'meta' }` 502; `{ erro: 'conta-invalida' }` 400 (ID fora de `/^\d{5,30}$/`).

- [ ] **Step 1: Testes que falham** em `rotasInstagram.test.ts` (padrão de `rotasGoogle.test.ts`):
  - conectar sem sessão → 401; com sessão → 200 e `url` com `config_id`;
  - callback com `state` desconhecido, vencido ou já gasto → 400, HTML, nada gravado;
  - callback com `error=access_denied` → 400 com mensagem de autorização negada;
  - callback válido → 200 e credencial gravada;
  - `rotaInstagram` sem credencial → 409 `nao-conectado`; sem `contaId` → 409 `sem-conta`; Meta com 190 → 401 `token-recusado`; Meta 500 → 502 `meta`;
  - `rotaInstagramConta` com `'abc'` → 400; com `'17841400224855713'` → 200 e o próximo `rotaInstagram` usa esse ID;
  - desconectar apaga credencial e cache.
  - Em `api.test.ts`, as seis entradas novas: `instagram-callback.ts: ['GET']`, `instagram-estado.ts: ['GET']`, `instagram.ts: ['GET']`, as outras `['POST']`.
- [ ] **Step 2:** `npx vitest run src/servidor` → FAIL.
- [ ] **Step 3:** Extrair `paginaDeVolta` (o Google passa `'Agenda conectada'`/`'Não deu para conectar'` como título e segue idêntico; `rotasGoogle.test.ts` tem de continuar verde sem mudar). Implementar as rotas e os seis arquivos em `api/`, cada um com uma linha como `api/google-conectar.ts`.
- [ ] **Step 4:** `npm run verificar` → PASS.
- [ ] **Step 5:** Commit `rotas do Instagram, e a página de volta passa a servir os dois provedores`.

### Task 5: Cliente — `useInstagram`

**Files:**
- Create: `src/dados/instagram.ts`, `src/dados/instagram.test.ts`

**Interfaces:**
- Consumes: as respostas da Tarefa 4; `DadosDoInstagram` da Tarefa 2.
- Produces:
  ```ts
  export const METODO_INSTAGRAM: Record<string, 'GET' | 'POST'>; // as seis rotas
  export class ErroDoInstagramNoCliente extends Error { readonly estado: number; readonly codigo?: string }
  export function falarComInstagram<T>(caminho: string, corpo?: unknown, buscar?: typeof fetch): Promise<T>;
  export function situacaoDoErro(erro: unknown): 'desconectado' | 'sem-conta' | 'acesso-perdido' | 'erro';
  export type EstadoDoInstagram = 'carregando' | 'desconectado' | 'sem-conta' | 'acesso-perdido' | 'erro' | 'pronto';
  export interface Instagram {
    estado: EstadoDoInstagram; dados?: DadosDoInstagram; erro?: string; atualizando: boolean;
    atualizar(): Promise<void>; conectar(): Promise<void>; desconectar(): Promise<void>;
    definirConta(contaId: string): Promise<void>;
  }
  export function useInstagram(): Instagram;
  ```
- `falarComInstagram` segue `falar` de `src/dados/google.ts`: token de `localStorage['msl-sessao']`, método da tabela, `GET` sem corpo, `AbortSignal.timeout(45_000)`. `conectar` faz `window.location.assign(url)`. `situacaoDoErro`: `nao-conectado` → desconectado; `sem-conta` → sem-conta; `token-recusado` com 401 → acesso-perdido; `sessao-invalida` 401 → erro (não é o Instagram); resto → erro.

- [ ] **Step 1: Testes que falham** — `situacaoDoErro` para cada código acima (em especial: 401 `sessao-invalida` **não** é `acesso-perdido`); `falarComInstagram('/api/instagram-estado')` usa `GET` sem corpo e com `Authorization`.
- [ ] **Step 2:** `npx vitest run src/dados/instagram.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm run verificar` → PASS.
- [ ] **Step 5:** Commit `o cliente fala com o Instagram e separa token perdido de sessão perdida`.

### Task 6: Ajustes — cartão "Instagram"

**Files:**
- Modify: `src/telas/Ajustes.tsx` (componente `ContaDoInstagram`, logo abaixo de `<ContaDoGoogle />`)
- Create: `docs/instagram.md` (passo a passo: endereço de retorno no painel da Meta, as três variáveis na Vercel, Redeploy)
- Test: `e2e/instagram.spec.ts` (parte de Ajustes)

**Interfaces:**
- Consumes: `useInstagram` (Tarefa 5).

Conteúdo por estado: **desconectado** — explica em uma frase e mostra **Conectar**; **sem-conta** — campo "ID da conta do Instagram" + **Salvar** (chama `definirConta`); **acesso-perdido** — "A Meta deixou de aceitar a conexão" + **Conectar de novo**; **pronto** — `@usuario`, seguidores e **Desconectar**; **erro** — a mensagem e **Tentar de novo**. Mesmo `Card`/botões que `ContaDoGoogle` usa.

- [ ] **Step 1: Teste e2e que falha** — com `page.route('**/api/instagram-estado', …)` e `page.route('**/api/instagram', …)` (padrão de `e2e/pedir-ajustes.spec.ts`): desconectado mostra **Conectar**; `sem-conta` mostra o campo e o POST em `/api/instagram-conta` leva `{ contaId }`; conectado mostra `@_luizpereira_`.
- [ ] **Step 2:** `npx playwright test e2e/instagram.spec.ts` → FAIL.
- [ ] **Step 3:** Implementar o cartão e escrever `docs/instagram.md`.
- [ ] **Step 4:** `npm run verificar && npm run build && npx playwright test e2e/instagram.spec.ts` → PASS.
- [ ] **Step 5:** Commit `Ajustes ganha o cartão do Instagram`.

### Task 7: A aba Instagram na Criação

**Files:**
- Create: `src/telas/PainelDoInstagram.tsx`
- Modify: `src/telas/Criacao.tsx` (abas Peças/Instagram por `?aba=instagram`; métricas na linha da peça ligada)
- Test: `e2e/instagram.spec.ts` (parte da Criação)

**Interfaces:**
- Consumes: `useInstagram` (Tarefa 5); `dividirPorPeriodo`, `resumir`, `porFormato`, `recomendar` (Tarefa 2); `criarPeca`, `editarPeca` de `useBanco()`; `Peca.instagramPostId` (Tarefa 1).
- Produces: `export function PainelDoInstagram(): JSX.Element`.

Tela conforme a spec, seção "A tela": cabeçalho (@, seguidores, "atualizado há X", **Atualizar**), seletor 30/90/tudo (padrão 90), seis cartões com variação contra o anterior (escondida quando o anterior está vazio ou em `'tudo'`), bloco de formato, recomendações (texto + evidência + link do post + **Criar semente**: `criarPeca` com `estado: 'semente'`, título = texto da recomendação, corpo = evidência), lista de posts ordenável com **Ligar a uma peça** (diálogo com as peças `publicado` sem `instagramPostId`; grava pelo `editarPeca`). Na aba Peças, a peça com `instagramPostId` presente nos dados mostra alcance, salvamentos e compartilhamentos; se o post não está nos dados, nada aparece. No iPhone, cartões em duas colunas e posts como lista de cartões. Estados: carregando, desconectado (aviso + link para `/app/ajustes`), sem-conta, acesso-perdido, erro, período vazio.

- [ ] **Step 1: Testes e2e que falham** (`mac` e `iphone`, API simulada com 8 posts de exemplo):
  - `/app/criacao?aba=instagram` mostra `@_luizpereira_`, os cartões e ao menos uma recomendação;
  - trocar para 30 dias muda a contagem de posts;
  - **Criar semente** faz a peça aparecer na aba Peças como semente;
  - **Ligar a uma peça** numa peça publicada faz a linha dela mostrar o alcance do post;
  - `instagram` respondendo 401 `token-recusado` mostra o aviso de reconectar;
  - período sem posts mostra o estado vazio e nenhum `NaN` na tela.
- [ ] **Step 2:** `npx playwright test e2e/instagram.spec.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm run verificar && npm run build && npm run test:e2e` → PASS (suíte inteira, nos dois projetos).
- [ ] **Step 5:** Acrescentar ao `AGENTS.md`, em "Domain rules", uma regra curta: métricas do Instagram não entram no banco (só o token no servidor e `instagramPostId` na peça), e "sem dado" não é zero. Commit `a Criação ganha a aba Instagram, ligada às peças`.
