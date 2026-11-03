# Instagram na Criação, segunda volta — o visual e o dia

Data: 2026-11-03. Continua `2026-11-03-instagram-na-criacao-design.md` (já
publicado). Sem mudança de esquema.

## O pedido

Depois de percorrer o ChatFyre (painel, Insights, Integrações, Kit do Operador e
a página `/prompts`), levar para a aba Instagram:

1. subabas e período em pílulas;
2. funil com gargalo;
3. galeria e ranking por post;
4. "Hoje" e um item na fila do Início;
5. um cabeçalho de perfil como o do próprio Instagram — foto, nome, bio,
   posts/seguidores/seguindo, link;
6. o visual da página `/prompts`: faixa de números em blocos, filtros em
   pílulas, cartões que parecem post do Instagram, brilho no destaque.

**Fica de fora, de propósito:** a paleta laranja, o mascote e qualquer elemento
da marca ChatFyre. O MSL desenha tudo pelo seu design system (`DESIGN.md`):
leva-se o formato, não a marca. Automação de DM continua V2.

## Perfil

`PerfilDoInstagram` ganha campos opcionais: `nome`, `bio`, `foto` (URL),
`seguindo`, `site`. O servidor pede à Graph
`username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website`.
Campo que não vier fica ausente; a tela só desenha o que existe.

Cabeçalho (substitui o cartão da conta):

- foto redonda com anel em gradiente roxo do design system; sem foto, inicial
  do @ sobre o fundo;
- `@usuario` grande, `nome` embaixo, `bio` com no máximo 3 linhas e "mais"
  para abrir;
- três números em linha: **posts · seguidores · seguindo**;
- link do site, se houver;
- botões **Atualizar** e **Abrir no Instagram**; "atualizado há X".

## Estrutura

Abaixo do cabeçalho, duas fileiras de pílulas:

- período: **7 · 30 · 90 · Tudo** (padrão 30). `Periodo` ganha o 7;
- vista: **Visão geral · Ranking · Galeria**, com endereço próprio
  (`/app/criacao?aba=instagram&vista=ranking`).

### Visão geral

1. **Hoje** — só aparece quando há o que dizer (abaixo).
2. **Faixa de números** — os seis indicadores de hoje em blocos no formato do
   `/prompts`: número grande, rótulo em caixa alta, variação embaixo (cor pelo
   sentido, como já é).
3. **Funil** (abaixo).
4. Formato e recomendações, como já estão.

### Ranking

Uma linha por post: posição, miniatura, legenda curta, formato, a métrica
escolhida e **quantas vezes a mediana** ("3,1×"). Ordenável por alcance,
salvos+compart., visitas e seguidores (pílulas). **Ligar a uma peça** fica na
linha.

### Galeria

Grade de cartões no formato de post do Instagram (`/prompts`): cabeçalho com
foto e @, imagem 4:5, selo do formato, legenda curta e a métrica escolhida no
rodapé. O melhor post do período ganha a borda com brilho. Sem miniatura, um
bloco com o ícone do formato. Tocar abre o post no Instagram.

## Funil

`funil(posts)` em `src/dominio/instagram.ts`, sobre os posts **de feed** que
têm visitas ao perfil (a Meta não informa visitas nem seguidores para Reels; a
tela diz isso numa linha):

| degrau | soma de |
| --- | --- |
| Alcance | `alcance` |
| Interações | curtidas + comentários + salvos + compart. |
| Guardaram | salvos + compart. |
| Visitaram o perfil | `visitasAoPerfil` |
| Seguiram | `seguidoresGanhos` |

Cada degrau traz o total e a taxa sobre o de cima. O de **menor taxa** é o
gargalo e leva "▲ maior queda". Com menos de `MINIMO_POR_FORMATO` posts com
dado, o funil não aparece. A variação contra o período anterior, quando o
anterior foi lido inteiro, vem em **pontos percentuais**.

## Hoje

`hoje(dados, hoje)` em `src/dominio/instagram.ts`:

- `novos`: posts dos últimos 2 dias, cada um com a razão do alcance sobre a
  mediana do seu formato nos últimos 90 dias (com pelo menos 3 posts do
  formato; senão sem razão);
- `diasSemPostar`: dias desde o último post;
- `acoes`: no máximo duas, nesta ordem de força —
  - post dos últimos 2 dias com alcance ≥ 2× a mediana do formato →
    "Seu {formato} de {quando} está com {r}× o alcance normal. Responda os
    comentários enquanto está quente.";
  - `diasSemPostar` ≥ 5 → "{n} dias sem postar no Instagram.".

O bloco Hoje só aparece se houver post novo ou ação.

## Fila do Início

`itemDoInstagram(dados, hoje): ItemDoFoco | null` — a primeira ação do Hoje,
como item de tipo `instagram`, faixa 6 (depois de projeto parado), não marcável,
destino `/app/criacao?aba=instagram`. **No máximo um item.** O Início lê os
dados pelo `useInstagram` (que vai ao cache de uma hora do servidor); sem
conexão ou com erro, não há item e nada muda na fila.

## Testes

- Domínio: `funil` (gargalo, Reels de fora, poucos posts → nulo),
  `hoje` (post forte, dias sem postar, nada a dizer), `itemDoInstagram`,
  período 7.
- Servidor: os campos novos do perfil chegam e ausentes ficam ausentes.
- Ponta a ponta: cabeçalho com foto e números; pílulas de período e vista;
  ranking ordena; galeria abre; Hoje aparece; o item do Instagram na fila do
  Início leva à aba.
