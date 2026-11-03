# Instagram no MSL — a configuração

O MSL lê o Instagram pelo app **Métricas Adt** da Meta (App ID
`1619333876341872`), com o produto Instagram em *login unificado*. A
configuração de login já existe: `config_id` `1675370737517616`.

A configuração emite **token de usuário do sistema (SUAT), que não expira** —
conferido no painel, em *Prévia* da configuração. Se um dia ela for trocada por
uma de token de usuário comum, o token passa a durar horas e o MSL vai pedir
para conectar de novo a cada visita.

Faz-se uma vez. Depois disso, conectar é um clique em **Ajustes → Instagram**.

## 1. O endereço de volta, no painel da Meta

Em developers.facebook.com → Meus apps → **Métricas Adt** → Instagram →
**API setup with Unified login** → *URL de redirecionamento*:

```
https://msl-delta.vercel.app/api/instagram-callback
```

Clique em **Salvar**. O painel recusa `localhost`, mas aceita este.

## 2. As três variáveis, na Vercel

Projeto do MSL → Settings → Environment Variables (Production):

| Nome | Valor |
| --- | --- |
| `META_APP_ID` | `1619333876341872` |
| `META_APP_SECRET` | a *Chave secreta do app*, em Configurações do app → Básico |
| `META_CONFIG_ID` | `1675370737517616` |

O segredo é senha: cole direto na Vercel, nunca em chat nem no repositório.

## 3. Redeploy

Variável nova só vale num deploy novo: Deployments → o último → **Redeploy**.

## 4. Conectar

Ajustes → **Instagram** → **Conectar**, autorize com o `@_luizpereira_` e
volte. Se a tela pedir o *ID da conta*, o do perfil é `17841400224855713`.

## Se der errado

- **"faltam as variáveis da Meta"** — passo 2 ou 3.
- **A Meta reclama do redirect_uri** — passo 1, o endereço precisa ser idêntico.
- **"A Meta deixou de aceitar a conexão"** — o token caiu; conecte de novo.

## Estúdio (referências e geração)

- **Perfis de referência:** `GET /api/instagram-referencia?usuario=<@>` lê pela
  `business_discovery` da Graph (só funciona com o login do Facebook, que é o
  do MSL) o perfil e até 25 posts de outra conta **profissional**. Fica 6 h em
  cache (`estudio-ref:<usuario>`). Se a Meta recusar com código 10/200, falta
  `pages_read_engagement` na configuração do Login para Empresas: adicione e
  reconecte em Ajustes.
- **Geração:** `POST /api/instagram-gerar` com `{ formato, tema, referencias, ajuste? }`.
  Chama a Messages API do Claude com o contexto montado por
  `src/dominio/estudio.ts` (seus melhores posts do formato, o gargalo do
  funil, as referências com o porquê).
- **Variáveis na Vercel:** `ANTHROPIC_API_KEY` (obrigatória para gerar) e
  `ESTUDIO_MODELO` (opcional; padrão `claude-sonnet-5-5`).
- **Limite:** 30 gerações por dia por usuário (`estudio:AAAA-MM-DD:<usuarioId>`).
- **Nada de prompt nem resposta é guardado.** Só a peça que eu salvar, com
  `geradaPorIa` e `referenciasUsadas`.
