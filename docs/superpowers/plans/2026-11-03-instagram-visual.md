# Instagram — o visual e o dia: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Cabeçalho de perfil, pílulas de período e vista, funil com gargalo, Hoje, ranking, galeria e um item na fila do Início.

**Architecture:** Cálculo novo em `src/dominio/instagram.ts` (puro, testado). Servidor só pede mais campos do perfil. A tela `PainelDoInstagram.tsx` se reorganiza em vistas; o Início ganha um item vindo do Instagram.

**Spec:** `docs/superpowers/specs/2026-11-03-instagram-visual-design.md`

## Global Constraints
- Tudo visual pelo design system (`DESIGN.md`, tokens `var(--…)`); nada da marca ChatFyre.
- Sem dado não é zero; variação de taxa em pontos percentuais; datas por `diaLocalDe`.
- `MINIMO_POR_FORMATO = 3`; Hoje: janela de 2 dias, forte ≥ 2× a mediana, `diasSemPostar` ≥ 5, no máximo 2 ações; fila: no máximo 1 item do Instagram, faixa 6.
- Gate: `TZ=America/Sao_Paulo npm run verificar && npm run build && npx playwright test --project=mac`.

## Review Focus
1. Conta sem posts de feed com visitas → funil some, sem NaN.
2. Formato com < 3 posts em 90 dias → post novo sem razão, nenhuma ação "forte".
3. Perfil sem foto, sem bio, sem site → cabeçalho sem buracos.
4. Início sem Instagram conectado ou com erro → fila idêntica à de antes.
5. Post publicado hoje às 23h em São Paulo → conta como hoje, não amanhã.

---

### Task 1: Domínio — período 7, funil, Hoje e item da fila
**Files:** `src/dominio/instagram.ts`, `src/dominio/instagram.test.ts`, `src/dominio/foco.ts` (tipo `instagram`).
**Produces:**
```ts
export type Periodo = 7 | 30 | 90 | 'tudo';
export interface DegrauDoFunil { nome: string; total: number; taxa: number | null }
export interface Funil { degraus: DegrauDoFunil[]; gargalo: number; posts: number }
export function funil(posts: PostDoInstagram[]): Funil | null;
export interface Hoje { novos: { post: PostDoInstagram; razao: number | null }[]; diasSemPostar: number | null; acoes: string[] }
export function hoje(dados: DadosDoInstagram, dia: string): Hoje;
export function itemDoInstagram(dados: DadosDoInstagram, dia: string): ItemDoFoco | null;
```
- [ ] Testes que falham (funil: gargalo, Reels fora, < 3 posts → null; hoje: post forte, 6 dias sem postar → ação, nada → vazio, 23h local; item: chave `instagram:hoje`, tipo `instagram`, faixa 6, `marcavel: false`; período 7).
- [ ] Implementar; `TipoDoFoco` ganha `'instagram'`.
- [ ] `npm run verificar`; commit.

### Task 2: Servidor — os campos do perfil
**Files:** `src/servidor/instagram.ts`, `src/servidor/instagram.test.ts`, `PerfilDoInstagram` (+ `nome?`, `bio?`, `foto?`, `seguindo?`, `site?`).
- [ ] Teste que falha: todos os campos chegam; ausentes ficam ausentes.
- [ ] Implementar; verificar; commit.

### Task 3: A tela
**Files:** `src/telas/PainelDoInstagram.tsx`, `e2e/instagram.spec.ts`.
- [ ] e2e que falham: cabeçalho (foto, @, bio, 3 números, site); pílulas de período (7 muda a contagem) e de vista (URL `vista=`); Hoje aparece com post forte; funil com "maior queda"; ranking ordena e mostra "×"; galeria mostra cartões e o destaque.
- [ ] Implementar; checar tela no desktop e no celular (capturas); verificar + build + e2e; commit.

### Task 4: Início
**Files:** `src/telas/Inicio.tsx` (DESTINO/ICONE e a fila), `e2e/instagram.spec.ts`.
- [ ] e2e que falha: com 6 dias sem postar, o Início mostra o item e ele leva a `/app/criacao?aba=instagram`; sem conexão, nada.
- [ ] Implementar; suíte inteira sem regressão; commit.
