# Ligar o Google Agenda nos dois sentidos

Isto se faz **uma vez**. Depois o MSL conversa com o seu Google sozinho.

O que você vai obter no fim: um **Client ID** e um **Client Secret**, que vão em
duas variáveis na Vercel. Nenhum dos dois entra no código — o repositório é
público.

---

## 1. Criar o projeto no Google Cloud

1. Abra <https://console.cloud.google.com/>.
2. No seletor de projeto, em cima, clique em **Novo projeto**.
3. Nome: `My System Life`. Criar.
4. Espere terminar e **selecione o projeto novo** no seletor.

## 2. Ligar a API do Calendário

1. Menu ☰ › **APIs e serviços** › **Biblioteca**.
2. Procure por **Google Calendar API**.
3. Abra e clique em **Ativar**.

## 3. A tela de consentimento

1. **APIs e serviços** › **Tela de consentimento OAuth**.
2. Tipo de usuário: **Externo**. Criar.
3. Preencha o mínimo:
   - Nome do app: `My System Life`
   - E-mail de suporte: o seu
   - E-mail do desenvolvedor: o seu
4. Salvar e continuar.
5. Em **Escopos**, clique em **Adicionar ou remover escopos**, procure por
   `calendar.events` e marque:

   ```
   https://www.googleapis.com/auth/calendar.events
   ```

   É o escopo que permite **ver e editar eventos**. Não peço acesso à lista de
   agendas nem a nada além disso.
6. Salvar e continuar até o fim.

## 4. Passar para produção — o passo que evita reconectar toda semana

Ainda na **Tela de consentimento OAuth**, no topo, em *Status da publicação*,
clique em **PUBLICAR APP** e confirme.

> **Por que isto importa.** Enquanto o app fica em *Testing*, o Google expira o
> acesso a cada 7 dias e você teria que reconectar toda semana. Em *Em
> produção* isso para. A verificação do Google — aquela que pede vídeo e
> revisão — serve só para tirar a tela de aviso e para passar de 100 usuários.
> Você é um, e passa pelo aviso uma vez.

## 5. Criar as credenciais

1. **APIs e serviços** › **Credenciais** › **Criar credenciais** ›
   **ID do cliente OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**.
3. Nome: `MSL`.
4. Em **URIs de redirecionamento autorizados**, clique em **Adicionar URI** e
   cole **exatamente** isto:

   ```
   https://msl-delta.vercel.app/api/google-callback
   ```

   Sem barra no fim. Se não bater caractere por caractere, o Google recusa.
5. Criar. Aparece uma janela com **ID do cliente** e **Chave secreta do
   cliente**. Deixe aberta — é o que vai para o passo 6.

## 6. Guardar as duas na Vercel

1. Abra <https://vercel.com/> › o projeto **MSL** › **Settings** ›
   **Environment Variables**.
2. Crie as duas, marcando os três ambientes (Production, Preview, Development):

   | Nome | Valor |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | o ID do cliente |
   | `GOOGLE_CLIENT_SECRET` | a chave secreta |

3. **Redeploy**: aba **Deployments** › o último › **⋯** › **Redeploy**.
   Variável nova só vale depois de uma publicação nova.

## 7. Conectar

No MSL, em **Ajustes** › **Google Agenda**, clique em **Conectar**.

O Google vai mostrar uma tela dizendo que o app **não foi verificado**. É
esperado, e é o seu próprio app. Clique em **Avançado** › **Acessar My System
Life (não seguro)** e autorize.

Pronto. A partir daí:

- o que você criar no Google aparece no calendário do MSL;
- tarefa com prazo e peça com data de publicar viram evento no seu Google;
- mover no Google move aqui, e mover aqui move lá.

---

## Se der errado

| O que aparece | O que é |
| --- | --- |
| `redirect_uri_mismatch` | A URI do passo 5 não bate. Confira caractere por caractere, sem barra no fim. |
| `access_denied` | Você fechou a tela do Google sem autorizar. Tente de novo. |
| "faltam as variáveis do Google" | As variáveis do passo 6 não chegaram — falta o **Redeploy**. |
| Reconectando toda semana | O passo 4 não foi feito: o app continua em *Testing*. |

## O que o MSL guarda, e onde

A credencial de acesso ao seu Google fica **no Redis do servidor**, presa à sua
conta — nunca no banco do aplicativo, nunca no navegador, e portanto **nunca no
arquivo que você exporta**. É o mesmo tratamento que o token de sessão recebe, e
pelo mesmo motivo: restaurar um backup num aparelho emprestado não pode entregar
o acesso à sua agenda.

Desconectar, em Ajustes, apaga a credencial do servidor. Os eventos que o MSL
criou no seu Google **ficam lá** — desconectar não é apagar a sua agenda.
