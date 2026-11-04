# Estúdio — referências e geração de posts na Criação

> **Mudança depois da implementação (2026-11-03):** o Luiz decidiu não ter IA
> dentro do sistema. A geração pelo Claude (rota `instagram-gerar`, chave
> `ANTHROPIC_API_KEY`, limite diário) saiu. No lugar: **Montar prompt** →
> **Copiar prompt** → **Colar a resposta** → os mesmos ganchos e "Salvar como
> peça". "Pedir ajuste" monta um novo prompt. As referências não mudaram.


## O pedido

Criar posts mais rápido e com mais chance de dar resultado, a partir do que o
painel do Instagram já sabe. São duas coisas:

1. um espaço para guardar referências de criadores conhecidos;
2. a geração do post, com prompt montado automaticamente e texto devolvido
   pronto.

**Escolhas do Luiz:**

- o MSL gera o texto direto, pela API do Claude;
- as referências são perfis cadastrados pelo @, com os posts puxados da Meta;
  ele marca os que quer usar e anota por que funcionam;
- a geração entrega **roteiro de Reel** ou **carrossel**, mais **3 ganchos
  alternativos**;
- a legenda fica fora desta versão.

**Virada de decisão.** O `DECISOES.md` (d) registrou que a área de pedir à IA
"não conversa com modelo nenhum". Este desenho muda isso para a geração de
posts, e só para ela, com estas salvaguardas:

- chave só no servidor;
- limite diário de gerações;
- nada de prompt nem resposta crua guardados.

O compositor de pedidos ao sistema continua como está. Registrar a mudança no
`DECISOES.md`.

## Telas

A Criação passa a ter três abas: **Peças · Estúdio · Instagram** (`?aba=estudio`).
O Estúdio tem duas vistas em pílulas: **Gerar** (padrão) e **Referências**
(`&vista=referencias`).

### Referências

- Campo "@ do perfil" + **Adicionar**. Só entra conta profissional (Comercial
  ou Criador). Se não for, ou se o @ não existir, uma mensagem clara na hora.
- Cada perfil vira um bloco com foto, @, seguidores e os posts recentes (até
  25) em grade de cartões, como a Galeria do painel.
- **Ordem dos posts:** engajamento relativo, ou seja,
  `(curtidas + comentários) / seguidores` do perfil. O selo "N× a mediana do
  perfil" usa a mediana do próprio perfil.
- **Guardar** num post abre um campo de uma linha: **"Por que funciona?"**, por
  exemplo "gancho com número", "polêmica no 1º card". O post guardado entra na
  lista **Minhas referências**, com a anotação, o @ e o link.
- É possível remover o perfil e tirar um post guardado.

### Gerar

O formulário tem:

1. **Formato:** Reel · Carrossel (pílulas).
2. **Tema:** texto livre. Pode vir preenchido por um atalho (abaixo).
3. **Referências:** até 3 das guardadas, escolhidas por toque.
4. **Gerar.**

O resultado tem:

- **3 ganchos** em cartões; tocar escolhe um, e o primeiro já vem escolhido;
- o **corpo**:
  - no Reel, o gancho dos 3 primeiros segundos, as falas em blocos, o texto
    de tela de cada bloco e o CTA;
  - no carrossel, os cards de capa → desenvolvimento → CTA, com o gancho
    escolhido na capa;
- **Pedir ajuste:** um campo de uma linha ("mais curto", "mais polêmico") que
  gera de novo mantendo o resto;
- **Salvar como peça:** cria uma peça em **rascunho**, tipo `roteiro` (Reel) ou
  `carrossel`, com o corpo no formato do MSL (carrossel com cards separados por
  `---`) e o título igual ao gancho. Depois abre a aba Peças com ela.

**Atalhos que levam ao Gerar com o tema preenchido:**

- botão **Criar com IA** em cada recomendação de "O que fazer" (o tema é o
  texto da recomendação mais a evidência);
- **Criar com IA** numa peça em `semente` (o tema é o título mais o corpo);
- **Fazer outro assim** em cada linha do ranking e cartão da galeria do painel
  (o tema é "um post na linha deste", e o post entra no contexto como
  referência própria).

## O contexto montado

Função pura `montarPedido(...)` em `src/dominio/estudio.ts`. Entra:

1. **Quem escreve:** @, nome, bio do perfil (de `PerfilDoInstagram`).
2. **Regras de escrita**, fixas no código:
   - primeira pessoa;
   - português do Brasil;
   - frases curtas;
   - sem prometer resultado garantido;
   - sem preço;
   - sem hashtags no corpo.
3. **O que funciona com ele:**
   - os 5 posts do mesmo formato com maior alcance nos últimos 90 dias,
     cada um com legenda curta, alcance, salvos + compartilhamentos e "N× a
     mediana";
   - o **gargalo atual do funil**, quando houver, com uma instrução derivada.
     Por exemplo, gargalo em "Visitaram o perfil" vira "dê um motivo concreto
     para visitar o perfil no CTA".
4. **Referências escolhidas:** @, legenda, formato, curtidas, comentários e a
   anotação "por que funciona".
5. **Tema** e, se houver, o **ajuste pedido** com o resultado anterior.
6. **Formato de saída:** JSON validado no servidor.
   - Reel:
     `{ ganchos: [3 strings], blocos: [{ fala, tela }], cta }`
   - Carrossel:
     `{ ganchos: [3 strings], cards: [string], cta }`

**Limites:**

- o contexto total fica abaixo de ~12 mil caracteres, com legendas cortadas
  em 400;
- sem dados do Instagram (desconectado ou com erro), a parte 3 sai e a geração
  segue.

## Servidor

- **Rotas novas** no despacho do `api/instagram.ts`, sem função nova na Vercel
  (lá o limite é 12 e o MSL usa 9):
  - `instagram-referencia?usuario=` (GET): lê pela `business_discovery` o
    perfil e até 25 posts, com cache de 6 h no Armazém;
  - `estudio-gerar` (POST): recebe `{ formato, tema, referencias, ajuste? }`
    e lê os dados do Instagram pelo cache que já existe.
- **Claude:**
  - chamada à Messages API, com o modelo numa variável `ESTUDIO_MODELO` e um
    padrão definido no código;
  - `ANTHROPIC_API_KEY` na Vercel;
  - tempo limite de 45 s;
  - uma nova tentativa se o JSON vier inválido.
- **Limite:** 30 gerações por dia por usuário, contadas no Armazém com a
  chave `estudio:AAAA-MM-DD:<usuario>`. Passou disso, responde
  `limite-do-dia`.
- **Erros que viram estado da tela:**

  | erro | quando |
  | --- | --- |
  | `sem-chave` | `ANTHROPIC_API_KEY` ausente |
  | `limite-do-dia` | passou de 30 gerações no dia |
  | `ia-falhou` | timeout, 5xx ou JSON inválido duas vezes |
  | `perfil-nao-encontrado` | o @ não existe |
  | `perfil-nao-profissional` | a conta não é Comercial nem Criador |
  | `permissao-faltando` | a Meta recusou com código 10/200 na `business_discovery`; a tela pede para adicionar `pages_read_engagement` na configuração do app e reconectar |

## Banco (versão 20, migração aditiva)

- coleção `referencias: Referencia[]`, em que

  ```ts
  interface Referencia extends Registro {
    usuario: string;      // @ sem arroba
    postId: string;
    link: string;
    legenda: string;
    formato: FormatoDoPost;
    curtidas: number;
    comentarios: number;
    seguidoresDoPerfil: number;
    miniatura?: string;
    porQue: string;       // a anotação
  }
  ```

  A miniatura pode expirar; sem ela, o cartão mostra o ícone do formato.
- coleção `perfisDeReferencia: PerfilDeReferencia[]` (`Registro` + `usuario`): os @
  cadastrados. É coleção, e não lista de strings, para sincronizar e apagar
  entre aparelhos como as outras (lápides em `removidos`).
- `Peca.geradaPorIa?: boolean` e `Peca.referenciasUsadas?: string[]` (ids de
  `Referencia`).
- A migração 19 → 20 cria as duas coleções vazias e sobe a versão. Os
  campos novos da peça são opcionais.

## Fora de escopo

- legenda;
- publicar ou agendar no Instagram;
- ler perfis pessoais (não profissionais);
- TikTok e LinkedIn;
- histórico de gerações;
- imagens geradas.

## Testes

- **Domínio:**
  - `montarPedido` com e sem referências, sem dados do Instagram, com ajuste e
    acima do limite de tamanho (corta);
  - instrução do gargalo para cada degrau;
  - `ordenarReferencia` (engajamento relativo, mediana do perfil);
  - conversão do JSON do Claude em `corpo` de peça (Reel e carrossel).
- **Servidor:**
  - `business_discovery` simulada: profissional, não profissional, inexistente
    e permissão faltando;
  - cache;
  - limite do dia;
  - chave ausente;
  - JSON inválido → nova tentativa → `ia-falhou`.
- **Ponta a ponta (Meta e Claude simulados):**
  - adicionar perfil, guardar post com anotação, gerar carrossel com 1
    referência, escolher o 2º gancho e salvar;
  - verificar que a peça aparece em Peças como rascunho, com os cards;
  - o atalho "Criar com IA" a partir de "O que fazer" preenche o tema;
  - sem chave, aparece o aviso.

## Ordem de implementação

1. **Sondagem:** chamar a `business_discovery` com o token real (só leitura)
   para confirmar a permissão. Se faltar, o Luiz ajusta a configuração da
   Meta antes do resto.
2. Domínio: `estudio.ts` e testes.
3. Servidor: referências e geração, com testes.
4. Banco v20.
5. Tela: Estúdio (Referências e Gerar) e atalhos.
6. Testes ponta a ponta, capturas de tela no desktop e no celular, revisão,
   PR.
