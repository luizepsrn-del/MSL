# Instagram na Criação — o desenho

Data: 2026-11-03. Esquema hoje na versão 18; este trabalho sobe uma versão
(19, ou a seguinte se outra mudança de esquema entrar antes).

## O pedido

Transformar a Criação num lugar de rede social, no espírito do ChatFyre:
o MSL vinculado ao Instagram pessoal (@_luizpereira_), mostrando métricas,
o que funciona e o que postar em seguida.

Decidido na conversa:

- **V1 = métricas + recomendações.** Automação de DM e publicação agendada
  ficam fora (exigem webhooks, permissões de mensagem/publicação e análise do
  app pela Meta).
- **Recomendações por regras sobre os dados**, sem modelo de IA — o mesmo
  princípio do agente local (`src/dominio/agente.ts`).
- **Duas abas ligadas:** "Peças" (o que já existe) e "Instagram". Uma peça
  publicada pode ser ligada ao post correspondente.

## O que já existia, e o que se copia

A integração com o Google é o molde: cartão em Ajustes com "Conectar", OAuth
com retorno numa rota `/api`, token guardado no `Armazem` do servidor (Redis),
rotas finas em `api/*.ts` que delegam para `src/servidor/*`, e testes de rota
com `ArmazemMemoria` e o provedor simulado.

Prova de conceito feita em 2026-11-03: com um token do painel da Meta, a rota
`graph.facebook.com/v25.0/{ig-id}` e `/{media-id}/insights` devolveram perfil,
58 posts e as métricas abaixo. As métricas recusadas por tipo de mídia estão
registradas na seção "O que a Meta entrega".

## Conexão

- App da Meta: **Métricas Adt** (App ID 1619333876341872), produto Instagram
  com *login unificado* (Facebook Login for Business). Configuração existente:
  `config_id` 1675370737517616.
- Fluxo: Ajustes → cartão **Instagram** → **Conectar** → `POST /api/instagram-conectar`
  devolve a URL do diálogo
  `https://www.facebook.com/v25.0/dialog/oauth?client_id=…&config_id=…&redirect_uri=…&response_type=code&override_default_response_type=true&state=…`.
- Retorno: `GET /api/instagram-callback` troca o `code` por token em
  `graph.facebook.com/v25.0/oauth/access_token` (GET, com `client_secret`).
  O `state` amarra o retorno à sessão, como no Google.
- O endereço de retorno `https://msl-delta.vercel.app/api/instagram-callback`
  precisa ser registrado no painel da Meta (o painel recusa `localhost`, mas
  aceita HTTPS de domínio real).
- **Descobrir o ID da conta do Instagram** depois do login. Caminho a validar
  na implementação: os ativos concedidos ao token. Se a Meta não expuser o ID
  por esse caminho, Ajustes ganha um campo para colar o ID (não é segredo).
- Variáveis de ambiente na Vercel: `META_APP_ID`, `META_APP_SECRET`,
  `META_CONFIG_ID`. O usuário cola os valores; nenhum segredo passa pelo chat.
- Desconectar: `POST /api/instagram-desconectar` apaga o token do armazém.
- Token recusado pela Meta (código 190): a tela diz que é preciso conectar de
  novo — mesma regra do Google: só o erro de autenticação conta como acesso
  perdido; outros erros são mostrados como falha temporária.

## Os dados

**Métricas não entram no banco.** Pertencem ao Instagram, e uma cópia guardada
envelhece — a mesma regra dos eventos do Google. Só se grava:

- no servidor: o token e o ID da conta, por conta do MSL;
- no banco: o campo novo da peça (abaixo).

`GET /api/instagram` devolve o perfil e os posts com métricas; o filtro de período é feito no cliente, sobre a mesma resposta em cache.
O servidor guarda em cache a última leitura por ~1 hora (chave com expiração no
`Armazem`); `?atualizar=1` ignora o cache.

O que é lido por post: `id, caption, media_type, media_product_type,
timestamp, permalink, thumbnail_url/media_url, like_count, comments_count` e,
em insights, uma métrica por chamada (para que uma recusa não derrube as
outras): `reach, views, saved, shares, total_interactions, profile_visits,
follows, ig_reels_avg_watch_time`.

Limite: posts dos últimos ~90 dias para insights (o resto só com curtidas e
comentários), para caber no tempo de uma função da Vercel.

### O que a Meta entrega (observado em 2026-11-03)

- Feed (imagem/carrossel): todas, exceto `ig_reels_avg_watch_time`.
- Reels: todas, exceto `profile_visits` e `follows`.
- Posts antigos (antes de ~2024): sem `views`; os mais antigos, sem insights.

Ausência é **"sem dado"**, nunca zero.

### Mudança de esquema

`Peca` ganha `instagramPostId?: string` — o ID da mídia no Instagram. Aditivo,
com migração que não faz nada além de subir a versão, como o projeto exige.
Ligar um post a uma peça só é oferecido para peças `publicado`.

## A tela

A Criação ganha duas abas: **Peças** (inalterada) e **Instagram**, com URL
própria (`/app/criacao?aba=instagram` — as rotas do produto são `/app/:pilar`, então a aba vai na consulta, não no caminho).

1. Cabeçalho: @conta, seguidores, "atualizado há X", botão **Atualizar**.
   Sem conexão: aviso com **Conectar** (leva a Ajustes).
2. Seletor de período: 30 dias, 90 dias, tudo.
3. Cartões: alcance médio por post, posts no período, salvamentos e
   compartilhamentos médios, visitas ao perfil, seguidores ganhos — cada um
   com a variação contra o período anterior **em pontos percentuais** quando
   for taxa, em valor quando for contagem.
4. Formato: Reels × carrossel × imagem — quantidade e alcance médio.
5. Recomendações (até 5), cada uma com o número que a sustenta e o post de
   exemplo. Atalho: **Criar semente a partir desta recomendação**.
6. Posts: tabela ordenável (alcance, salvamentos, compartilhamentos, visitas,
   data), com miniatura, legenda curta, link para o Instagram e **Ligar a uma
   peça**. No iPhone vira lista de cartões.

Na aba Peças, uma peça ligada mostra alcance, salvamentos e compartilhamentos
do post (lidos da mesma resposta da API, nunca guardados).

Estados: sem conexão · carregando · token recusado · erro temporário ·
nenhum post no período.

## As recomendações

Arquivo `src/dominio/instagram.ts`, testado. Derivadas, nunca gravadas; cada
uma traz o número que a sustenta. No máximo `LIMITE_DE_RECOMENDACOES = 5`,
ordenadas pelo tamanho do efeito.

1. **Formato sub-usado** — alcance médio do formato ≥ 1,5× o dos demais e
   participação < 30% dos posts.
2. **O que trouxe seguidores** — posts com visitas ao perfil ou seguidores
   ganhos ≥ 3× a mediana.
3. **O que as pessoas guardam** — salvamentos + compartilhamentos ≥ 3× a
   mediana.
4. **O que não está funcionando** — quartil inferior de alcance que também
   ficou abaixo da mediana de visitas.
5. **Ritmo** — posts por semana contra o período anterior; semana sem post
   é sinalizada.
6. **Retenção do Reel** — tempo médio assistido e o Reel que mais segurou.

Regras de honestidade dos números:

- formato com menos de 3 posts no período não gera regra;
- comparações usam mediana junto com a média, para um post fora da curva não
  decidir sozinho;
- métrica ausente fica fora do cálculo daquela regra, nunca conta como zero.

## Testes

- `src/dominio/instagram.test.ts`: cada regra, com dados de exemplo baseados
  nos números reais de 2026-11-03; os limiares e o teto de 5.
- `src/servidor/rotasInstagram.test.ts`: conectar, callback (state inválido,
  troca de código), leitura com cache, erro 190 → acesso perdido, outras
  falhas → temporário, desconectar. `ArmazemMemoria` e Meta simulada.
- `src/dados/esquema.test.ts`: o caminho de migração novo.
- `e2e/criacao-instagram.spec.ts`: a aba nos projetos `mac` e `iphone`, com a
  API simulada — conectado, sem conexão e token recusado.

Gate: `npm run verificar && npm run build` e `npm run test:e2e`.

## Fora desta versão

Automação de DM, publicação e agendamento no Instagram, outras contas além da
pessoal, análise por IA, histórico de seguidores ao longo do tempo (exigiria
gravar números — decisão separada).
